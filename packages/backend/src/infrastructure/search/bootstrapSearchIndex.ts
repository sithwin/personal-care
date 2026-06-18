import type { Pool } from 'pg';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';

export async function bootstrapSearchIndex(indexer: ISearchIndexer, pool: Pool): Promise<void> {
  await indexer.ensureIndex();

  const count = await indexer.getDocumentCount();
  if (count > 0) return;

  const [tasks, items, projects] = await Promise.all([
    pool.query<{ id: string; name: string; description: string | null; category_id: string; status: string }>(
      'SELECT id, name, description, category_id, status FROM tasks_view'
    ),
    pool.query<{ id: string; name: string; description: string | null; category_id: string; status: string }>(
      'SELECT id, name, description, category_id, status FROM items_view'
    ),
    pool.query<{ id: string; name: string; description: string | null; category_id: string; status: string }>(
      'SELECT id, name, description, category_id, status FROM projects_view'
    ),
  ]);

  const docs: SearchDocument[] = [
    ...tasks.rows.map(r => ({
      id: `task-${r.id}`,
      entityId: r.id,
      type: 'task' as const,
      name: r.name,
      description: r.description,
      status: r.status,
      categoryId: r.category_id,
    })),
    ...items.rows.map(r => ({
      id: `item-${r.id}`,
      entityId: r.id,
      type: 'item' as const,
      name: r.name,
      description: r.description,
      status: r.status,
      categoryId: r.category_id,
    })),
    ...projects.rows.map(r => ({
      id: `project-${r.id}`,
      entityId: r.id,
      type: 'project' as const,
      name: r.name,
      description: r.description,
      status: r.status,
      categoryId: r.category_id,
    })),
  ];

  await indexer.bootstrap(docs);
}
