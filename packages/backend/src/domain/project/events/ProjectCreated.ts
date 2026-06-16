import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateProjectCommand } from '../commands/CreateProjectCommand';

export class ProjectCreated extends DomainEvent {
  constructor(readonly payload: CreateProjectCommand['payload']) {
    super('ProjectCreated', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
