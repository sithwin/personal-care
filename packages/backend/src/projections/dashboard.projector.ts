import { Pool } from 'pg';
import { StoredEvent } from '../types';

const TASK_EVENTS = new Set(['TaskCreated', 'TaskStarted', 'TaskCompleted', 'TaskRescheduled', 'ItemRequirementAdded', 'TaskRecurrenceSet', 'RecurrenceSkipped']);
const ITEM_EVENTS = new Set(['ItemCreated', 'ItemMarkedAvailable', 'ItemMarkedConsumed', 'ItemMarkedAvailableAgain']);

async function refreshDashboard(pool: Pool): Promise<void> {
  await pool.query(`
    UPDATE dashboard_view SET
      ready_count   = (SELECT COUNT(*) FROM tasks_view WHERE status = 'ready'),
      ongoing_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'ongoing'),
      pending_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'pending'),
      planned_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'planned'),
      to_buy_count  = (SELECT COUNT(*) FROM items_view WHERE status = 'to_buy'),
      updated_at    = NOW()
    WHERE id = 1
  `);
}

export async function dashboardProjector(event: StoredEvent, pool: Pool): Promise<void> {
  if (TASK_EVENTS.has(event.eventType) || ITEM_EVENTS.has(event.eventType)) {
    await refreshDashboard(pool);
  }
}
