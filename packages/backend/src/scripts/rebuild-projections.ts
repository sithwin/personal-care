import { Pool } from 'pg';
import { createCategoriesProjector } from '../infrastructure/projections/categories.projector';
import { createItemsProjector } from '../infrastructure/projections/items.projector';
import { createTasksProjector } from '../infrastructure/projections/tasks.projector';
import { createProjectsProjector } from '../infrastructure/projections/projects.projector';
import { createResourcesProjector } from '../infrastructure/projections/resources.projector';
import { createBalanceProjector } from '../infrastructure/projections/balance.projector';
import { createDashboardProjector } from '../infrastructure/projections/dashboard.projector';
import { createTasksSearchProjector } from '../infrastructure/projections/tasks-search.projector';
import { createItemsSearchProjector } from '../infrastructure/projections/items-search.projector';
import { createProjectsSearchProjector } from '../infrastructure/projections/projects-search.projector';
import { createProjectorRunner } from '../infrastructure/projections/runner';
import { PgTaskViewRepository } from '../infrastructure/persistence/views/PgTaskViewRepository';
import { PgItemViewRepository } from '../infrastructure/persistence/views/PgItemViewRepository';
import { PgCategoryViewRepository } from '../infrastructure/persistence/views/PgCategoryViewRepository';
import { PgProjectViewRepository } from '../infrastructure/persistence/views/PgProjectViewRepository';
import { PgResourceViewRepository } from '../infrastructure/persistence/views/PgResourceViewRepository';
import { PgBalanceViewRepository } from '../infrastructure/persistence/views/PgBalanceViewRepository';
import { PgDashboardViewRepository } from '../infrastructure/persistence/views/PgDashboardViewRepository';
import { MeilisearchSearchIndexer } from '../infrastructure/search/MeilisearchSearchIndexer';
import { childLogger } from '../infrastructure/logger';
import type { StoredEvent } from '../types';
import type { RequestContext } from '../application/ports/RequestContext';

const log = childLogger('rebuild-projections');

const PROJECTION_TABLES = [
  'task_resources_view',
  'task_items_view',
  'tasks_view',
  'items_view',
  'categories_view',
  'resources_view',
  'projects_view',
  'balance_status_view',
  'balance_rules_view',
  'dashboard_view',
];

async function rebuildProjections(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care',
  });

  try {
    log.info('Fetching all events from event store...');
    const result = await pool.query<StoredEvent>(
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events ORDER BY id ASC`,
    );
    const events = result.rows;
    log.info({ count: events.length }, 'Events loaded');

    log.info('Truncating all projection tables...');
    await pool.query(`TRUNCATE ${PROJECTION_TABLES.join(', ')}`);
    await pool.query('INSERT INTO dashboard_view (id) VALUES (1)');
    log.info('Projection tables cleared');

    const taskViewRepo = new PgTaskViewRepository(pool);
    const itemViewRepo = new PgItemViewRepository(pool);
    const categoryViewRepo = new PgCategoryViewRepository(pool);
    const projectViewRepo = new PgProjectViewRepository(pool);
    const resourceViewRepo = new PgResourceViewRepository(pool);
    const balanceViewRepo = new PgBalanceViewRepository(pool);
    const dashboardViewRepo = new PgDashboardViewRepository(pool);

    const meilisearchUrl = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
    const meilisearchKey = process.env.MEILISEARCH_API_KEY ?? '';
    const searchIndexer = new MeilisearchSearchIndexer(meilisearchUrl, meilisearchKey);

    const runProjectors = createProjectorRunner([
      createCategoriesProjector(categoryViewRepo),
      createItemsProjector(itemViewRepo, taskViewRepo),
      createTasksProjector(taskViewRepo, itemViewRepo),
      createProjectsProjector(projectViewRepo),
      createResourcesProjector(resourceViewRepo),
      createBalanceProjector(balanceViewRepo),
      createDashboardProjector(dashboardViewRepo),
      createTasksSearchProjector(searchIndexer),
      createItemsSearchProjector(searchIndexer),
      createProjectsSearchProjector(searchIndexer),
    ]);

    const ctx: RequestContext = {
      requestId: 'rebuild-projections',
      correlationId: 'rebuild-projections',
      log,
    };

    log.info('Replaying events through projectors...');
    let processed = 0;
    for (const event of events) {
      await runProjectors([event], ctx);
      processed++;
      if (processed % 100 === 0) {
        log.info({ processed, total: events.length }, 'Rebuild progress');
      }
    }

    log.info({ processed, total: events.length }, 'Rebuild complete');
    const taskCount = await pool.query<{ count: string }>('SELECT COUNT(*) FROM tasks_view');
    const categoryCount = await pool.query<{ count: string }>('SELECT COUNT(*) FROM categories_view');
    log.info({ tasks: taskCount.rows[0]?.count, categories: categoryCount.rows[0]?.count }, 'Row counts after rebuild');
  } finally {
    await pool.end();
  }
}

rebuildProjections().catch((err) => {
  log.fatal({ err }, 'Rebuild failed');
  process.exit(1);
});
