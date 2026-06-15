import { describe, it, expect } from 'vitest';
import { handleProjectCommand } from './aggregate';

describe('Project aggregate', () => {
  it('CreateProject emits ProjectCreated', () => {
    const events = handleProjectCommand({ type: 'CreateProject', payload: { id: 'p-1', name: 'Home reno', categoryId: 'cat-1' } }, []);
    expect(events[0].eventType).toBe('ProjectCreated');
  });

  it('AddTaskToProject emits TaskAddedToProject', () => {
    const history = [{ eventType: 'ProjectCreated', payload: { id: 'p-1', name: 'Home reno', categoryId: 'cat-1' } }];
    const events = handleProjectCommand({ type: 'AddTaskToProject', payload: { projectId: 'p-1', taskId: 'task-1' } }, history);
    expect(events[0].eventType).toBe('TaskAddedToProject');
  });

  it('CompleteProject emits ProjectCompleted', () => {
    const history = [{ eventType: 'ProjectCreated', payload: { id: 'p-1', name: 'Home reno', categoryId: 'cat-1' } }];
    const events = handleProjectCommand({ type: 'CompleteProject', payload: { id: 'p-1' } }, history);
    expect(events[0].eventType).toBe('ProjectCompleted');
  });
});
