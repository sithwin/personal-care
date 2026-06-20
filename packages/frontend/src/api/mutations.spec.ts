import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchJSON } from './client';

vi.mock('./client', () => ({ fetchJSON: vi.fn() }));

const mocked = () => vi.mocked(fetchJSON);

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
describe('createCategory', () => {
  it('sends POST /categories and returns the new id', async () => {
    mocked().mockResolvedValue({ id: 'cat-1' });
    const { createCategory } = await import('./mutations');
    const result = await createCategory({ name: 'Health', icon: '💊', color: '#ef4444', isDefault: false });
    expect(mocked()).toHaveBeenCalledWith('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Health', icon: '💊', color: '#ef4444', isDefault: false }),
    });
    expect(result).toEqual({ id: 'cat-1' });
  });
});

describe('updateCategory', () => {
  it('sends PATCH /categories/:id with body', async () => {
    mocked().mockResolvedValue(undefined);
    const { updateCategory } = await import('./mutations');
    await updateCategory('cat-1', { name: 'Fitness' });
    expect(mocked()).toHaveBeenCalledWith('/categories/cat-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Fitness' }),
    });
  });
});

describe('deleteCategory', () => {
  it('sends DELETE /categories/:id with no body', async () => {
    mocked().mockResolvedValue(undefined);
    const { deleteCategory } = await import('./mutations');
    await deleteCategory('cat-1');
    expect(mocked()).toHaveBeenCalledWith('/categories/cat-1', { method: 'DELETE' });
  });
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
describe('createTask', () => {
  it('sends POST /tasks and returns the new id', async () => {
    mocked().mockResolvedValue({ id: 'task-1' });
    const { createTask } = await import('./mutations');
    const result = await createTask({ name: 'Workout', categoryId: 'cat-1' });
    expect(mocked()).toHaveBeenCalledWith('/tasks', {
      method: 'POST',
      body: JSON.stringify({ name: 'Workout', categoryId: 'cat-1' }),
    });
    expect(result).toEqual({ id: 'task-1' });
  });
});

describe('updateTask', () => {
  it('sends PATCH /tasks/:id with body', async () => {
    mocked().mockResolvedValue(undefined);
    const { updateTask } = await import('./mutations');
    await updateTask('task-1', { name: 'Run' });
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Run' }),
    });
  });
});

describe('startTask', () => {
  it('sends POST /tasks/:id/start with no body', async () => {
    mocked().mockResolvedValue(undefined);
    const { startTask } = await import('./mutations');
    await startTask('task-1');
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1/start', { method: 'POST' });
  });
});

describe('completeTask', () => {
  it('sends POST /tasks/:id/complete with itemDisposals body', async () => {
    mocked().mockResolvedValue(undefined);
    const { completeTask } = await import('./mutations');
    await completeTask('task-1', { itemDisposals: [] });
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1/complete', {
      method: 'POST',
      body: JSON.stringify({ itemDisposals: [] }),
    });
  });
});

describe('scheduleTask', () => {
  it('sends POST /tasks/:id/schedule with date and time', async () => {
    mocked().mockResolvedValue(undefined);
    const { scheduleTask } = await import('./mutations');
    await scheduleTask('task-1', { scheduledDate: '2026-06-21', scheduledStartTime: '09:00' });
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1/schedule', {
      method: 'POST',
      body: JSON.stringify({ scheduledDate: '2026-06-21', scheduledStartTime: '09:00' }),
    });
  });
});

describe('addItemRequirement', () => {
  it('sends POST /tasks/:taskId/items/:itemId with consumable body', async () => {
    mocked().mockResolvedValue(undefined);
    const { addItemRequirement } = await import('./mutations');
    await addItemRequirement('task-1', 'item-1', { consumable: true });
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1/items/item-1', {
      method: 'POST',
      body: JSON.stringify({ consumable: true }),
    });
  });
});

describe('removeItemRequirement', () => {
  it('sends DELETE /tasks/:taskId/items/:itemId', async () => {
    mocked().mockResolvedValue(undefined);
    const { removeItemRequirement } = await import('./mutations');
    await removeItemRequirement('task-1', 'item-1');
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1/items/item-1', { method: 'DELETE' });
  });
});

describe('attachResourceToTask', () => {
  it('sends POST /tasks/:taskId/resources/:resourceId', async () => {
    mocked().mockResolvedValue(undefined);
    const { attachResourceToTask } = await import('./mutations');
    await attachResourceToTask('task-1', 'res-1');
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1/resources/res-1', { method: 'POST' });
  });
});

describe('detachResourceFromTask', () => {
  it('sends DELETE /tasks/:taskId/resources/:resourceId', async () => {
    mocked().mockResolvedValue(undefined);
    const { detachResourceFromTask } = await import('./mutations');
    await detachResourceFromTask('task-1', 'res-1');
    expect(mocked()).toHaveBeenCalledWith('/tasks/task-1/resources/res-1', { method: 'DELETE' });
  });
});

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
describe('createItem', () => {
  it('sends POST /items and returns the new id', async () => {
    mocked().mockResolvedValue({ id: 'item-1' });
    const { createItem } = await import('./mutations');
    const result = await createItem({ name: 'Whey protein', categoryId: 'cat-1' });
    expect(mocked()).toHaveBeenCalledWith('/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Whey protein', categoryId: 'cat-1' }),
    });
    expect(result).toEqual({ id: 'item-1' });
  });
});

