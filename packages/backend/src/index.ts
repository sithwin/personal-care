import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { getPool } from './db/client';
import { runMigrations } from './db/migrate';
import { buildDependencies } from './infrastructure/composition-root';
import { logger } from './infrastructure/logger';
import { makeCommandsRouter } from './api/routes/commands.router';
import { makeTasksRouter } from './api/routes/tasks.router';
import { makeItemsRouter } from './api/routes/items.router';
import { makeCategoriesRouter } from './api/routes/categories.router';
import { makeProjectsRouter } from './api/routes/projects.router';
import { makeResourcesRouter } from './api/routes/resources.router';
import { makeBalanceRouter } from './api/routes/balance.router';
import { makeDashboardRouter } from './api/routes/dashboard.router';
import { makeSuggestRouter } from './api/routes/suggest.router';
import { makeSearchRouter } from './api/routes/search.router';
import { bootstrapSearchIndex } from './infrastructure/search/bootstrapSearchIndex';
import { errorHandler } from './api/middleware/error-handler';
import { seed } from './seed/seed';

async function main(): Promise<void> {
  const pool = getPool();

  logger.info('Running migrations…');
  await runMigrations(pool);

  const deps = buildDependencies(pool);

  logger.info('Running seed…');
  await seed(deps.commandBus, pool);

  logger.info('Bootstrapping search index…');
  await bootstrapSearchIndex(deps.searchIndexer, pool);

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
  app.use(express.json({ limit: '10kb' }));
  app.use(pinoHttp({
    logger,
    customLogLevel: (_req, res) => res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  }));

  // Versioned query routes
  app.use('/api/v1/tasks',      makeTasksRouter(deps.taskQueryService));
  app.use('/api/v1/items',      makeItemsRouter(deps.itemQueryService));
  app.use('/api/v1/categories', makeCategoriesRouter(deps.categoryQueryService));
  app.use('/api/v1/projects',   makeProjectsRouter(deps.projectQueryService));
  app.use('/api/v1/resources',  makeResourcesRouter(deps.resourceQueryService));
  app.use('/api/v1/balance',    makeBalanceRouter(deps.balanceQueryService));
  app.use('/api/v1/dashboard',  makeDashboardRouter(deps.dashboardQueryService));
  app.use('/api/v1/suggest',    makeSuggestRouter(deps.suggestQueryService));
  app.use('/api/v1/search',    makeSearchRouter(deps.searchQueryService));

  // Internal / infrastructure routes — no version prefix
  app.use('/commands', makeCommandsRouter(deps.commandBus));
  app.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  const port = process.env.PORT ?? 3001;
  const server = app.listen(port, () => logger.info({ port }, `Backend running on http://localhost:${port}`));

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await pool.end();
      logger.info('DB pool closed — exiting');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { void shutdown('SIGINT'); });
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup');
  process.exit(1);
});
