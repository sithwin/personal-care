import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateProject } from '../commands/CreateProject';

export class ProjectCreated extends DomainEvent {
  constructor(readonly payload: CreateProject['payload']) {
    super('ProjectCreated', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
