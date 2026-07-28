import { describe, it, expect, vi } from 'vitest';
import { processInbox } from '../../src/intake/intake-orchestrator';
import { buildIntakeSearchQuery, extractMetricsFromBody } from '../../src/intake/intake-orchestrator';
import type { IntakeResult } from '../../src/intake/intake-orchestrator';

const messages = vi.hoisted(() => [] as Array<{
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string;
  body: string;
  attachments: Array<{
    name: string;
    mimeType: string;
    size: number;
    blob: {
      getBytes: () => number[];
      getName?: () => string;
    };
  }>;
}>);
const archived = vi.hoisted(() => [] as Array<{ propertyId: string; frequency: string; periodLabel: string; rootFolderId: string }>);
const archivedBodies = vi.hoisted(() => [] as Array<{ propertyId: string; frequency: string; periodLabel: string; rootFolderId: string; body: string }>);
const processedIds = vi.hoisted(() => [] as string[]);
const errorIds = vi.hoisted(() => [] as string[]);
const searchQueries = vi.hoisted(() => [] as unknown[]);

vi.mock('../../src/intake/gmail-service', () => ({
  searchMessages: (query: unknown) => {
    searchQueries.push(query);
    return messages;
  },
  markAsProcessed: (messageId: string) => processedIds.push(messageId),
  markAsError: (messageId: string) => errorIds.push(messageId),
  isAlreadyProcessed: (messageId: string, receivedSheet: { getDataRange: () => { getValues: () => unknown[][] } }) => {
    return receivedSheet.getDataRange().getValues().slice(1).some(row => String(row[1]) === messageId);
  },
}));

vi.mock('../../src/storage/drive-archiver', () => ({
  archiveAttachment: (_blob: unknown, propertyId: string, frequency: string, periodLabel: string, rootFolderId: string) => {
    archived.push({ propertyId, frequency, periodLabel, rootFolderId });
    return {
      fileId: `file-${propertyId}-${periodLabel}`,
      driveLink: `https://drive.example/${propertyId}/${periodLabel}`,
      folderPath: `${propertyId}/REPORTS/${periodLabel}`,
    };
  },
  archiveMessageBody: (body: string, _fileName: string, propertyId: string, frequency: string, periodLabel: string, rootFolderId: string) => {
    archivedBodies.push({ propertyId, frequency, periodLabel, rootFolderId, body });
    return {
      fileId: `body-${propertyId}-${periodLabel}`,
      driveLink: `https://drive.example/${propertyId}/${periodLabel}/body`,
      folderPath: `${propertyId}/REPORTS/${periodLabel}`,
    };
  },
}));

function createSheet(rows: unknown[][]) {
  return {
    rows,
    getDataRange: () => ({ getValues: () => rows }),
    appendRow: (row: unknown[]) => rows.push(row),
    getRange: (row: number, column: number) => ({
      setValue: (value: unknown) => {
        rows[row - 1][column - 1] = value;
      },
    }),
  } as unknown as GoogleAppsScript.Spreadsheet.Sheet & { rows: unknown[][] };
}

describe('IntakeResult type', () => {
  it('should have required fields', () => {
    const r: IntakeResult = { processed: 5, errors: 1, skipped: 2, details: [] };
    expect(r.processed).toBe(5);
    expect(r.errors).toBe(1);
  });
});

