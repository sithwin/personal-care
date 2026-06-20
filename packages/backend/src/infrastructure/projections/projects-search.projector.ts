import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import { childLogger } from '../logger';

const log = childLogger('search:projects');

export function createProjectsSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    try {
      const p = event.payload as Record<string, unknown>;
      switch (event.eventType) {
        case 'ProjectCreated':
          log.info({ id: event.aggregateId, name: p.name }, '[4a] Sending ProjectCreated to Meilisearch');
          await indexer.upsert({
            id: `project-${event.aggregateId}`,
            entityId: event.aggregateId,
            type: 'project',
            name: p.name as string,
            description: (p.description as string | undefined) ?? null,
            status: 'draft',
            categoryId: p.categoryId as string,
          });
          log.info({ id: event.aggregateId }, '[4b] Project indexed in Meilisearch');
          break;
        case 'ProjectUpdated':
          log.info({ id: event.aggregateId }, '[4a] Sending ProjectUpdated patch to Meilisearch');
          await indexer.patch(`project-${event.aggregateId}`, {
            name: (p.name as string | undefined) ?? undefined,
            description: (p.description as string | undefined) ?? undefined,
          });
          log.info({ id: event.aggregateId }, '[4b] Project patch indexed in Meilisearch');
          break;
        case 'ProjectStarted':
        case 'ProjectResumed':
          log.info({ id: event.aggregateId }, '[4a] Sending project status → active to Meilisearch');
          await indexer.patch(`project-${event.aggregateId}`, { status: 'active' });
          log.info({ id: event.aggregateId }, '[4b] Project status → active indexed');
          break;
        case 'ProjectPaused':
          log.info({ id: event.aggregateId }, '[4a] Sending project status → on_hold to Meilisearch');
          await indexer.patch(`project-${event.aggregateId}`, { status: 'on_hold' });
          log.info({ id: event.aggregateId }, '[4b] Project status → on_hold indexed');
          break;
        case 'ProjectCompleted':
          log.info({ id: event.aggregateId }, '[4a] Sending project status → done to Meilisearch');
          await indexer.patch(`project-${event.aggregateId}`, { status: 'done' });
          log.info({ id: event.aggregateId }, '[4b] Project status → done indexed');
          break;
        case 'ProjectPlanned':
          log.info({ id: event.aggregateId }, '[4a] Sending project status → planned to Meilisearch');
          await indexer.patch(`project-${event.aggregateId}`, { status: 'planned' });
          log.info({ id: event.aggregateId }, '[4b] Project status → planned indexed');
          break;
        default:
          break;
      }
    } catch (err) {
      log.error({ err, eventType: event.eventType }, 'search indexing failed — command not affected');
    }
  };
}
