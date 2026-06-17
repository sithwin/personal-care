import { DomainEvent } from '../../shared/DomainEvent';
import type { PlanProjectCommand } from '../commands/PlanProjectCommand';
export class ProjectPlanned extends DomainEvent {
  constructor(readonly payload: PlanProjectCommand['payload']) {
    super('ProjectPlanned', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
