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
          log.info({ id: p.id, name: p.name }, '[4a] Sending ProjectCreated to Meilisearch');
          await indexer.upsert({
            id: `project-${p.id as string}`,
            entityId: p.id as string,
            type: 'project',
            name: p.name as string,
            description: (p.description as string | undefined) ?? null,
            status: 'draft',
            categoryId: p.categoryId as string,
          });
          log.info({ id: p.id }, '[4b] Project indexed in Meilisearch');
          break;
        case 'ProjectUpdated':
          log.info({ id: p.id }, '[4a] Sending ProjectUpdated patch to Meilisearch');
          await indexer.patch(`project-${p.id as string}`, {
            name: (p.name as string | undefined) ?? undefined,
            description: (p.description as string | undefined) ?? undefined,
          });
          log.info({ id: p.id }, '[4b] Project patch indexed in Meilisearch');
          break;
        case 'ProjectStarted':
        case 'ProjectResumed':
          log.info({ id: p.id }, '[4a] Sending project status → active to Meilisearch');
          await indexer.patch(`project-${p.id as string}`, { status: 'active' });
          log.info({ id: p.id }, '[4b] Project status → active indexed');
          break;
        case 'ProjectPaused':
          log.info({ id: p.id }, '[4a] Sending project status → on_hold to Meilisearch');
          await indexer.patch(`project-${p.id as string}`, { status: 'on_hold' });
          log.info({ id: p.id }, '[4b] Project status → on_hold indexed');
          break;
        case 'ProjectCompleted':
          log.info({ id: p.id }, '[4a] Sending project status → done to Meilisearch');
          await indexer.patch(`project-${p.id as string}`, { status: 'done' });
          log.info({ id: p.id }, '[4b] Project status → done indexed');
          break;
        case 'ProjectPlanned':
          log.info({ id: p.id }, '[4a] Sending project status → planned to Meilisearch');
          await indexer.patch(`project-${p.id as string}`, { status: 'planned' });
          log.info({ id: p.id }, '[4b] Project status → planned indexed');
          break;
        default:
          break;
      }
    } catch (err) {
      log.error({ err, eventType: event.eventType }, 'search indexing failed — command not affected');
    }
  };
}
