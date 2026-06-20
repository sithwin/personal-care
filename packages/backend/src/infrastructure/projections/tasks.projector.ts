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
          id: event.aggregateId,
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          categoryId: p.categoryId as string,
          projectId: (p.projectId as string | undefined) ?? null,
          dueDate: (p.dueDate as string | undefined) ?? null,
          estimatedDurationValue: dur?.value ?? null,
          estimatedDurationUnit: dur?.unit ?? null,
        });
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;
      }

      case 'TaskStarted':
        await taskRepo.markStarted(event.aggregateId);
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;

      case 'TaskCompleted':
        await taskRepo.markCompleted(event.aggregateId);
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;

      case 'TaskRescheduled':
        await taskRepo.reschedule(event.aggregateId, p.nextDueDate as string);
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;

      case 'ItemRequirementAdded': {
        const itemStatus = (await itemRepo.findStatus(p.itemId as string)) ?? 'to_buy';
        await taskRepo.insertItemRequirement(
          event.aggregateId, p.itemId as string, p.consumable as boolean, itemStatus
        );
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;
      }

      case 'ItemRequirementRemoved':
        await taskRepo.deleteItemRequirement(event.aggregateId, p.itemId as string);
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;

      case 'TaskScheduled':
        await taskRepo.setSchedule(event.aggregateId, p.scheduledDate as string, p.scheduledStartTime as string);
        break;

      case 'TaskRecurrenceSet':
        await taskRepo.setRecurrence(event.aggregateId, p.recurrenceRule, (p.dueDate as string | undefined) ?? null);
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;

      case 'RecurrenceSkipped':
        await taskRepo.setDueDate(event.aggregateId, p.nextDueDate as string);
        await refreshTaskStatus(event.aggregateId, taskRepo);
        break;

      case 'TaskPromotedToProject':
        await taskRepo.setProjectId(event.aggregateId, p.projectId as string);
        break;

      case 'TaskUpdated': {
        const dur = p.estimatedDuration as { value: number; unit: string } | undefined;
        await taskRepo.updateFields(event.aggregateId, {
          name: (p.name as string | undefined) ?? null,
          categoryId: (p.categoryId as string | undefined) ?? null,
          description: (p.description as string | undefined) ?? null,
          estimatedDurationValue: dur?.value ?? null,
          estimatedDurationUnit: dur?.unit ?? null,
          dueDate: (p.dueDate as string | undefined) ?? null,
        });
        break;
      }

      default:
        break;
    }
  };
}
