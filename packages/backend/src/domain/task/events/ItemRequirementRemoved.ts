import { DomainEvent } from '../../shared/DomainEvent';
import type { RemoveItemRequirementCommand } from '../commands/RemoveItemRequirementCommand';

export class ItemRequirementRemoved extends DomainEvent {
  constructor(readonly payload: RemoveItemRequirementCommand['payload']) {
    super('ItemRequirementRemoved', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
