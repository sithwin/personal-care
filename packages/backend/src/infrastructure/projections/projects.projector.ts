import type { Projector } from '../../application/ports/IProjector';
import type { IProjectViewRepository } from '../../application/ports/IProjectViewRepository';

export function createProjectsProjector(projectRepo: IProjectViewRepository): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ProjectCreated':
        await projectRepo.insert({
          id: event.aggregateId,
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          categoryId: p.categoryId as string,
          dueDate: (p.dueDate as string | undefined) ?? null,
        });
        break;
      case 'TaskAddedToProject':
      case 'TaskPromotedToProject':
        await projectRepo.appendTask(event.aggregateId, p.taskId as string);
        break;
      case 'ProjectCompleted':
        await projectRepo.markCompleted(event.aggregateId);
        break;
      case 'ProjectPlanned':
        await projectRepo.plan(event.aggregateId, p.startDate as string, p.endDate as string);
        break;
      case 'ProjectStarted':
        await projectRepo.start(event.aggregateId, (p.endDate as string | undefined) ?? null);
        break;
      case 'ProjectPaused':
        await projectRepo.pause(event.aggregateId);
        break;
      case 'ProjectResumed':
        await projectRepo.resume(event.aggregateId);
        break;
      case 'ProjectUpdated':
        await projectRepo.updateMeta(event.aggregateId, {
          name: (p.name as string | undefined) ?? null,
          description: (p.description as string | undefined) ?? null,
          priority: (p.priority as string | undefined) ?? null,
        });
        break;
      default:
        break;
    }
  };
}
