import { describe, it, expect } from 'vitest';
import { buildDrivePath } from '../../src/storage/drive-archiver';

describe('buildDrivePath', () => {
  it('should build hierarchical path', () => {
    const path = buildDrivePath('LAJ', 'WEEKLY', '2026', '2026-W30');
    expect(path).toBe('LAJ/WEEKLY/2026/2026-W30');
  });
});
