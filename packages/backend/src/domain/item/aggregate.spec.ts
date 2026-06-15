import { describe, it, expect } from 'vitest';
import { handleItemCommand } from './aggregate';

const created = [{ eventType: 'ItemCreated', payload: { id: 'item-1', name: 'Solar light', categoryId: 'cat-1', status: 'to_buy' } }];

describe('Item aggregate', () => {
  it('CreateItem emits ItemCreated with status to_buy', () => {
    const events = handleItemCommand(
      { type: 'CreateItem', payload: { id: 'item-1', name: 'Solar light', categoryId: 'cat-1' } },
      []
    );
    expect(events[0].eventType).toBe('ItemCreated');
    expect(events[0].payload.status).toBe('to_buy');
  });

  it('MarkItemAvailable emits ItemMarkedAvailable', () => {
    const events = handleItemCommand({ type: 'MarkItemAvailable', payload: { id: 'item-1' } }, created);
    expect(events[0].eventType).toBe('ItemMarkedAvailable');
  });

  it('MarkItemConsumed emits ItemMarkedConsumed', () => {
    const available = [...created, { eventType: 'ItemMarkedAvailable', payload: { id: 'item-1' } }];
    const events = handleItemCommand({ type: 'MarkItemConsumed', payload: { id: 'item-1' } }, available);
    expect(events[0].eventType).toBe('ItemMarkedConsumed');
  });

  it('MarkItemAvailableAgain from consumed emits ItemMarkedAvailableAgain', () => {
    const consumed = [...created,
      { eventType: 'ItemMarkedAvailable', payload: { id: 'item-1' } },
      { eventType: 'ItemMarkedConsumed', payload: { id: 'item-1' } }
    ];
    const events = handleItemCommand({ type: 'MarkItemAvailableAgain', payload: { id: 'item-1' } }, consumed);
    expect(events[0].eventType).toBe('ItemMarkedAvailableAgain');
  });
});
