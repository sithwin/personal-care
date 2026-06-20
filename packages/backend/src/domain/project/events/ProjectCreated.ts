import { DomainEvent } from '../../shared/DomainEvent';
import type { UUID } from '../../../types';
import type { CreateProjectCommand } from '../commands/CreateProjectCommand';

export class ProjectCreated extends DomainEvent {
  constructor(aggregateId: UUID, payload: CreateProjectCommand['payload']) {
    super('ProjectCreated', aggregateId, 'project', payload as unknown as Record<string, unknown>);
  }
}
