import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';
import { childLogger } from '../logger';

const log = childLogger('search:tasks');

export function createTasksSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    try {
      const p = event.payload as Record<string, unknown>;
      switch (event.eventType) {
        case 'TaskCreated':
          log.info({ id: p.id, name: p.name }, '[4a] Sending TaskCreated to Meilisearch');
          await indexer.upsert({
            id: `task-${p.id as string}`,
            entityId: p.id as string,
            type: 'task',
            name: p.name as string,
            description: (p.description as string | undefined) ?? null,
            status: 'ready',
            categoryId: p.categoryId as string,
          });
          log.info({ id: p.id }, '[4b] Task indexed in Meilisearch');
          break;
        case 'TaskUpdated': {
          const fields: Record<string, unknown> = {};
          if (p.name !== undefined) fields.name = p.name as string;
          if (p.description !== undefined) fields.description = p.description as string | null;
          if (p.categoryId !== undefined) fields.categoryId = p.categoryId as string;
          if (Object.keys(fields).length > 0) {
            log.info({ id: p.id, fields }, '[4a] Sending TaskUpdated patch to Meilisearch');
            await indexer.patch(`task-${p.id as string}`, fields as Partial<Omit<SearchDocument, 'id'>>);
            log.info({ id: p.id }, '[4b] Task patch indexed in Meilisearch');
          }
          break;
        }
        case 'TaskStarted':
          log.info({ id: p.id }, '[4a] Sending TaskStarted status patch to Meilisearch');
          await indexer.patch(`task-${p.id as string}`, { status: 'ongoing' });
          log.info({ id: p.id }, '[4b] Task status → ongoing indexed');
          break;
        case 'TaskCompleted':
          log.info({ id: p.id }, '[4a] Sending TaskCompleted status patch to Meilisearch');
          await indexer.patch(`task-${p.id as string}`, { status: 'done' });
          log.info({ id: p.id }, '[4b] Task status → done indexed');
          break;
        default:
          break;
      }
    } catch (err) {
      log.error({ err, eventType: event.eventType }, 'search indexing failed — command not affected');
    }
  };
}
