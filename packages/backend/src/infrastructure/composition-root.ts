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
import { CreateItemHandler } from '../application/command-handlers/item/CreateItemHandler';
import { MarkItemAvailableHandler } from '../application/command-handlers/item/MarkItemAvailableHandler';
import { MarkItemConsumedHandler } from '../application/command-handlers/item/MarkItemConsumedHandler';
import { MarkItemAvailableAgainHandler } from '../application/command-handlers/item/MarkItemAvailableAgainHandler';
import { CreateTaskHandler } from '../application/command-handlers/task/CreateTaskHandler';
import { StartTaskHandler } from '../application/command-handlers/task/StartTaskHandler';
import { CompleteTaskHandler } from '../application/command-handlers/task/CompleteTaskHandler';
import { AddItemRequirementHandler } from '../application/command-handlers/task/AddItemRequirementHandler';
import { AttachResourceToTaskHandler } from '../application/command-handlers/task/AttachResourceToTaskHandler';
import { DetachResourceFromTaskHandler } from '../application/command-handlers/task/DetachResourceFromTaskHandler';
import { SetTaskRecurrenceHandler } from '../application/command-handlers/task/SetTaskRecurrenceHandler';
import { SkipRecurrenceHandler } from '../application/command-handlers/task/SkipRecurrenceHandler';
import { ScheduleTaskHandler } from '../application/command-handlers/task/ScheduleTaskHandler';
import { PromoteToProjectHandler } from '../application/command-handlers/task/PromoteToProjectHandler';
import { CreateProjectHandler } from '../application/command-handlers/project/CreateProjectHandler';
import { AddTaskToProjectHandler } from '../application/command-handlers/project/AddTaskToProjectHandler';
import { CompleteProjectHandler } from '../application/command-handlers/project/CompleteProjectHandler';

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

  commandBus.register('CreateItem', new CreateItemHandler(eventStore));
  commandBus.register('MarkItemAvailable', new MarkItemAvailableHandler(eventStore));
  commandBus.register('MarkItemConsumed', new MarkItemConsumedHandler(eventStore));
  commandBus.register('MarkItemAvailableAgain', new MarkItemAvailableAgainHandler(eventStore));

  commandBus.register('CreateTask', new CreateTaskHandler(eventStore));
  commandBus.register('StartTask', new StartTaskHandler(eventStore));
  commandBus.register('CompleteTask', new CompleteTaskHandler(eventStore));
  commandBus.register('AddItemRequirement', new AddItemRequirementHandler(eventStore));
  commandBus.register('AttachResourceToTask', new AttachResourceToTaskHandler(eventStore));
  commandBus.register('DetachResourceFromTask', new DetachResourceFromTaskHandler(eventStore));
  commandBus.register('SetTaskRecurrence', new SetTaskRecurrenceHandler(eventStore));
  commandBus.register('SkipRecurrence', new SkipRecurrenceHandler(eventStore));
  commandBus.register('ScheduleTask', new ScheduleTaskHandler(eventStore));
  commandBus.register('PromoteToProject', new PromoteToProjectHandler(eventStore));

  commandBus.register('CreateProject', new CreateProjectHandler(eventStore));
  commandBus.register('AddTaskToProject', new AddTaskToProjectHandler(eventStore));
  commandBus.register('CompleteProject', new CompleteProjectHandler(eventStore));

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
