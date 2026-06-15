import type { Projector } from '../../application/ports/IProjector';
import type { IResourceViewRepository } from '../../application/ports/IResourceViewRepository';

export function createResourcesProjector(resourceRepo: IResourceViewRepository): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ResourceCreated':
        await resourceRepo.insert({
          id: p.id as string,
          title: p.title as string,
          type: p.type as string,
          url: (p.url as string | undefined) ?? null,
          notes: (p.notes as string | undefined) ?? null,
          categoryId: (p.categoryId as string | undefined) ?? null,
        });
        break;

      case 'ResourceUpdated':
        await resourceRepo.update(p.id as string, {
          title: (p.title as string | undefined) ?? null,
          url: (p.url as string | undefined) ?? null,
          notes: (p.notes as string | undefined) ?? null,
        });
        break;

      case 'ResourceDeleted':
        await resourceRepo.delete(p.id as string);
        break;

      case 'ResourceAttachedToTask': {
        const resource = await resourceRepo.findTitleAndType(p.resourceId as string);
        if (!resource) break;
        await resourceRepo.insertTaskResource(p.taskId as string, p.resourceId as string, resource.title, resource.type);
        await resourceRepo.appendTaskId(p.resourceId as string, p.taskId as string);
        break;
      }

      case 'ResourceDetachedFromTask':
        await resourceRepo.deleteTaskResource(p.taskId as string, p.resourceId as string);
        await resourceRepo.removeTaskId(p.resourceId as string, p.taskId as string);
        break;

      default:
        break;
    }
  };
}
