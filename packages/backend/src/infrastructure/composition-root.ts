import type { Pool } from 'pg';
import { EventStore } from '../event-store/event-store';
import { CommandBus } from '../command-bus/command-bus';
import { createCategoriesProjector } from './projections/categories.projector';
import { createItemsProjector } from './projections/items.projector';
import { createTasksProjector } from './projections/tasks.projector';
import { createProjectsProjector } from './projections/projects.projector';
import { createResourcesProjector } from './projections/resources.projector';
import { createBalanceProjector } from './projections/balance.projector';
import { createDashboardProjector } from './projections/dashboard.projector';
import { createProjectorRunner } from './projections/runner';
import { PgTaskQueryService } from './queries/PgTaskQueryService';
import { PgItemQueryService } from './queries/PgItemQueryService';
import { PgCategoryQueryService } from './queries/PgCategoryQueryService';
import { PgProjectQueryService } from './queries/PgProjectQueryService';
import { PgResourceQueryService } from './queries/PgResourceQueryService';
import { PgBalanceQueryService } from './queries/PgBalanceQueryService';
import { PgDashboardQueryService } from './queries/PgDashboardQueryService';
import { PgSuggestQueryService } from './queries/PgSuggestQueryService';
import type { IEventStore } from '../application/ports/IEventStore';
import type { ICommandBus } from '../application/ports/ICommandBus';
import type { ITaskQueryService } from '../application/ports/ITaskQueryService';
import type { IItemQueryService } from '../application/ports/IItemQueryService';
import type { ICategoryQueryService } from '../application/ports/ICategoryQueryService';
import type { IProjectQueryService } from '../application/ports/IProjectQueryService';
import type { IResourceQueryService } from '../application/ports/IResourceQueryService';
import type { IBalanceQueryService } from '../application/ports/IBalanceQueryService';
import type { IDashboardQueryService } from '../application/ports/IDashboardQueryService';
import type { ISuggestQueryService } from '../application/ports/ISuggestQueryService';

export interface AppDependencies {
  eventStore: IEventStore;
  commandBus: ICommandBus;
  taskQueryService: ITaskQueryService;
  itemQueryService: IItemQueryService;
  categoryQueryService: ICategoryQueryService;
  projectQueryService: IProjectQueryService;
  resourceQueryService: IResourceQueryService;
  balanceQueryService: IBalanceQueryService;
  dashboardQueryService: IDashboardQueryService;
  suggestQueryService: ISuggestQueryService;
}

export function buildDependencies(pool: Pool): AppDependencies {
  const eventStore = new EventStore(pool);

  const runProjectors = createProjectorRunner([
    createCategoriesProjector(pool),
    createItemsProjector(pool),
    createTasksProjector(pool),
    createProjectsProjector(pool),
    createResourcesProjector(pool),
    createBalanceProjector(pool),
    createDashboardProjector(pool),
  ]);

  const commandBus = new CommandBus(eventStore, runProjectors);

  return {
    eventStore,
    commandBus,
    taskQueryService: new PgTaskQueryService(pool),
    itemQueryService: new PgItemQueryService(pool),
    categoryQueryService: new PgCategoryQueryService(pool),
    projectQueryService: new PgProjectQueryService(pool),
    resourceQueryService: new PgResourceQueryService(pool),
    balanceQueryService: new PgBalanceQueryService(pool),
    dashboardQueryService: new PgDashboardQueryService(pool),
    suggestQueryService: new PgSuggestQueryService(pool),
  };
}
