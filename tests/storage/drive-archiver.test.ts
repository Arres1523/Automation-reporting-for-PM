import { describe, it, expect } from 'vitest';
import { buildArchiveFolderPath, buildDrivePath } from '../../src/storage/drive-archiver';

describe('buildDrivePath', () => {
  it('should build hierarchical path', () => {
    const path = buildDrivePath('LAJ', 'WEEKLY', '2026', '2026-W30');
    expect(path).toBe('LAJ/WEEKLY/2026/2026-W30');
  });
});

describe('buildArchiveFolderPath', () => {
  it('uses the year from ISO period labels', () => {
    expect(buildArchiveFolderPath('prop-oasis', 'REPORTS', '2026-07-28')).toBe('prop-oasis/REPORTS/2026/2026-07-28');
  });

  it('keeps unknown periods grouped outside yearly folders', () => {
    expect(buildArchiveFolderPath('prop-oasis', 'REPORTS', 'unknown')).toBe('prop-oasis/REPORTS/unknown/unknown');
  });
});
