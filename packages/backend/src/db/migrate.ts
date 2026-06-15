import { getPool } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  const pool = getPool();

  // Event store
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

  // Projections
  const sql = readFileSync(join(__dirname, 'migrations/001_projections.sql'), 'utf8');
  await pool.query(sql);

  console.log('All migrations complete');
  await pool.end();
}

migrate().catch(console.error);
