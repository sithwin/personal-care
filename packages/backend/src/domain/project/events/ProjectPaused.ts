import { DomainEvent } from '../../shared/DomainEvent';
import type { PauseProjectCommand } from '../commands/PauseProjectCommand';
export class ProjectPaused extends DomainEvent {
  constructor(readonly payload: PauseProjectCommand['payload']) {
    super('ProjectPaused', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
