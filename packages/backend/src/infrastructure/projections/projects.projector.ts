import type { Projector } from '../../application/ports/IProjector';
import type { IProjectViewRepository } from '../../application/ports/IProjectViewRepository';

export function createProjectsProjector(projectRepo: IProjectViewRepository): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ProjectCreated':
        await projectRepo.insert({
          id: p.id as string,
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          categoryId: p.categoryId as string,
          dueDate: (p.dueDate as string | undefined) ?? null,
        });
        break;

      case 'TaskAddedToProject':
        await projectRepo.appendTask(p.projectId as string, p.taskId as string);
        break;

      case 'ProjectCompleted':
        await projectRepo.markCompleted(p.id as string);
        break;

      case 'TaskPromotedToProject':
        await projectRepo.appendTask(p.projectId as string, p.taskId as string);
        break;

      default:
        break;
    }
  };
}
