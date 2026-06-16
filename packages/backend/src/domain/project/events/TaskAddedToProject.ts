import { DomainEvent } from '../../shared/DomainEvent';
import type { AddTaskToProject } from '../commands/AddTaskToProject';

export class TaskAddedToProject extends DomainEvent {
  constructor(readonly payload: AddTaskToProject['payload']) {
    super('TaskAddedToProject', payload.projectId, 'project', payload as unknown as Record<string, unknown>);
  }
}