describe('processInbox', () => {
  const rules = [
    {
      reportDefinitionId: 'def-oasis-daily',
      propertyId: 'prop-oasis',
      senderPattern: 'pm@example\\.com',
      subjectPattern: 'Daily Report',
      fileNamePattern: '\\.xlsx$',
      frequency: 'DAILY',
    },
  ];

  it('archives a new attachment using a real content hash and writes an audit row', () => {
    messages.splice(0, messages.length, {
      id: 'gmail-1',
      threadId: 'thread-1',
      from: 'pm@example.com',
      subject: 'Daily Report 2026-07-27',
      receivedAt: '2026-07-27T13:00:00.000Z',
      body: 'Physical Occupancy: 88.2%\nLeads: 17\nCurrent Delinquency $3,570.76',
      attachments: [
        {
          name: 'oasis-2026-07-27.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 3,
          blob: { getBytes: () => [1, 2, 3] },
        },
      ],
    });
    archived.splice(0, archived.length);
    processedIds.splice(0, processedIds.length);
    errorIds.splice(0, errorIds.length);
    searchQueries.splice(0, searchQueries.length);

    const received = createSheet([
      ['id', 'messageId', 'fileHash', 'receivedAt', 'propertyId', 'reportDefinitionId', 'periodStart', 'driveLink', 'classification', 'actorEmail'],
    ]);
    const exceptions = createSheet([
      ['id', 'documentId', 'stage', 'error', 'severity', 'status', 'assignee', 'createdAt'],
    ]);
    const audit = createSheet([
      ['actor', 'action', 'entity', 'entityId', 'oldValue', 'newValue', 'timestamp'],
    ]);
    const expected = createSheet([
      ['id', 'propertyId', 'reportDefinitionId', 'periodStart', 'periodEnd', 'deadline', 'status', 'receivedReportId', 'late', 'reminderDates'],
      ['exp-oasis-2026-07-27', 'prop-oasis', 'def-oasis-daily', '2026-07-27', '2026-07-27', '2026-07-27T23:00:00.000Z', 'WAITING', '', 'false', ''],
    ]);

    const result = processInbox(
      rules,
      { received, exceptions, audit, expected },
      { rootFolderId: 'drive-root', actorEmail: 'analyst@example.com' }
    );

    expect(result).toMatchObject({ processed: 1, errors: 0, skipped: 0 });
    expect(searchQueries[0]).toEqual({ raw: 'newer_than:60d -in:trash -in:spam', unreadOnly: false });
    expect(received.rows[1][2]).toBe('039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
    expect(received.rows[1][8]).toBe('AUTOMATIC');
    expect(received.rows[1][9]).toBe('analyst@example.com');
    expect(audit.rows[1].slice(0, 6)).toEqual([
      'analyst@example.com',
      'REPORT_SYNCED',
      'ReceivedReports',
      'gmail-1_prop-oasis',
      '',
      'https://drive.example/prop-oasis/2026-07-27',
    ]);
    expect(archived).toEqual([{ propertyId: 'prop-oasis', frequency: 'DAILY', periodLabel: '2026-07-27', rootFolderId: 'drive-root' }]);
    expect(expected.rows[1][6]).toBe('RECEIVED');
    expect(expected.rows[1][7]).toBe('gmail-1_prop-oasis');
    expect(expected.rows[1][8]).toBe('false');
  });

  it('skips a globally duplicated file hash without archiving a second copy', () => {
    messages.splice(0, messages.length, {
      id: 'gmail-2',
      threadId: 'thread-2',
      from: 'pm@example.com',
      subject: 'Daily Report 2026-07-27',
      receivedAt: '2026-07-27T14:00:00.000Z',
      body: 'Physical Occupancy: 88.2%',
      attachments: [
        {
          name: 'copy.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 3,
          blob: { getBytes: () => [1, 2, 3] },
        },
      ],
    });
    archived.splice(0, archived.length);

    const received = createSheet([
      ['id', 'messageId', 'fileHash', 'receivedAt', 'propertyId', 'reportDefinitionId', 'periodStart', 'driveLink', 'classification', 'actorEmail'],
      ['recv-old', 'gmail-old', '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81', '2026-07-27T13:00:00.000Z', 'prop-oasis', 'def-oasis-daily', '2026-07-27', 'https://drive.example/old', 'AUTOMATIC', 'other@example.com'],
    ]);
    const exceptions = createSheet([
      ['id', 'documentId', 'stage', 'error', 'severity', 'status', 'assignee', 'createdAt'],
    ]);

    const result = processInbox(
      rules,
      { received, exceptions },
      { rootFolderId: 'drive-root', actorEmail: 'pm@example.com' }
    );

    expect(result).toMatchObject({ processed: 0, errors: 0, skipped: 1 });
    expect(received.rows).toHaveLength(2);
    expect(archived).toEqual([]);
  });

  it('archives body-only reports and writes parsed body KPIs', () => {
    messages.splice(0, messages.length, {
      id: 'gmail-body-1',
      threadId: 'thread-body-1',
      from: 'pm@example.com',
      subject: 'Daily Report 2026-07-28',
      receivedAt: '2026-07-28T14:00:00.000Z',
      body: [
        'Physical Occupancy: 88.2% (112)',
        'Leads: 17',
        'Shows/Tours: 2',
        'Applications Submitted: 2',
        'Leases Signed: 1',
        'Current Delinquency $3,570.76',
      ].join('\n'),
      attachments: [],
    });
    archivedBodies.splice(0, archivedBodies.length);

    const received = createSheet([
      ['id', 'messageId', 'fileHash', 'receivedAt', 'propertyId', 'reportDefinitionId', 'periodStart', 'driveLink', 'classification', 'actorEmail'],
    ]);
    const exceptions = createSheet([
      ['id', 'documentId', 'stage', 'error', 'severity', 'status', 'assignee', 'createdAt'],
    ]);
    const kpiHistory = createSheet([
      ['id', 'propertyId', 'periodStart', 'periodEnd', 'kpiCode', 'value', 'unit', 'sourceReportId', 'publishedAt'],
    ]);

    const result = processInbox(
      rules,
      { received, exceptions, kpiHistory },
      { rootFolderId: 'drive-root', actorEmail: 'pm@example.com' }
    );

    expect(result).toMatchObject({ processed: 1, errors: 0, skipped: 0 });
    expect(archivedBodies).toEqual([
      {
        propertyId: 'prop-oasis',
        frequency: 'DAILY',
        periodLabel: '2026-07-28',
        rootFolderId: 'drive-root',
        body: messages[0].body,
      },
    ]);
    expect(received.rows[1][7]).toBe('https://drive.example/prop-oasis/2026-07-28/body');
    expect(kpiHistory.rows.slice(1).map(row => [row[4], row[5], row[6]])).toEqual([
      ['OCCUPANCY', 88.2, '%'],
      ['LEADS', 17, 'count'],
      ['TOURS', 2, 'count'],
      ['APPLICATIONS', 2, 'count'],
      ['LEASES_SIGNED', 1, 'count'],
      ['DELINQUENCY', 3570.76, 'USD'],
    ]);
  });

  it('skips a duplicated property definition period and file hash from another user', () => {
    messages.splice(0, messages.length, {
      id: 'gmail-duplicate-user',
      threadId: 'thread-duplicate-user',
      from: 'pm@example.com',
      subject: 'Daily Report 2026-07-27',
      receivedAt: '2026-07-27T15:00:00.000Z',
      body: 'Physical Occupancy: 88.2%',
      attachments: [
        {
          name: 'oasis-2026-07-27-forwarded.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 3,
          blob: { getBytes: () => [1, 2, 3] },
        },
      ],
    });
    archived.splice(0, archived.length);

    const received = createSheet([
      ['id', 'messageId', 'fileHash', 'receivedAt', 'propertyId', 'reportDefinitionId', 'periodStart', 'driveLink', 'classification', 'actorEmail'],
      ['recv-old', 'gmail-old', '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81', '2026-07-27T13:00:00.000Z', 'prop-oasis', 'def-oasis-daily', '2026-07-27', 'https://drive.example/old', 'AUTOMATIC', 'analyst@example.com'],
    ]);
    const exceptions = createSheet([
      ['id', 'documentId', 'stage', 'error', 'severity', 'status', 'assignee', 'createdAt'],
    ]);

    const result = processInbox(
      rules,
      { received, exceptions },
      { rootFolderId: 'drive-root', actorEmail: 'pm@example.com' }
    );

    expect(result).toMatchObject({ processed: 0, errors: 0, skipped: 1 });
    expect(received.rows).toHaveLength(2);
    expect(archived).toEqual([]);
  });
});

describe('extractMetricsFromBody', () => {
  it('extracts operating and financial metrics from real report body wording', () => {
    expect(extractMetricsFromBody([
      'Actual Rent Charges: $78,252.00',
      'Current Collections: $74,722.24',
      'Collection rate: 95.48%',
      'Physical Occupancy: 33% (29 units)',
      'Leads: 3-Zumper',
      'Total Income Collected $43,042.42',
      'Current Delinquency $21,826.74',
    ].join('\n'))).toEqual([
      { code: 'SCHEDULED_RENT', value: 78252, unit: 'USD' },
      { code: 'REVENUE', value: 74722.24, unit: 'USD' },
      { code: 'COLLECTION_RATE', value: 95.48, unit: '%' },
      { code: 'OCCUPANCY', value: 33, unit: '%' },
      { code: 'LEADS', value: 3, unit: 'count' },
      { code: 'REVENUE', value: 43042.42, unit: 'USD' },
      { code: 'DELINQUENCY', value: 21826.74, unit: 'USD' },
    ]);
  });
});

describe('buildIntakeSearchQuery', () => {
  it('uses a recent all-mail window so read report threads can be backfilled', () => {
    expect(buildIntakeSearchQuery()).toEqual({
      raw: 'newer_than:60d -in:trash -in:spam',
      unreadOnly: false,
    });
  });
});
