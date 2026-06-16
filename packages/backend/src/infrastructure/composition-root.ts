import type { Pool } from 'pg';
import { EventStore } from './persistence/EventStore';
import { CommandBus } from './command-bus/CommandBus';
import { createCategoriesProjector } from './projections/categories.projector';
import { createItemsProjector } from './projections/items.projector';
import { createTasksProjector } from './projections/tasks.projector';
import { createProjectsProjector } from './projections/projects.projector';
import { createResourcesProjector } from './projections/resources.projector';
import { createBalanceProjector } from './projections/balance.projector';
import { createDashboardProjector } from './projections/dashboard.projector';
import { createProjectorRunner } from './projections/runner';
import { PgTaskViewRepository } from './persistence/views/PgTaskViewRepository';
import { PgItemViewRepository } from './persistence/views/PgItemViewRepository';
import { PgCategoryViewRepository } from './persistence/views/PgCategoryViewRepository';
import { PgProjectViewRepository } from './persistence/views/PgProjectViewRepository';
import { PgResourceViewRepository } from './persistence/views/PgResourceViewRepository';
import { PgBalanceViewRepository } from './persistence/views/PgBalanceViewRepository';
import { PgDashboardViewRepository } from './persistence/views/PgDashboardViewRepository';
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
import { CreateBalanceRuleHandler } from '../application/command-handlers/balance-rule/CreateBalanceRuleHandler';
import { UpdateBalanceRuleHandler } from '../application/command-handlers/balance-rule/UpdateBalanceRuleHandler';
import { DeleteBalanceRuleHandler } from '../application/command-handlers/balance-rule/DeleteBalanceRuleHandler';
import { CreateCategoryHandler } from '../application/command-handlers/category/CreateCategoryHandler';
import { UpdateCategoryHandler } from '../application/command-handlers/category/UpdateCategoryHandler';
import { DeleteCategoryHandler } from '../application/command-handlers/category/DeleteCategoryHandler';

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

  const taskViewRepo = new PgTaskViewRepository(pool);
  const itemViewRepo = new PgItemViewRepository(pool);
  const categoryViewRepo = new PgCategoryViewRepository(pool);
  const projectViewRepo = new PgProjectViewRepository(pool);
  const resourceViewRepo = new PgResourceViewRepository(pool);
  const balanceViewRepo = new PgBalanceViewRepository(pool);
  const dashboardViewRepo = new PgDashboardViewRepository(pool);

  const runProjectors = createProjectorRunner([
    createCategoriesProjector(categoryViewRepo),
    createItemsProjector(itemViewRepo, taskViewRepo),
    createTasksProjector(taskViewRepo, itemViewRepo),
    createProjectsProjector(projectViewRepo),
    createResourcesProjector(resourceViewRepo),
    createBalanceProjector(balanceViewRepo),
    createDashboardProjector(dashboardViewRepo),
  ]);

  const commandBus = new CommandBus(runProjectors);

  commandBus.register('CreateBalanceRule', new CreateBalanceRuleHandler(eventStore));
  commandBus.register('UpdateBalanceRule', new UpdateBalanceRuleHandler(eventStore));
  commandBus.register('DeleteBalanceRule', new DeleteBalanceRuleHandler(eventStore));

  commandBus.register('CreateCategory', new CreateCategoryHandler(eventStore));
  commandBus.register('UpdateCategory', new UpdateCategoryHandler(eventStore));
  commandBus.register('DeleteCategory', new DeleteCategoryHandler(eventStore));

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
