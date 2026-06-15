import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getPool } from './db/client';
import { runMigrations } from './db/migrate';
import { buildDependencies } from './infrastructure/composition-root';
import { makeCommandsRouter } from './api/routes/commands.router';
import { makeTasksRouter } from './api/routes/tasks.router';
import { makeItemsRouter } from './api/routes/items.router';
import { makeCategoriesRouter } from './api/routes/categories.router';
import { makeProjectsRouter } from './api/routes/projects.router';
import { makeResourcesRouter } from './api/routes/resources.router';
import { makeBalanceRouter } from './api/routes/balance.router';
import { makeDashboardRouter } from './api/routes/dashboard.router';
import { makeSuggestRouter } from './api/routes/suggest.router';
import { errorHandler } from './api/middleware/error-handler';
import { seed } from './seed/seed';

async function main() {
  const pool = getPool();
  await runMigrations(pool);

  const deps = buildDependencies(pool);
  await seed(deps.commandBus, pool);

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.use('/commands', makeCommandsRouter(deps.commandBus));
  app.use('/tasks', makeTasksRouter(deps.taskQueryService));
  app.use('/items', makeItemsRouter(deps.itemQueryService));
  app.use('/categories', makeCategoriesRouter(deps.categoryQueryService));
  app.use('/projects', makeProjectsRouter(deps.projectQueryService));
  app.use('/resources', makeResourcesRouter(deps.resourceQueryService));
  app.use('/balance', makeBalanceRouter(deps.balanceQueryService));
  app.use('/dashboard', makeDashboardRouter(deps.dashboardQueryService));
  app.use('/suggest', makeSuggestRouter(deps.suggestQueryService));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  const port = process.env.PORT ?? 3001;
  app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
}

main().catch(console.error);
