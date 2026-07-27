export interface ArchiveResult {
  fileId: string;
  driveLink: string;
  folderPath: string;
}

export function buildDrivePath(
  propertyCode: string,
  frequency: string,
  year: string,
  periodLabel: string
): string {
  return [propertyCode, frequency, year, periodLabel].join('/');
}

export function ensureFolderPath(path: string, rootFolderId: string): GoogleAppsScript.Drive.Folder {
  const parts = path.split('/');
  let parent = DriveApp.getFolderById(rootFolderId);

  for (const part of parts) {
    const folders = parent.getFoldersByName(part);
    if (folders.hasNext()) {
      parent = folders.next();
    } else {
      parent = parent.createFolder(part);
    }
  }

  return parent;
}

export function archiveAttachment(
  blob: GoogleAppsScript.Base.Blob,
  propertyCode: string,
  frequency: string,
  periodLabel: string,
  rootFolderId: string
): ArchiveResult {
  const folderPath = buildDrivePath(propertyCode, frequency, periodLabel, periodLabel);
  const folder = ensureFolderPath(buildDrivePath(propertyCode, frequency, periodLabel, periodLabel), rootFolderId);

  const file = folder.createFile(blob);
  return {
    fileId: file.getId(),
    driveLink: file.getUrl(),
    folderPath,
  };
}

export function archiveEmail(
  messageId: string,
  propertyCode: string,
  frequency: string,
  periodLabel: string,
  rootFolderId: string
): ArchiveResult {
  const folderPath = buildDrivePath(propertyCode, frequency, periodLabel, periodLabel);
  const folder = ensureFolderPath(buildDrivePath(propertyCode, frequency, periodLabel, periodLabel), rootFolderId);

  const message = GmailApp.getMessageById(messageId);
  const blob = message.getRawContent();
  const file = folder.createFile(`email-${messageId}.eml`, blob, 'message/rfc822');

  return {
    fileId: file.getId(),
    driveLink: file.getUrl(),
    folderPath,
  };
}
