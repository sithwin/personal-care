import { EventStore } from '../event-store/event-store';
import { StoredEvent } from '../types';
import { Pool } from 'pg';
import { runProjectors } from '../projections/runner';
import { handleCategoryCommand } from '../domain/category/aggregate';
import { handleItemCommand } from '../domain/item/aggregate';
import { handleTaskCommand } from '../domain/task/aggregate';
import { handleProjectCommand } from '../domain/project/aggregate';
import { handleResourceCommand } from '../domain/resource/aggregate';
import { handleBalanceRuleCommand } from '../domain/balance-rule/aggregate';

type AnyCommand = Parameters<typeof handleCategoryCommand>[0]
  | Parameters<typeof handleItemCommand>[0]
  | Parameters<typeof handleTaskCommand>[0]
  | Parameters<typeof handleProjectCommand>[0]
  | Parameters<typeof handleResourceCommand>[0]
  | Parameters<typeof handleBalanceRuleCommand>[0];

const CATEGORY_COMMANDS = new Set(['CreateCategory', 'UpdateCategory', 'DeleteCategory']);
const ITEM_COMMANDS = new Set(['CreateItem', 'MarkItemAvailable', 'MarkItemConsumed', 'MarkItemAvailableAgain']);
const TASK_COMMANDS = new Set(['CreateTask', 'StartTask', 'CompleteTask', 'PromoteToProject', 'AddItemRequirement', 'AttachResourceToTask', 'DetachResourceFromTask', 'SetTaskRecurrence', 'SkipRecurrence', 'ScheduleTask']);
const PROJECT_COMMANDS = new Set(['CreateProject', 'AddTaskToProject', 'CompleteProject']);
const RESOURCE_COMMANDS = new Set(['CreateResource', 'UpdateResource', 'DeleteResource']);
const BALANCE_RULE_COMMANDS = new Set(['CreateBalanceRule', 'UpdateBalanceRule', 'DeleteBalanceRule']);

function getAggregateId(command: AnyCommand): string {
  const p = command.payload as Record<string, string>;
  return p.id ?? p.taskId ?? p.projectId ?? p.resourceId;
}

export class CommandBus {
  constructor(private eventStore: EventStore, private pool: Pool) {}

  async dispatch(command: AnyCommand): Promise<StoredEvent[]> {
    const aggregateId = getAggregateId(command);
    const history = await this.eventStore.getEvents(aggregateId);
    const expectedVersion = history.length > 0 ? history[history.length - 1].version : 0;

    let newEvents: ReturnType<typeof handleCategoryCommand>;

    if (CATEGORY_COMMANDS.has(command.type)) {
      newEvents = handleCategoryCommand(command as Parameters<typeof handleCategoryCommand>[0], history);
    } else if (ITEM_COMMANDS.has(command.type)) {
      newEvents = handleItemCommand(command as Parameters<typeof handleItemCommand>[0], history);
    } else if (TASK_COMMANDS.has(command.type)) {
      newEvents = handleTaskCommand(command as Parameters<typeof handleTaskCommand>[0], history);
    } else if (PROJECT_COMMANDS.has(command.type)) {
      newEvents = handleProjectCommand(command as Parameters<typeof handleProjectCommand>[0], history);
    } else if (RESOURCE_COMMANDS.has(command.type)) {
      newEvents = handleResourceCommand(command as Parameters<typeof handleResourceCommand>[0], history);
    } else if (BALANCE_RULE_COMMANDS.has(command.type)) {
      newEvents = handleBalanceRuleCommand(command as Parameters<typeof handleBalanceRuleCommand>[0], history);
    } else {
      throw new Error(`Unknown command type: ${(command as { type: string }).type}`);
    }

    const stored = await this.eventStore.append(newEvents as Parameters<typeof this.eventStore.append>[0], expectedVersion);
    await runProjectors(stored, this.pool);
    return stored;
  }
}
