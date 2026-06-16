import { describe, it, expect } from 'vitest';
import { Category } from './Category';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'cat-1',
    aggregateType: 'category',
    eventType: 'CategoryCreated',
    payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('Category', () => {
  describe('reconstruct', () => {
    it('returns null for empty history', () => {
      expect(Category.reconstruct([])).toBeNull();
    });

    it('builds state from CategoryCreated', () => {
      expect(Category.reconstruct([makeCreatedEvent()])).not.toBeNull();
    });
  });

  describe('create', () => {
    it('emits CategoryCreated', () => {
      const cmd = {
        type: 'CreateCategoryCommand' as const,
        payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false },
      };
      const event = Category.create(cmd);
      expect(event.eventType).toBe('CategoryCreated');
      expect(event.aggregateId).toBe('cat-1');
    });
  });

  describe('update', () => {
    it('emits CategoryUpdated', () => {
      const aggregate = Category.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.update({ type: 'UpdateCategoryCommand' as const, payload: { id: 'cat-1', name: 'Garden' } });
      expect(event.eventType).toBe('CategoryUpdated');
    });

    it('throws when deleted', () => {
      const history = [
        makeCreatedEvent(),
        makeCreatedEvent({ eventType: 'CategoryDeleted', version: 2 }),
      ];
      const aggregate = Category.reconstruct(history)!;
      expect(() => aggregate.update({ type: 'UpdateCategoryCommand' as const, payload: { id: 'cat-1' } }))
        .toThrow('Category not found');
    });
  });

  describe('delete', () => {
    it('emits CategoryDeleted', () => {
      const aggregate = Category.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.delete({ type: 'DeleteCategoryCommand' as const, payload: { id: 'cat-1' } });
      expect(event.eventType).toBe('CategoryDeleted');
    });

    it('throws when deleting built-in category', () => {
      const event = makeCreatedEvent({
        payload: { id: 'cat-1', name: 'Health', icon: '💪', color: '#ef4444', isDefault: true },
      });
      const aggregate = Category.reconstruct([event])!;
      expect(() => aggregate.delete({ type: 'DeleteCategoryCommand' as const, payload: { id: 'cat-1' } }))
        .toThrow('Cannot delete built-in category');
    });

    it('throws when already deleted', () => {
      const history = [
        makeCreatedEvent(),
        makeCreatedEvent({ eventType: 'CategoryDeleted', version: 2 }),
      ];
      const aggregate = Category.reconstruct(history)!;
      expect(() => aggregate.delete({ type: 'DeleteCategoryCommand' as const, payload: { id: 'cat-1' } }))
        .toThrow('Category not found');
    });
  });
});
