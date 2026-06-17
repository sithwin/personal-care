import type { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from './client';

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
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

  const sql = readFileSync(join(__dirname, 'migrations/001_projections.sql'), 'utf8');
  await pool.query(sql);

  const sql2 = readFileSync(join(__dirname, 'migrations/002_project_enhancements.sql'), 'utf8');
  await pool.query(sql2);

  console.log('All migrations complete');
}

// Run standalone: ts-node src/db/migrate.ts
if (process.argv[1] === __filename) {
  const pool = getPool();
  runMigrations(pool)
    .then(() => pool.end())
    .catch((err) => { console.error(err); process.exit(1); });
}
