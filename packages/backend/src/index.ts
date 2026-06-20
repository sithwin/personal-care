import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { getPool } from './db/client';
import { runMigrations } from './db/migrate';
import { buildDependencies } from './infrastructure/composition-root';
import { logger } from './infrastructure/logger';
import { makeBalanceRulesRouter } from './api/routes/balance-rules.router';
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
import { requestContextMiddleware } from './api/middleware/request-context';
import { seed } from './seed/seed';

async function main(): Promise<void> {
  const pool = getPool();

  logger.info('Running migrations…');
  await runMigrations(pool);

  const deps = buildDependencies(pool);

  logger.info('Running seed…');
  await seed(deps.commandBus, pool);

  logger.info('Bootstrapping search index…');
  try {
    await bootstrapSearchIndex(deps.searchIndexer, pool);
  } catch (err) {
    logger.warn({ err }, 'Search index bootstrap failed — search may be unavailable until next restart');
  }

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
  app.use(requestContextMiddleware);

  // Versioned query routes
  app.use('/api/v1/tasks',         makeTasksRouter(deps.taskQueryService, deps.commandBus));
  app.use('/api/v1/items',         makeItemsRouter(deps.itemQueryService, deps.commandBus));
  app.use('/api/v1/categories',    makeCategoriesRouter(deps.categoryQueryService, deps.commandBus));
  app.use('/api/v1/projects',      makeProjectsRouter(deps.projectQueryService, deps.commandBus));
  app.use('/api/v1/resources',     makeResourcesRouter(deps.resourceQueryService, deps.commandBus));
  app.use('/api/v1/balance-rules', makeBalanceRulesRouter(deps.commandBus));
  app.use('/api/v1/balance',       makeBalanceRouter(deps.balanceQueryService));
  app.use('/api/v1/dashboard',     makeDashboardRouter(deps.dashboardQueryService));
  app.use('/api/v1/suggest',       makeSuggestRouter(deps.suggestQueryService));
  app.use('/api/v1/search',        makeSearchRouter(deps.searchQueryService));
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
