import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

export function createTasksSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
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
      case 'TaskUpdated':
        await indexer.upsert({
          id: `task-${p.id as string}`,
          entityId: p.id as string,
          type: 'task',
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          status: null,
          categoryId: (p.categoryId as string | undefined) ?? null,
        });
        break;
      case 'TaskStarted':
        await indexer.patch(`task-${p.id as string}`, { status: 'ongoing' });
        break;
      case 'TaskCompleted':
        await indexer.patch(`task-${p.id as string}`, { status: 'done' });
        break;
      default:
        break;
    }
  };
}
