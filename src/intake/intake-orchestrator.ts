import { searchMessages, markAsProcessed, markAsError, isAlreadyProcessed } from './gmail-service';
import { classifyMessage, ClassificationRule } from '../classification/classifier';
import { archiveAttachment } from '../storage/drive-archiver';
import { logException } from './exception-handler';

export interface IntakeResult {
  processed: number;
  errors: number;
  skipped: number;
  details: string[];
}

export function processInbox(
  rules: ClassificationRule[],
  sheets: {
    received: GoogleAppsScript.Spreadsheet.Sheet;
    exceptions: GoogleAppsScript.Spreadsheet.Sheet;
  },
  driveConfig: {
    rootFolderId: string;
  }
): IntakeResult {
  const result: IntakeResult = { processed: 0, errors: 0, skipped: 0, details: [] };

  const messages = searchMessages({});

  for (const msg of messages) {
    // Check for duplicate
    if (isAlreadyProcessed(msg.id, sheets.received)) {
      result.skipped++;
      markAsProcessed(msg.id);
      result.details.push(`Skipped duplicate: ${msg.id}`);
      continue;
    }

    // Classify
    const classification = classifyMessage(msg.from, msg.subject, msg.attachments, rules);

    if (!classification.propertyId || !classification.reportDefinitionId) {
      logException(sheets.exceptions, {
        documentId: msg.id,
        stage: 'classification',
        error: `Unable to classify message from ${msg.from}: ${msg.subject}`,
        severity: 'ERROR',
        assignee: 'admin',
      });
      markAsError(msg.id);
      result.errors++;
      result.details.push(`Classification failed: ${msg.id}`);
      continue;
    }

    if (msg.attachments.length === 0) {
      logException(sheets.exceptions, {
        documentId: msg.id,
        stage: 'attachments',
        error: `No attachments found in message from ${msg.from}`,
        severity: 'ERROR',
        assignee: 'admin',
      });
      markAsError(msg.id);
      result.errors++;
      result.details.push(`No attachments: ${msg.id}`);
      continue;
    }

    // Archive each attachment
    const archiveLinks: string[] = [];
    for (const att of msg.attachments) {
      try {
        const archiveResult = archiveAttachment(
          att.blob,
          classification.propertyId!,
          'REPORTS',
          classification.periodStart || 'unknown',
          driveConfig.rootFolderId
        );
        archiveLinks.push(archiveResult.driveLink);
      } catch (e) {
        logException(sheets.exceptions, {
          documentId: msg.id,
          stage: 'archive',
          error: `Failed to archive attachment ${att.name}: ${e}`,
          severity: 'ERROR',
          assignee: 'admin',
        });
      }
    }

    // Create received report record
    sheets.received.appendRow([
      `${msg.id}_${classification.propertyId}`,
      msg.id,
      msg.attachments.map(a => a.name).join(', '),
      msg.receivedAt,
      classification.propertyId,
      classification.reportDefinitionId,
      classification.periodStart || '',
      archiveLinks.join(', '),
      'AUTOMATIC',
    ]);

    markAsProcessed(msg.id);
    result.processed++;
    result.details.push(`Processed: ${msg.id} -> ${classification.propertyId}/${classification.reportDefinitionId}`);
  }

  return result;
}
