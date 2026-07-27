import { searchMessages, markAsProcessed, markAsError, isAlreadyProcessed } from './gmail-service';
import { classifyMessage, ClassificationRule } from '../classification/classifier';
import { archiveAttachment } from '../storage/drive-archiver';
import { logException } from './exception-handler';
import { createAuditLogEntry, writeAuditLog } from '../audit/audit-log';

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
    audit?: GoogleAppsScript.Spreadsheet.Sheet;
  },
  driveConfig: {
    rootFolderId: string;
    actorEmail?: string;
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

    const attachmentHashes = msg.attachments.map(att => hashBlob(att.blob));
    if (attachmentHashes.every(hash => isFileHashAlreadyArchived(hash, sheets.received))) {
      result.skipped++;
      markAsProcessed(msg.id);
      result.details.push(`Skipped duplicate file hash: ${msg.id}`);
      continue;
    }

    // Archive each attachment
    const archiveLinks: string[] = [];
    for (let i = 0; i < msg.attachments.length; i++) {
      const att = msg.attachments[i];
      if (isFileHashAlreadyArchived(attachmentHashes[i], sheets.received)) {
        result.skipped++;
        result.details.push(`Skipped duplicate attachment: ${att.name}`);
        continue;
      }

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
      attachmentHashes.join(', '),
      msg.receivedAt,
      classification.propertyId,
      classification.reportDefinitionId,
      classification.periodStart || '',
      archiveLinks.join(', '),
      'AUTOMATIC',
    ]);

    if (sheets.audit) {
      writeAuditLog(sheets.audit, createAuditLogEntry({
        actor: driveConfig.actorEmail || 'system',
        action: 'REPORT_SYNCED',
        entity: 'ReceivedReports',
        entityId: `${msg.id}_${classification.propertyId}`,
        oldValue: '',
        newValue: archiveLinks.join(', '),
      }));
    }

    markAsProcessed(msg.id);
    result.processed++;
    result.details.push(`Processed: ${msg.id} -> ${classification.propertyId}/${classification.reportDefinitionId}`);
  }

  return result;
}

export function isFileHashAlreadyArchived(
  fileHash: string,
  receivedSheet: GoogleAppsScript.Spreadsheet.Sheet
): boolean {
  const data = receivedSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const hashes = String(data[i][2] || '').split(',').map(hash => hash.trim());
    if (hashes.includes(fileHash)) return true;
  }
  return false;
}

export function hashBlob(blob: GoogleAppsScript.Base.Blob): string {
  return sha256Hex(blob.getBytes().map(byte => (byte + 256) % 256));
}

function sha256Hex(bytes: number[]): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const bitLength = bytes.length * 8;
  const padded = bytes.slice();
  padded.push(0x80);
  while ((padded.length % 64) !== 56) padded.push(0);
  for (let i = 7; i >= 0; i--) padded.push(Math.floor(bitLength / (2 ** (i * 8))) & 0xff);

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const w = new Array<number>(64).fill(0);
    for (let i = 0; i < 16; i++) {
      w[i] = (
        (padded[chunk + i * 4] << 24) |
        (padded[chunk + i * 4 + 1] << 16) |
        (padded[chunk + i * 4 + 2] << 8) |
        padded[chunk + i * 4 + 3]
      ) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  return h.map(value => value.toString(16).padStart(8, '0')).join('');
}
