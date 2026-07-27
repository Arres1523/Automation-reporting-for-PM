import { describe, it, expect } from 'vitest';
import { SheetRepository } from '../../src/repositories/base-repository';

interface TestEntity {
  id: string;
  name: string;
  value: number;
}

describe('SheetRepository', () => {
  it('should be constructable with headers and idColumn', () => {
    const repo = new SheetRepository<TestEntity>(['id', 'name', 'value'], 'id');
    expect(repo).toBeInstanceOf(SheetRepository);
  });

  it('should map a row to an entity', () => {
    const repo = new SheetRepository<TestEntity>(['id', 'name', 'value'], 'id');
    const entity = (repo as any).rowToEntity(['abc', 'test', 42]);
    expect(entity).toEqual({ id: 'abc', name: 'test', value: 42 });
  });
});
