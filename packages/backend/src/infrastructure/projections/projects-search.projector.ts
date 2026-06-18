import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

export function createProjectsSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    try {
      const p = event.payload as Record<string, unknown>;
      switch (event.eventType) {
        case 'ProjectCreated':
          await indexer.upsert({
            id: `project-${p.id as string}`,
            entityId: p.id as string,
            type: 'project',
            name: p.name as string,
            description: (p.description as string | undefined) ?? null,
            status: 'draft',
            categoryId: p.categoryId as string,
          });
          break;
        case 'ProjectUpdated':
          await indexer.patch(`project-${p.id as string}`, {
            name: (p.name as string | undefined) ?? undefined,
            description: (p.description as string | undefined) ?? undefined,
          });
          break;
        case 'ProjectStarted':
        case 'ProjectResumed':
          await indexer.patch(`project-${p.id as string}`, { status: 'active' });
          break;
        case 'ProjectPaused':
          await indexer.patch(`project-${p.id as string}`, { status: 'on_hold' });
          break;
        case 'ProjectCompleted':
          await indexer.patch(`project-${p.id as string}`, { status: 'done' });
          break;
        case 'ProjectPlanned':
          await indexer.patch(`project-${p.id as string}`, { status: 'planned' });
          break;
        default:
          break;
      }
    } catch {
      // Search indexing failure must not fail the command
    }
  };
}
