import { describe, it, expect } from 'vitest';
import { handleCategoryCommand } from './aggregate';

describe('Category aggregate', () => {
  it('CreateCategory emits CategoryCreated', () => {
    const events = handleCategoryCommand(
      { type: 'CreateCategory', payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false } },
      []
    );
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryCreated');
    expect(events[0].payload.name).toBe('Home');
  });

  it('UpdateCategory emits CategoryUpdated', () => {
    const existing = [{ eventType: 'CategoryCreated', payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false } }];
    const events = handleCategoryCommand(
      { type: 'UpdateCategory', payload: { id: 'cat-1', name: 'House', icon: '🏡', color: '#22c55e' } },
      existing
    );
    expect(events[0].eventType).toBe('CategoryUpdated');
  });

  it('DeleteCategory rejects built-in categories', () => {
    const existing = [{ eventType: 'CategoryCreated', payload: { id: 'cat-1', name: 'Health', icon: '💪', color: '#ef4444', isDefault: true } }];
    expect(() =>
      handleCategoryCommand({ type: 'DeleteCategory', payload: { id: 'cat-1' } }, existing)
    ).toThrow('Cannot delete built-in category');
  });
});