describe('markItemAvailable', () => {
  it('sends POST /items/:id/available', async () => {
    mocked().mockResolvedValue(undefined);
    const { markItemAvailable } = await import('./mutations');
    await markItemAvailable('item-1');
    expect(mocked()).toHaveBeenCalledWith('/items/item-1/available', { method: 'POST' });
  });
});

describe('markItemConsumed', () => {
  it('sends POST /items/:id/consumed', async () => {
    mocked().mockResolvedValue(undefined);
    const { markItemConsumed } = await import('./mutations');
    await markItemConsumed('item-1');
    expect(mocked()).toHaveBeenCalledWith('/items/item-1/consumed', { method: 'POST' });
  });
});

describe('markItemAvailableAgain', () => {
  it('sends POST /items/:id/available-again', async () => {
    mocked().mockResolvedValue(undefined);
    const { markItemAvailableAgain } = await import('./mutations');
    await markItemAvailableAgain('item-1');
    expect(mocked()).toHaveBeenCalledWith('/items/item-1/available-again', { method: 'POST' });
  });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
describe('createProject', () => {
  it('sends POST /projects and returns the new id', async () => {
    mocked().mockResolvedValue({ id: 'proj-1' });
    const { createProject } = await import('./mutations');
    const result = await createProject({ name: 'Get fit', categoryId: 'cat-1' });
    expect(mocked()).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Get fit', categoryId: 'cat-1' }),
    });
    expect(result).toEqual({ id: 'proj-1' });
  });
});

describe('updateProject', () => {
  it('sends PATCH /projects/:id with body', async () => {
    mocked().mockResolvedValue(undefined);
    const { updateProject } = await import('./mutations');
    await updateProject('proj-1', { priority: 'high' });
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1', {
      method: 'PATCH',
      body: JSON.stringify({ priority: 'high' }),
    });
  });
});

describe('planProject', () => {
  it('sends POST /projects/:id/plan with dates', async () => {
    mocked().mockResolvedValue(undefined);
    const { planProject } = await import('./mutations');
    await planProject('proj-1', { startDate: '2026-07-01', endDate: '2026-07-31' });
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1/plan', {
      method: 'POST',
      body: JSON.stringify({ startDate: '2026-07-01', endDate: '2026-07-31' }),
    });
  });
});

describe('startProject', () => {
  it('sends POST /projects/:id/start with no body when no endDate', async () => {
    mocked().mockResolvedValue(undefined);
    const { startProject } = await import('./mutations');
    await startProject('proj-1');
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1/start', { method: 'POST' });
  });

  it('sends POST /projects/:id/start with endDate body when provided', async () => {
    mocked().mockResolvedValue(undefined);
    const { startProject } = await import('./mutations');
    await startProject('proj-1', { endDate: '2026-07-31' });
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1/start', {
      method: 'POST',
      body: JSON.stringify({ endDate: '2026-07-31' }),
    });
  });
});

describe('pauseProject', () => {
  it('sends POST /projects/:id/pause with no body', async () => {
    mocked().mockResolvedValue(undefined);
    const { pauseProject } = await import('./mutations');
    await pauseProject('proj-1');
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1/pause', { method: 'POST' });
  });
});

describe('resumeProject', () => {
  it('sends POST /projects/:id/resume with no body', async () => {
    mocked().mockResolvedValue(undefined);
    const { resumeProject } = await import('./mutations');
    await resumeProject('proj-1');
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1/resume', { method: 'POST' });
  });
});

describe('completeProject', () => {
  it('sends POST /projects/:id/complete with no body', async () => {
    mocked().mockResolvedValue(undefined);
    const { completeProject } = await import('./mutations');
    await completeProject('proj-1');
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1/complete', { method: 'POST' });
  });
});

describe('addTaskToProject', () => {
  it('sends POST /projects/:projectId/tasks/:taskId', async () => {
    mocked().mockResolvedValue(undefined);
    const { addTaskToProject } = await import('./mutations');
    await addTaskToProject('proj-1', 'task-1');
    expect(mocked()).toHaveBeenCalledWith('/projects/proj-1/tasks/task-1', { method: 'POST' });
  });
});

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
describe('createResource', () => {
  it('sends POST /resources and returns the new id', async () => {
    mocked().mockResolvedValue({ id: 'res-1' });
    const { createResource } = await import('./mutations');
    const result = await createResource({ title: 'Article', type: 'link', url: 'https://example.com' });
    expect(mocked()).toHaveBeenCalledWith('/resources', {
      method: 'POST',
      body: JSON.stringify({ title: 'Article', type: 'link', url: 'https://example.com' }),
    });
    expect(result).toEqual({ id: 'res-1' });
  });
});
