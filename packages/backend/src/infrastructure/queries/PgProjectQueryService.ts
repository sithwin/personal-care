import { type Pool } from 'pg';
import type { IProjectQueryService, ProjectFilter, ProjectView } from '../../application/ports/IProjectQueryService';

type StoredStatus = 'draft' | 'planned' | 'active' | 'on_hold' | 'done';
type DisplayStatus = 'draft' | 'planned' | 'active' | 'on_hold' | 'done' | 'off_track' | 'at_risk';

function deriveDisplayStatus(
  storedStatus: StoredStatus,
  startDate: string | null,
  dueDate: string | null,
  progress: number,
): DisplayStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (storedStatus === 'planned' && startDate !== null) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (today >= start) return 'off_track';
  }

  if (storedStatus === 'active' && dueDate !== null) {
    const end = new Date(dueDate);
    end.setHours(0, 0, 0, 0);
    const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd < 7 && progress < 0.8) return 'at_risk';
  }

  return storedStatus;
}

export class PgProjectQueryService implements IProjectQueryService {
  constructor(private readonly pool: Pool) {}

  async getAll(filter: ProjectFilter): Promise<ProjectView[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.status) {
      conditions.push(`p.status = $${params.length + 1}`);
      params.push(filter.status);
    }
    if (filter.categoryId) {
      conditions.push(`p.category_id = $${params.length + 1}`);
      params.push(filter.categoryId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT p.*,
              CASE
                WHEN array_length(p.task_ids, 1) IS NULL THEN 0
                ELSE (
                  SELECT COUNT(*)::float / array_length(p.task_ids, 1)
                  FROM tasks_view t
                  WHERE t.id = ANY(p.task_ids) AND t.status = 'done'
                )
              END AS progress
       FROM projects_view p
       ${where}
       ORDER BY p.created_at DESC`,
      params,
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      ...(row as Omit<ProjectView, 'progress' | 'display_status'>),
      progress: Number(row.progress ?? 0),
      display_status: deriveDisplayStatus(
        row.status as StoredStatus,
        row.start_date as string | null,
        row.due_date as string | null,
        Number(row.progress ?? 0),
      ),
    }));
  }

  async getById(id: string): Promise<ProjectView | null> {
    const result = await this.pool.query(
      `SELECT p.*,
              CASE
                WHEN array_length(p.task_ids, 1) IS NULL THEN 0
                ELSE (
                  SELECT COUNT(*)::float / array_length(p.task_ids, 1)
                  FROM tasks_view t
                  WHERE t.id = ANY(p.task_ids) AND t.status = 'done'
                )
              END AS progress
       FROM projects_view p WHERE p.id = $1`,
      [id],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as Record<string, unknown>;
    return {
      ...(row as Omit<ProjectView, 'progress' | 'display_status'>),
      progress: Number(row.progress ?? 0),
      display_status: deriveDisplayStatus(
        row.status as StoredStatus,
        row.start_date as string | null,
        row.due_date as string | null,
        Number(row.progress ?? 0),
      ),
    };
  }
}
