import { describe, it, expect } from 'vitest';
import { classifyMessage, extractPeriod } from '../../src/classification/classifier';
import type { ClassificationRule } from '../../src/classification/classifier';

const sampleRules: ClassificationRule[] = [
  {
    reportDefinitionId: 'def-weekly',
    propertyId: 'prop-la-jolla',
    senderPattern: 'pm@lajolla\\.com',
    subjectPattern: 'Weekly Report',
    fileNamePattern: '\\.(pdf|xlsx)$',
    frequency: 'WEEKLY',
  },
  {
    reportDefinitionId: 'def-daily',
    propertyId: 'prop-friendswood',
    senderPattern: 'operations@friendswood\\.com',
    subjectPattern: 'Daily (Report|Summary)',
    fileNamePattern: '\\.(pdf|xlsx|csv)$',
    frequency: 'DAILY',
  },
];

describe('classifyMessage', () => {
  it('should classify a matching message', () => {
    const result = classifyMessage(
      'pm@lajolla.com',
      'Weekly Report - 2026-07-27',
      [{ name: 'report.pdf' }],
      sampleRules
    );
    expect(result.propertyId).toBe('prop-la-jolla');
    expect(result.reportDefinitionId).toBe('def-weekly');
    expect(result.confidence).toBeGreaterThanOrEqual(5);
  });

  it('should return nulls for no match', () => {
    const result = classifyMessage(
      'unknown@spam.com',
      'Buy cheap watches',
      [{ name: 'ad.html' }],
      sampleRules
    );
    expect(result.propertyId).toBeNull();
    expect(result.reportDefinitionId).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('should warn on low confidence', () => {
    const result = classifyMessage(
      'pm@lajolla.com',
      'Totally unrelated subject',
      [{ name: 'notes.txt' }],
      sampleRules
    );
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should pick the best match', () => {
    const result = classifyMessage(
      'operations@friendswood.com',
      'Daily Summary - 2026-07-27',
      [{ name: 'data.csv' }],
      sampleRules
    );
    expect(result.propertyId).toBe('prop-friendswood');
    expect(result.reportDefinitionId).toBe('def-daily');
  });
});

describe('extractPeriod', () => {
  it('should extract ISO date from subject', () => {
    const period = extractPeriod('Report 2026-07-27', [{ name: 'file.pdf' }]);
    expect(period).toBe('2026-07-27');
  });

  it('should extract YYYYMMDD format', () => {
    const period = extractPeriod('Report 20260727', [{ name: 'file.pdf' }]);
    expect(period).toBe('2026-07-27');
  });

  it('should return null when no date found', () => {
    const period = extractPeriod('No dates here', [{ name: 'file.pdf' }]);
    expect(period).toBeNull();
  });

  it('should extract date from filename', () => {
    const period = extractPeriod('Report', [{ name: 'data-2026-07-27.xlsx' }]);
    expect(period).toBe('2026-07-27');
  });
});
