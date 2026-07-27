export interface GmailMessageInfo {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string;
  attachments: GmailAttachmentInfo[];
}

export interface GmailAttachmentInfo {
  name: string;
  mimeType: string;
  size: number;
  blob: GoogleAppsScript.Base.Blob;
}

export interface GmailSearchQuery {
  from?: string;
  subject?: string;
  after?: string;
  before?: string;
  label?: string;
}

export function searchMessages(query: GmailSearchQuery): GmailMessageInfo[] {
  const parts: string[] = [];

  if (query.from) parts.push(`from:${query.from}`);
  if (query.subject) parts.push(`subject:${query.subject}`);
  if (query.after) parts.push(`after:${query.after}`);
  if (query.before) parts.push(`before:${query.before}`);
  if (query.label) parts.push(`label:${query.label}`);
  parts.push('is:unread');

  const searchQuery = parts.join(' ');
  const threads = GmailApp.search(searchQuery, 0, 50);
  const messages: GmailMessageInfo[] = [];

  for (const thread of threads) {
    const msg = thread.getMessages()[0];
    const attachments: GmailAttachmentInfo[] = (msg.getAttachments() || []).map(a => ({
      name: a.getName(),
      mimeType: a.getContentType(),
      size: a.getBytes().length,
      blob: a.copyBlob(),
    }));

    messages.push({
      id: msg.getId(),
      threadId: thread.getId(),
      from: msg.getFrom(),
      subject: msg.getSubject(),
      receivedAt: msg.getDate().toISOString(),
      attachments,
    });
  }

  return messages;
}

export function markAsProcessed(messageId: string, labelName: string = 'Valoris/Processed'): void {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }

  const message = GmailApp.getMessageById(messageId);
  if (message) {
    message.getThread().addLabel(label);
    message.getThread().markRead();
  }
}

export function markAsError(messageId: string, labelName: string = 'Valoris/Error'): void {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }

  const message = GmailApp.getMessageById(messageId);
  if (message) {
    message.getThread().addLabel(label);
  }
}

export function isAlreadyProcessed(
  messageId: string,
  receivedSheet: GoogleAppsScript.Spreadsheet.Sheet
): boolean {
  const data = receivedSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === messageId) {
      return true;
    }
  }
  return false;
}
