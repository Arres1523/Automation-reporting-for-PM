import { describe, it, expect, vi } from 'vitest';
import { processInbox } from '../../src/intake/intake-orchestrator';
import type { IntakeResult } from '../../src/intake/intake-orchestrator';

const messages = vi.hoisted(() => [] as Array<{
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string;
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
const archived = vi.hoisted(() => [] as Array<{ propertyId: string; periodLabel: string }>);
const processedIds = vi.hoisted(() => [] as string[]);
const errorIds = vi.hoisted(() => [] as string[]);

vi.mock('../../src/intake/gmail-service', () => ({
  searchMessages: () => messages,
  markAsProcessed: (messageId: string) => processedIds.push(messageId),
  markAsError: (messageId: string) => errorIds.push(messageId),
  isAlreadyProcessed: (messageId: string, receivedSheet: { getDataRange: () => { getValues: () => unknown[][] } }) => {
    return receivedSheet.getDataRange().getValues().slice(1).some(row => String(row[1]) === messageId);
  },
}));

vi.mock('../../src/storage/drive-archiver', () => ({
  archiveAttachment: (_blob: unknown, propertyId: string, _frequency: string, periodLabel: string) => {
    archived.push({ propertyId, periodLabel });
    return {
      fileId: `file-${propertyId}-${periodLabel}`,
      driveLink: `https://drive.example/${propertyId}/${periodLabel}`,
      folderPath: `${propertyId}/REPORTS/${periodLabel}`,
    };
  },
}));

function createSheet(rows: unknown[][]) {
  return {
    rows,
    getDataRange: () => ({ getValues: () => rows }),
    appendRow: (row: unknown[]) => rows.push(row),
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

    const received = createSheet([
      ['id', 'messageId', 'fileHash', 'receivedAt', 'propertyId', 'reportDefinitionId', 'periodStart', 'driveLink', 'classification'],
    ]);
    const exceptions = createSheet([
      ['id', 'documentId', 'stage', 'error', 'severity', 'status', 'assignee', 'createdAt'],
    ]);
    const audit = createSheet([
      ['actor', 'action', 'entity', 'entityId', 'oldValue', 'newValue', 'timestamp'],
    ]);

    const result = processInbox(
      rules,
      { received, exceptions, audit },
      { rootFolderId: 'drive-root', actorEmail: 'analyst@example.com' }
    );

    expect(result).toMatchObject({ processed: 1, errors: 0, skipped: 0 });
    expect(received.rows[1][2]).toBe('039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
    expect(received.rows[1][8]).toBe('AUTOMATIC');
    expect(audit.rows[1].slice(0, 6)).toEqual([
      'analyst@example.com',
      'REPORT_SYNCED',
      'ReceivedReports',
      'gmail-1_prop-oasis',
      '',
      'https://drive.example/prop-oasis/2026-07-27',
    ]);
    expect(archived).toEqual([{ propertyId: 'prop-oasis', periodLabel: '2026-07-27' }]);
  });

  it('skips a globally duplicated file hash without archiving a second copy', () => {
    messages.splice(0, messages.length, {
      id: 'gmail-2',
      threadId: 'thread-2',
      from: 'pm@example.com',
      subject: 'Daily Report 2026-07-27',
      receivedAt: '2026-07-27T14:00:00.000Z',
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
      ['id', 'messageId', 'fileHash', 'receivedAt', 'propertyId', 'reportDefinitionId', 'periodStart', 'driveLink', 'classification'],
      ['recv-old', 'gmail-old', '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81', '2026-07-27T13:00:00.000Z', 'prop-oasis', 'def-oasis-daily', '2026-07-27', 'https://drive.example/old', 'AUTOMATIC'],
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
