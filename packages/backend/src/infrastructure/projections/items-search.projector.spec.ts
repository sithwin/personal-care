import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createItemsSearchProjector } from './items-search.projector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import type { StoredEvent } from '../../types';

const ITEM_ID = '00000000-0000-0000-0000-000000000001';
const CAT_ID  = '00000000-0000-0000-0000-000000000002';

function makeEvent(eventType: string, payload: Record<string, unknown>): StoredEvent {
  return { id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType, payload, version: 1, createdAt: new Date() };
}

describe('items-search projector', () => {
  let indexer: ISearchIndexer;
  let projector: ReturnType<typeof createItemsSearchProjector>;

  beforeEach(() => {
    indexer = { ensureIndex: vi.fn(), upsert: vi.fn(), patch: vi.fn(), delete: vi.fn(), bootstrap: vi.fn(), getDocumentCount: vi.fn() };
    projector = createItemsSearchProjector(indexer);
  });

  it('ItemCreated upserts an item document', async () => {
    await projector(makeEvent('ItemCreated', { id: ITEM_ID, name: 'Solar lamp', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `item-${ITEM_ID}`,
      entityId: ITEM_ID,
      type: 'item',
      name: 'Solar lamp',
      description: null,
      status: 'to_buy',
      categoryId: CAT_ID,
    });
  });

  it('ItemMarkedAvailable patches status to available', async () => {
    await projector(makeEvent('ItemMarkedAvailable', { id: ITEM_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`item-${ITEM_ID}`, { status: 'available' });
  });

  it('ItemMarkedAvailableAgain patches status to available', async () => {
    await projector(makeEvent('ItemMarkedAvailableAgain', { id: ITEM_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`item-${ITEM_ID}`, { status: 'available' });
  });

  it('ItemMarkedConsumed patches status to consumed', async () => {
    await projector(makeEvent('ItemMarkedConsumed', { id: ITEM_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`item-${ITEM_ID}`, { status: 'consumed' });
  });
});
