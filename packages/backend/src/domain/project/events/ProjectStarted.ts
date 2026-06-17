import { DomainEvent } from '../../shared/DomainEvent';
import type { StartProjectCommand } from '../commands/StartProjectCommand';
export class ProjectStarted extends DomainEvent {
  constructor(readonly payload: StartProjectCommand['payload']) {
    super('ProjectStarted', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
