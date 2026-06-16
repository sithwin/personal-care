import { describe, it, expect } from 'vitest';
import { Item } from './Item';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'item-1',
    aggregateType: 'item',
    eventType: 'ItemCreated',
    payload: { id: 'item-1', name: 'Shampoo', categoryId: 'cat-1', status: 'to_buy' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('Item', () => {
  it('reconstruct returns null for empty history', () => {
    expect(Item.reconstruct([])).toBeNull();
  });

  it('create emits ItemCreated with status to_buy', () => {
    const cmd = { type: 'CreateItemCommand' as const, payload: { id: 'item-1', name: 'Shampoo', categoryId: 'cat-1' } };
    const event = Item.create(cmd);
    expect(event.eventType).toBe('ItemCreated');
    expect(event.payload.status).toBe('to_buy');
  });

  it('markAvailable emits ItemMarkedAvailable', () => {
    const aggregate = Item.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.markAvailable({ type: 'MarkItemAvailableCommand' as const, payload: { id: 'item-1' } });
    expect(event.eventType).toBe('ItemMarkedAvailable');
  });

  it('markConsumed requires item to be available', () => {
    const aggregate = Item.reconstruct([makeCreatedEvent()])!;
    expect(() => aggregate.markConsumed({ type: 'MarkItemConsumedCommand' as const, payload: { id: 'item-1' } }))
      .toThrow('Item must be available to consume');
  });

  it('markConsumed emits ItemMarkedConsumed when available', () => {
    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'ItemMarkedAvailable', version: 2 }),
    ];
    const aggregate = Item.reconstruct(history)!;
    const event = aggregate.markConsumed({ type: 'MarkItemConsumedCommand' as const, payload: { id: 'item-1' } });
    expect(event.eventType).toBe('ItemMarkedConsumed');
  });

  it('markAvailableAgain emits ItemMarkedAvailableAgain', () => {
    const aggregate = Item.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.markAvailableAgain({ type: 'MarkItemAvailableAgainCommand' as const, payload: { id: 'item-1' } });
    expect(event.eventType).toBe('ItemMarkedAvailableAgain');
  });
});
