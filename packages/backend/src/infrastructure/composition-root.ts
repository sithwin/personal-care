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
import { UpdateTaskHandler } from '../application/command-handlers/task/UpdateTaskHandler';
import { CreateProjectHandler } from '../application/command-handlers/project/CreateProjectHandler';
import { AddTaskToProjectHandler } from '../application/command-handlers/project/AddTaskToProjectHandler';
import { CompleteProjectHandler } from '../application/command-handlers/project/CompleteProjectHandler';
import { PlanProjectHandler } from '../application/command-handlers/project/PlanProjectHandler';
import { StartProjectHandler } from '../application/command-handlers/project/StartProjectHandler';
import { PauseProjectHandler } from '../application/command-handlers/project/PauseProjectHandler';
import { ResumeProjectHandler } from '../application/command-handlers/project/ResumeProjectHandler';
import { UpdateProjectHandler } from '../application/command-handlers/project/UpdateProjectHandler';
import { CreateResourceHandler } from '../application/command-handlers/resource/CreateResourceHandler';
import { UpdateResourceHandler } from '../application/command-handlers/resource/UpdateResourceHandler';
import { DeleteResourceHandler } from '../application/command-handlers/resource/DeleteResourceHandler';

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

  commandBus.register('CreateBalanceRuleCommand', new CreateBalanceRuleHandler(eventStore));
  commandBus.register('UpdateBalanceRuleCommand', new UpdateBalanceRuleHandler(eventStore));
  commandBus.register('DeleteBalanceRuleCommand', new DeleteBalanceRuleHandler(eventStore));

  commandBus.register('CreateCategoryCommand', new CreateCategoryHandler(eventStore));
  commandBus.register('UpdateCategoryCommand', new UpdateCategoryHandler(eventStore));
  commandBus.register('DeleteCategoryCommand', new DeleteCategoryHandler(eventStore));

  commandBus.register('CreateItemCommand', new CreateItemHandler(eventStore));
  commandBus.register('MarkItemAvailableCommand', new MarkItemAvailableHandler(eventStore));
  commandBus.register('MarkItemConsumedCommand', new MarkItemConsumedHandler(eventStore));
  commandBus.register('MarkItemAvailableAgainCommand', new MarkItemAvailableAgainHandler(eventStore));

  commandBus.register('CreateTaskCommand', new CreateTaskHandler(eventStore));
  commandBus.register('UpdateTaskCommand', new UpdateTaskHandler(eventStore));
  commandBus.register('StartTaskCommand', new StartTaskHandler(eventStore));
  commandBus.register('CompleteTaskCommand', new CompleteTaskHandler(eventStore));
  commandBus.register('AddItemRequirementCommand', new AddItemRequirementHandler(eventStore));
  commandBus.register('AttachResourceToTaskCommand', new AttachResourceToTaskHandler(eventStore));
  commandBus.register('DetachResourceFromTaskCommand', new DetachResourceFromTaskHandler(eventStore));
  commandBus.register('SetTaskRecurrenceCommand', new SetTaskRecurrenceHandler(eventStore));
  commandBus.register('SkipRecurrenceCommand', new SkipRecurrenceHandler(eventStore));
  commandBus.register('ScheduleTaskCommand', new ScheduleTaskHandler(eventStore));
  commandBus.register('PromoteToProjectCommand', new PromoteToProjectHandler(eventStore));

  commandBus.register('CreateProjectCommand', new CreateProjectHandler(eventStore));
  commandBus.register('AddTaskToProjectCommand', new AddTaskToProjectHandler(eventStore));
  commandBus.register('CompleteProjectCommand', new CompleteProjectHandler(eventStore));
  commandBus.register('PlanProjectCommand', new PlanProjectHandler(eventStore));
  commandBus.register('StartProjectCommand', new StartProjectHandler(eventStore));
  commandBus.register('PauseProjectCommand', new PauseProjectHandler(eventStore));
  commandBus.register('ResumeProjectCommand', new ResumeProjectHandler(eventStore));
  commandBus.register('UpdateProjectCommand', new UpdateProjectHandler(eventStore));

  commandBus.register('CreateResourceCommand', new CreateResourceHandler(eventStore));
  commandBus.register('UpdateResourceCommand', new UpdateResourceHandler(eventStore));
  commandBus.register('DeleteResourceCommand', new DeleteResourceHandler(eventStore));

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
