import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateProjectCommand } from '../commands/UpdateProjectCommand';
export class ProjectUpdated extends DomainEvent {
  constructor(readonly payload: UpdateProjectCommand['payload']) {
    super('ProjectUpdated', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
