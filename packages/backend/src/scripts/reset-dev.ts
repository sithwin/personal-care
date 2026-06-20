import { Pool } from 'pg';
import { Meilisearch } from 'meilisearch';
import { childLogger } from '../infrastructure/logger';

const log = childLogger('reset-dev');

const ALL_TABLES = [
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
  'events',
  'schema_migrations',
];

const MEILISEARCH_INDEX = 'personal_care';

async function resetDev(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log.error('reset-dev must not be run in production');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care',
  });

  try {
    log.info('Dropping all tables…');
    await pool.query(`DROP TABLE IF EXISTS ${ALL_TABLES.join(', ')} CASCADE`);
    log.info('All tables dropped');

    const meilisearchUrl = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
    const meilisearchKey = process.env.MEILISEARCH_API_KEY ?? '';
    const meili = new Meilisearch({ host: meilisearchUrl, apiKey: meilisearchKey });

    log.info('Deleting Meilisearch index…');
    try {
      const task = await meili.deleteIndex(MEILISEARCH_INDEX);
      await meili.tasks.waitForTask(task.taskUid);
      log.info('Meilisearch index deleted');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('index_not_found') || message.includes('not found')) {
        log.info('Meilisearch index did not exist — skipping');
      } else {
        throw err;
      }
    }

    log.info('Reset complete — run npm run migrate then restart the backend');
  } finally {
    await pool.end();
  }
}

resetDev().catch((err) => {
  log.fatal({ err }, 'Reset failed');
  process.exit(1);
});
