import type { Projector } from '../../application/ports/IProjector';
import type { IDashboardViewRepository } from '../../application/ports/IDashboardViewRepository';

const TASK_EVENTS = new Set(['TaskCreated', 'TaskStarted', 'TaskCompleted', 'TaskRescheduled', 'ItemRequirementAdded', 'TaskRecurrenceSet', 'RecurrenceSkipped']);
const ITEM_EVENTS = new Set(['ItemCreated', 'ItemMarkedAvailable', 'ItemMarkedConsumed', 'ItemMarkedAvailableAgain']);

export function createDashboardProjector(dashboardRepo: IDashboardViewRepository): Projector {
  return async (event) => {
    if (TASK_EVENTS.has(event.eventType) || ITEM_EVENTS.has(event.eventType)) {
      await dashboardRepo.refresh();
    }
  };
}
