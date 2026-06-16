import { describe, it, expect } from 'vitest';
import { Project } from './Project';
import { ProjectCreated } from './events/ProjectCreated';
import { TaskAddedToProject } from './events/TaskAddedToProject';
import { ProjectCompleted } from './events/ProjectCompleted';
import type { StoredEvent } from '../../types';

function toStoredEvent(event: ProjectCreated | TaskAddedToProject | ProjectCompleted, id: number): StoredEvent {
  return {
    id,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    eventType: event.eventType,
    payload: event.payload,
    version: id,
    createdAt: new Date(),
  };
}

describe('Project', () => {
  describe('reconstruct', () => {
    it('returns null for empty history', () => {
      expect(Project.reconstruct([])).toBeNull();
    });

    it('builds state from history', () => {
      const created = new ProjectCreated({ id: 'p1', name: 'Renovate kitchen', categoryId: 'cat1' });
      const taskAdded = new TaskAddedToProject({ projectId: 'p1', taskId: 't1' });
      const history = [toStoredEvent(created, 1), toStoredEvent(taskAdded, 2)];

      const project = Project.reconstruct(history);

      expect(project).not.toBeNull();
    });
  });

  describe('create', () => {
    it('creates a ProjectCreated event', () => {
      const event = Project.create({
        type: 'CreateProjectCommand',
        payload: { id: 'p1', name: 'Renovate kitchen', categoryId: 'cat1' },
      });

      expect(event).toBeInstanceOf(ProjectCreated);
      expect(event.payload).toEqual({ id: 'p1', name: 'Renovate kitchen', categoryId: 'cat1' });
    });
  });

  describe('addTask', () => {
    it('adds a task to an active project', () => {
      const created = new ProjectCreated({ id: 'p1', name: 'Renovate kitchen', categoryId: 'cat1' });
      const project = Project.reconstruct([toStoredEvent(created, 1)]);

      const event = project?.addTask({ type: 'AddTaskToProjectCommand', payload: { projectId: 'p1', taskId: 't1' } });

      expect(event).toBeInstanceOf(TaskAddedToProject);
      expect(event?.payload).toEqual({ projectId: 'p1', taskId: 't1' });
    });
  });

  describe('complete', () => {
    it('completes an active project', () => {
      const created = new ProjectCreated({ id: 'p1', name: 'Renovate kitchen', categoryId: 'cat1' });
      const project = Project.reconstruct([toStoredEvent(created, 1)]);

      const event = project?.complete({ type: 'CompleteProjectCommand', payload: { id: 'p1' } });

      expect(event).toBeInstanceOf(ProjectCompleted);
    });
  });
});
