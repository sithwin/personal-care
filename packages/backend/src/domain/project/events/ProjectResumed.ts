import { DomainEvent } from '../../shared/DomainEvent';
import type { ResumeProjectCommand } from '../commands/ResumeProjectCommand';
export class ProjectResumed extends DomainEvent {
  constructor(readonly payload: ResumeProjectCommand['payload']) {
    super('ProjectResumed', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
