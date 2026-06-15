import type { Pool } from 'pg';
import type { ITaskViewRepository, InsertTaskData, TaskViewRow } from '../../../application/ports/ITaskViewRepository';

export class PgTaskViewRepository implements ITaskViewRepository {
  constructor(private readonly pool: Pool) {}

  async insert(data: InsertTaskData): Promise<void> {
    await this.pool.query(
      `INSERT INTO tasks_view (id, name, description, category_id, project_id, due_date,
        estimated_duration_value, estimated_duration_unit, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ready')
       ON CONFLICT (id) DO NOTHING`,
      [data.id, data.name, data.description, data.categoryId, data.projectId,
       data.dueDate, data.estimatedDurationValue, data.estimatedDurationUnit]
    );
  }

  async markStarted(id: string): Promise<void> {
    await this.pool.query('UPDATE tasks_view SET started_at = NOW() WHERE id = $1', [id]);
  }

  async markCompleted(id: string): Promise<void> {
    await this.pool.query('UPDATE tasks_view SET completed_at = NOW() WHERE id = $1', [id]);
  }

  async reschedule(id: string, nextDueDate: string): Promise<void> {
    await this.pool.query(
      `UPDATE tasks_view SET started_at = NULL, completed_at = NULL,
       due_date = $1, completion_count = completion_count + 1 WHERE id = $2`,
      [nextDueDate, id]
    );
  }

  async setSchedule(id: string, scheduledDate: string, scheduledStartTime: string): Promise<void> {
    await this.pool.query(
      'UPDATE tasks_view SET scheduled_date = $1, scheduled_start_time = $2 WHERE id = $3',
      [scheduledDate, scheduledStartTime, id]
    );
  }

  async setRecurrence(id: string, recurrenceRule: unknown, dueDate: string | null): Promise<void> {
    await this.pool.query(
      'UPDATE tasks_view SET recurrence_rule = $1, due_date = COALESCE($2, due_date) WHERE id = $3',
      [JSON.stringify(recurrenceRule), dueDate, id]
    );
  }

  async setDueDate(id: string, dueDate: string): Promise<void> {
    await this.pool.query('UPDATE tasks_view SET due_date = $1 WHERE id = $2', [dueDate, id]);
  }

  async setProjectId(id: string, projectId: string): Promise<void> {
    await this.pool.query('UPDATE tasks_view SET project_id = $1 WHERE id = $2', [projectId, id]);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.pool.query('UPDATE tasks_view SET status = $1 WHERE id = $2', [status, id]);
  }

  async findById(id: string): Promise<TaskViewRow | null> {
    const res = await this.pool.query(
      'SELECT started_at, completed_at, due_date, recurrence_rule FROM tasks_view WHERE id = $1',
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      startedAt: r.started_at as Date | null,
      completedAt: r.completed_at as Date | null,
      dueDate: r.due_date as Date | null,
      recurrenceRule: r.recurrence_rule as unknown | null,
    };
  }

  async getItemStatusesForTask(taskId: string): Promise<string[]> {
    const res = await this.pool.query(
      'SELECT item_status FROM task_items_view WHERE task_id = $1',
      [taskId]
    );
    return res.rows.map((r: { item_status: string }) => r.item_status);
  }

  async insertItemRequirement(taskId: string, itemId: string, consumable: boolean, itemStatus: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO task_items_view (task_id, item_id, consumable, item_status)
       VALUES ($1,$2,$3,$4) ON CONFLICT (task_id, item_id) DO NOTHING`,
      [taskId, itemId, consumable, itemStatus]
    );
  }

  async updateItemStatusForItem(itemId: string, status: string): Promise<void> {
    await this.pool.query(
      'UPDATE task_items_view SET item_status = $1 WHERE item_id = $2',
      [status, itemId]
    );
  }

  async getTaskIdsForItem(itemId: string): Promise<string[]> {
    const res = await this.pool.query(
      'SELECT task_id FROM task_items_view WHERE item_id = $1',
      [itemId]
    );
    return res.rows.map((r: { task_id: string }) => r.task_id);
  }
}
