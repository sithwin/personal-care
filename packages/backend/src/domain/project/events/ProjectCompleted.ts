import { DomainEvent } from '../../shared/DomainEvent';
import type { CompleteProject } from '../commands/CompleteProject';

export class ProjectCompleted extends DomainEvent {
  constructor(readonly payload: CompleteProject['payload']) {
    super('ProjectCompleted', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
