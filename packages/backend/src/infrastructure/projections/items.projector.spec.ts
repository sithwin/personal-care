import { describe, it, expect, beforeEach } from 'vitest';
import { createItemsProjector } from './items.projector';
import { createTasksProjector } from './tasks.projector';
import { InMemoryTaskViewRepository } from '../__test__/repositoryMock/InMemoryTaskViewRepository';
import { InMemoryItemViewRepository } from '../__test__/repositoryMock/InMemoryItemViewRepository';
import { InMemoryCategoryViewRepository } from '../__test__/repositoryMock/InMemoryCategoryViewRepository';

const CAT_ID  = '00000000-0000-0000-0000-000000000001';
const TASK_ID = '00000000-0000-0000-0000-000000000002';
const ITEM_ID = '00000000-0000-0000-0000-000000000003';

let taskRepo: InMemoryTaskViewRepository;
let itemRepo: InMemoryItemViewRepository;
let itemsProjector: ReturnType<typeof createItemsProjector>;
let tasksProjector: ReturnType<typeof createTasksProjector>;

beforeEach(async () => {
  taskRepo = new InMemoryTaskViewRepository();
  itemRepo = new InMemoryItemViewRepository();
  const categoryRepo = new InMemoryCategoryViewRepository();
  await categoryRepo.insert({ id: CAT_ID, name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false });
  itemsProjector = createItemsProjector(itemRepo, taskRepo);
  tasksProjector = createTasksProjector(taskRepo, itemRepo);
});

describe('Items projector', () => {
  it('ItemCreated inserts item with status to_buy', async () => {
    await itemsProjector({ id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemCreated', payload: { id: ITEM_ID, name: 'Solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    expect(itemRepo.getItem(ITEM_ID)?.status).toBe('to_buy');
  });

  it('MarkItemAvailable updates item and unblocks tasks', async () => {
    await itemsProjector({ id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemCreated', payload: { id: ITEM_ID, name: 'Solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Set up solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 3, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: TASK_ID, itemId: ITEM_ID, consumable: true }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('pending');
    await itemsProjector({ id: 4, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemMarkedAvailable', payload: { id: ITEM_ID }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('ready');
  });
});
