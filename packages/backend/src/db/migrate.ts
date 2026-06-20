import type { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from './client';

async function applyMigration(pool: Pool, name: string, sql: string): Promise<void> {
  const { rows } = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations WHERE name = $1',
    [name],
  );
  if (rows.length > 0) return;
  await pool.query(sql);
  await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
}

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await applyMigration(pool, '000_events_table', `
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      aggregate_id UUID NOT NULL,
      aggregate_type TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      version INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(aggregate_id, version)
    )
  `);

  await applyMigration(
    pool,
    '001_projections',
    readFileSync(join(__dirname, 'migrations/001_projections.sql'), 'utf8'),
  );

  await applyMigration(
    pool,
    '002_project_enhancements',
    readFileSync(join(__dirname, 'migrations/002_project_enhancements.sql'), 'utf8'),
  );

  console.log('All migrations complete');
}

// Run standalone: ts-node src/db/migrate.ts
if (process.argv[1] === __filename) {
  const pool = getPool();
  runMigrations(pool)
    .then(() => pool.end())
    .catch((err) => { console.error(err); process.exit(1); });
}
