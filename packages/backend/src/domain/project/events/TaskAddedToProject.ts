import { DomainEvent } from '../../shared/DomainEvent';
import type { AddTaskToProjectCommand } from '../commands/AddTaskToProjectCommand';

export class TaskAddedToProject extends DomainEvent {
  constructor(readonly payload: AddTaskToProjectCommand['payload']) {
    super('TaskAddedToProject', payload.projectId, 'project', payload as unknown as Record<string, unknown>);
  }
}
