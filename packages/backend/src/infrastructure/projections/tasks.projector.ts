import type { Projector } from '../../application/ports/IProjector';
import type { ITaskViewRepository } from '../../application/ports/ITaskViewRepository';
import type { IItemViewRepository } from '../../application/ports/IItemViewRepository';
import { deriveTaskStatus } from '../../application/services/task-status';

async function refreshTaskStatus(taskId: string, taskRepo: ITaskViewRepository): Promise<void> {
  const task = await taskRepo.findById(taskId);
  if (!task) return;
  const itemStatuses = await taskRepo.getItemStatusesForTask(taskId);
  await taskRepo.updateStatus(taskId, deriveTaskStatus(task, itemStatuses));
}

export function createTasksProjector(taskRepo: ITaskViewRepository, itemRepo: IItemViewRepository): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'TaskCreated': {
        const dur = p.estimatedDuration as { value: number; unit: string } | undefined;
        await taskRepo.insert({
          id: p.id as string,
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          categoryId: p.categoryId as string,
          projectId: (p.projectId as string | undefined) ?? null,
          dueDate: (p.dueDate as string | undefined) ?? null,
          estimatedDurationValue: dur?.value ?? null,
          estimatedDurationUnit: dur?.unit ?? null,
        });
        await refreshTaskStatus(p.id as string, taskRepo);
        break;
      }

      case 'TaskStarted':
        await taskRepo.markStarted(p.id as string);
        await refreshTaskStatus(p.id as string, taskRepo);
        break;

      case 'TaskCompleted':
        await taskRepo.markCompleted(p.id as string);
        await refreshTaskStatus(p.id as string, taskRepo);
        break;

      case 'TaskRescheduled':
        await taskRepo.reschedule(p.id as string, p.nextDueDate as string);
        await refreshTaskStatus(p.id as string, taskRepo);
        break;

      case 'ItemRequirementAdded': {
        const itemStatus = (await itemRepo.findStatus(p.itemId as string)) ?? 'to_buy';
        await taskRepo.insertItemRequirement(
          p.taskId as string, p.itemId as string, p.consumable as boolean, itemStatus
        );
        await refreshTaskStatus(p.taskId as string, taskRepo);
        break;
      }

      case 'TaskScheduled':
        await taskRepo.setSchedule(p.id as string, p.scheduledDate as string, p.scheduledStartTime as string);
        break;

      case 'TaskRecurrenceSet':
        await taskRepo.setRecurrence(p.id as string, p.recurrenceRule, (p.dueDate as string | undefined) ?? null);
        await refreshTaskStatus(p.id as string, taskRepo);
        break;

      case 'RecurrenceSkipped':
        await taskRepo.setDueDate(p.id as string, p.nextDueDate as string);
        await refreshTaskStatus(p.id as string, taskRepo);
        break;

      case 'TaskPromotedToProject':
        await taskRepo.setProjectId(p.taskId as string, p.projectId as string);
        break;

      default:
        break;
    }
  };
}
