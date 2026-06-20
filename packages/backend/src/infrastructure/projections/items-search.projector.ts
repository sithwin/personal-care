import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import { childLogger } from '../logger';

const log = childLogger('search:items');

export function createItemsSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    try {
      const p = event.payload as Record<string, unknown>;
      switch (event.eventType) {
        case 'ItemCreated':
          log.info({ id: event.aggregateId, name: p.name }, '[4a] Sending ItemCreated to Meilisearch');
          await indexer.upsert({
            id: `item-${event.aggregateId}`,
            entityId: event.aggregateId,
            type: 'item',
            name: p.name as string,
            description: (p.description as string | undefined) ?? null,
            status: 'to_buy',
            categoryId: p.categoryId as string,
          });
          log.info({ id: event.aggregateId }, '[4b] Item indexed in Meilisearch');
          break;
        case 'ItemMarkedAvailable':
        case 'ItemMarkedAvailableAgain':
          log.info({ id: event.aggregateId }, '[4a] Sending item status → available to Meilisearch');
          await indexer.patch(`item-${event.aggregateId}`, { status: 'available' });
          log.info({ id: event.aggregateId }, '[4b] Item status → available indexed');
          break;
        case 'ItemMarkedConsumed':
          log.info({ id: event.aggregateId }, '[4a] Sending item status → consumed to Meilisearch');
          await indexer.patch(`item-${event.aggregateId}`, { status: 'consumed' });
          log.info({ id: event.aggregateId }, '[4b] Item status → consumed indexed');
          break;
        default:
          break;
      }
    } catch (err) {
      log.error({ err, eventType: event.eventType }, 'search indexing failed — command not affected');
    }
  };
}
