import type { Projector } from '../../application/ports/IProjector';
import type { IItemViewRepository } from '../../application/ports/IItemViewRepository';
import type { ITaskViewRepository } from '../../application/ports/ITaskViewRepository';
import { deriveTaskStatus } from '../../application/services/task-status';

async function cascadeItemStatusToTasks(
  itemId: string,
  newStatus: string,
  taskRepo: ITaskViewRepository
): Promise<void> {
  await taskRepo.updateItemStatusForItem(itemId, newStatus);
  const taskIds = await taskRepo.getTaskIdsForItem(itemId);
  for (const taskId of taskIds) {
    const task = await taskRepo.findById(taskId);
    if (!task) continue;
    const itemStatuses = await taskRepo.getItemStatusesForTask(taskId);
    await taskRepo.updateStatus(taskId, deriveTaskStatus(task, itemStatuses));
  }
}

export function createItemsProjector(
  itemRepo: IItemViewRepository,
  taskRepo: ITaskViewRepository
): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ItemCreated':
        await itemRepo.insert({
          id: p.id as string,
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          categoryId: p.categoryId as string,
          quantity: (p.quantity as number | undefined) ?? null,
          price: (p.price as number | undefined) ?? null,
          notes: (p.notes as string | undefined) ?? null,
        });
        break;

      case 'ItemMarkedAvailable':
        await itemRepo.updateStatus(p.id as string, 'available');
        await cascadeItemStatusToTasks(p.id as string, 'available', taskRepo);
        break;

      case 'ItemMarkedAvailableAgain':
        await itemRepo.updateStatus(p.id as string, 'available');
        await cascadeItemStatusToTasks(p.id as string, 'available', taskRepo);
        break;

      case 'ItemMarkedConsumed':
        await itemRepo.updateStatus(p.id as string, 'consumed');
        await cascadeItemStatusToTasks(p.id as string, 'consumed', taskRepo);
        break;

      default:
        break;
    }
  };
}
