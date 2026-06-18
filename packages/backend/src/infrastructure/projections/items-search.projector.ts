import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

export function createItemsSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ItemCreated':
        await indexer.upsert({
          id: `item-${p.id as string}`,
          entityId: p.id as string,
          type: 'item',
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          status: 'to_buy',
          categoryId: p.categoryId as string,
        });
        break;
      case 'ItemMarkedAvailable':
      case 'ItemMarkedAvailableAgain':
        await indexer.patch(`item-${p.id as string}`, { status: 'available' });
        break;
      case 'ItemMarkedConsumed':
        await indexer.patch(`item-${p.id as string}`, { status: 'consumed' });
        break;
      default:
        break;
    }
  };
}
