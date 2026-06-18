import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';

export function createTasksSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    try {
      const p = event.payload as Record<string, unknown>;
      switch (event.eventType) {
        case 'TaskCreated':
          await indexer.upsert({
            id: `task-${p.id as string}`,
            entityId: p.id as string,
            type: 'task',
            name: p.name as string,
            description: (p.description as string | undefined) ?? null,
            status: 'ready',
            categoryId: p.categoryId as string,
          });
          break;
        case 'TaskUpdated': {
          const fields: Record<string, unknown> = {};
          if (p.name !== undefined) fields.name = p.name as string;
          if (p.description !== undefined) fields.description = p.description as string | null;
          if (p.categoryId !== undefined) fields.categoryId = p.categoryId as string;
          if (Object.keys(fields).length > 0) {
            await indexer.patch(`task-${p.id as string}`, fields as Partial<Omit<SearchDocument, 'id'>>);
          }
          break;
        }
        case 'TaskStarted':
          await indexer.patch(`task-${p.id as string}`, { status: 'ongoing' });
          break;
        case 'TaskCompleted':
          await indexer.patch(`task-${p.id as string}`, { status: 'done' });
          break;
        default:
          break;
      }
    } catch {
      // Search indexing failure must not fail the command
    }
  };
}
