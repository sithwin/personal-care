import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTasksSearchProjector } from './tasks-search.projector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import type { StoredEvent } from '../../types';

const TASK_ID = '00000000-0000-0000-0000-000000000001';
const CAT_ID  = '00000000-0000-0000-0000-000000000002';

function makeEvent(eventType: string, payload: Record<string, unknown>): StoredEvent {
  return { id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType, payload, version: 1, createdAt: new Date() };
}

describe('tasks-search projector', () => {
  let indexer: ISearchIndexer;
  let projector: ReturnType<typeof createTasksSearchProjector>;

  beforeEach(() => {
    indexer = { ensureIndex: vi.fn(), upsert: vi.fn(), patch: vi.fn(), delete: vi.fn(), bootstrap: vi.fn(), getDocumentCount: vi.fn() };
    projector = createTasksSearchProjector(indexer);
  });

  it('TaskCreated upserts a task document', async () => {
    await projector(makeEvent('TaskCreated', { id: TASK_ID, name: 'Fix sink', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `task-${TASK_ID}`,
      entityId: TASK_ID,
      type: 'task',
      name: 'Fix sink',
      description: null,
      status: 'ready',
      categoryId: CAT_ID,
    });
  });

  it('TaskUpdated upserts with new name and description', async () => {
    await projector(makeEvent('TaskUpdated', { id: TASK_ID, name: 'Fixed sink', description: 'Done', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `task-${TASK_ID}`,
      entityId: TASK_ID,
      type: 'task',
      name: 'Fixed sink',
      description: 'Done',
      status: null,
      categoryId: CAT_ID,
    });
  });

  it('TaskStarted patches status to ongoing', async () => {
    await projector(makeEvent('TaskStarted', { id: TASK_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`task-${TASK_ID}`, { status: 'ongoing' });
  });

  it('TaskCompleted patches status to done', async () => {
    await projector(makeEvent('TaskCompleted', { id: TASK_ID, itemDisposals: [] }));
    expect(indexer.patch).toHaveBeenCalledWith(`task-${TASK_ID}`, { status: 'done' });
  });

  it('ignores unrelated events', async () => {
    await projector(makeEvent('ProjectCreated', { id: TASK_ID }));
    expect(indexer.upsert).not.toHaveBeenCalled();
    expect(indexer.patch).not.toHaveBeenCalled();
  });
});
