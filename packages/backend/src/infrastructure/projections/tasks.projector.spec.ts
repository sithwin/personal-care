import { describe, it, expect, beforeEach } from 'vitest';
import { createTasksProjector } from './tasks.projector';
import { InMemoryTaskViewRepository } from '../__test__/repositoryMock/InMemoryTaskViewRepository';
import { InMemoryItemViewRepository } from '../__test__/repositoryMock/InMemoryItemViewRepository';
import { InMemoryCategoryViewRepository } from '../__test__/repositoryMock/InMemoryCategoryViewRepository';

const CAT_ID  = '00000000-0000-0000-0000-000000000001';
const TASK_ID = '00000000-0000-0000-0000-000000000002';
const ITEM_ID = '00000000-0000-0000-0000-000000000003';

let taskRepo: InMemoryTaskViewRepository;
let itemRepo: InMemoryItemViewRepository;
let tasksProjector: ReturnType<typeof createTasksProjector>;

beforeEach(async () => {
  taskRepo = new InMemoryTaskViewRepository();
  itemRepo = new InMemoryItemViewRepository();
  const categoryRepo = new InMemoryCategoryViewRepository();
  await categoryRepo.insert({ id: CAT_ID, name: 'Cars', icon: '🚗', color: '#3b82f6', isDefault: false });
  tasksProjector = createTasksProjector(taskRepo, itemRepo);
});

describe('Tasks projector', () => {
  it('TaskCreated inserts task with status ready', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    expect(taskRepo.getTask(TASK_ID)?.name).toBe('Oil change');
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('ready');
  });

  it('TaskStarted sets status to ongoing', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskStarted', payload: { id: TASK_ID }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('ongoing');
  });

  it('TaskCompleted sets status to done for non-recurring', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: TASK_ID, itemDisposals: [] }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('done');
  });

  it('TaskRescheduled resets task to planned with new due date', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: TASK_ID, itemDisposals: [] }, version: 2, createdAt: new Date() });
    const nextDueDate = new Date('2027-06-14').toISOString();
    await tasksProjector({ id: 3, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskRescheduled', payload: { id: TASK_ID, nextDueDate }, version: 3, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('planned');
    expect(taskRepo.getTask(TASK_ID)?.completionCount).toBe(1);
  });

  it('ItemRequirementAdded inserts into task_items_view and sets task to pending', async () => {
    await itemRepo.insert({ id: ITEM_ID, name: 'Solar light', description: null, categoryId: CAT_ID, quantity: null, price: null, notes: null });
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Set up solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: TASK_ID, itemId: ITEM_ID, consumable: true }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('pending');
  });
});
