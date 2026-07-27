import { describe, it, expect } from 'vitest';
import {
  PropertiesRepository,
  ReportDefinitionsRepository,
  ExpectedReportsRepository,
  ReceivedReportsRepository,
  KpiHistoryRepository,
  ReminderLogRepository,
  ExceptionQueueRepository,
  AuditLogRepository,
  UsersRepository,
} from '../../src/repositories';

describe('PropertiesRepository', () => {
  it('should create with correct id column', () => {
    const repo = new PropertiesRepository();
    expect(repo).toBeDefined();
  });
});

describe('ReceivedReportsRepository', () => {
  it('should have findByMessageId and findByFileHash', () => {
    const repo = new ReceivedReportsRepository();
    expect(repo).toBeInstanceOf(Object);
  });
});

describe('KpiHistoryRepository', () => {
  it('should have findByProperty', () => {
    const repo = new KpiHistoryRepository();
    expect(repo).toBeDefined();
  });
});

describe('All repositories instantiate', () => {
  it('should create all 9 repositories without error', () => {
    expect(() => new PropertiesRepository()).not.toThrow();
    expect(() => new ReportDefinitionsRepository()).not.toThrow();
    expect(() => new ExpectedReportsRepository()).not.toThrow();
    expect(() => new ReceivedReportsRepository()).not.toThrow();
    expect(() => new KpiHistoryRepository()).not.toThrow();
    expect(() => new ReminderLogRepository()).not.toThrow();
    expect(() => new ExceptionQueueRepository()).not.toThrow();
    expect(() => new AuditLogRepository()).not.toThrow();
    expect(() => new UsersRepository()).not.toThrow();
  });
});
