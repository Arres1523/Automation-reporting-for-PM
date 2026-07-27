import { describe, it, expect } from 'vitest';
import type { GmailMessageInfo, GmailAttachmentInfo, GmailSearchQuery } from '../../src/intake/gmail-service';

describe('GmailMessageInfo type', () => {
  it('should have required fields', () => {
    const msg: GmailMessageInfo = {
      id: 'msg1',
      threadId: 'thread1',
      from: 'sender@valoris.com',
      subject: 'Report',
      receivedAt: '2026-07-27T12:00:00Z',
      attachments: [],
    };
    expect(msg.id).toBe('msg1');
    expect(msg.attachments).toEqual([]);
  });
});

describe('GmailAttachmentInfo type', () => {
  it('should describe an attachment', () => {
    const att: GmailAttachmentInfo = {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      blob: {} as GoogleAppsScript.Base.Blob,
    };
    expect(att.name).toBe('report.pdf');
  });
});

describe('GmailSearchQuery type', () => {
  it('should accept partial queries', () => {
    const q: GmailSearchQuery = { from: 'a@b.com' };
    expect(q.from).toBe('a@b.com');
  });
});
