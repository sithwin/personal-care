import { DomainEvent } from '../../shared/DomainEvent';
import type { CompleteProjectCommand } from '../commands/CompleteProjectCommand';

export class ProjectCompleted extends DomainEvent {
  constructor(readonly payload: CompleteProjectCommand['payload']) {
    super('ProjectCompleted', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
