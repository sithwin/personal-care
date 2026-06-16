import { DomainEvent } from '../../shared/DomainEvent';
import type { AddItemRequirement } from '../commands/AddItemRequirement';

export class ItemRequirementAdded extends DomainEvent {
  constructor(readonly payload: AddItemRequirement['payload']) {
    super('ItemRequirementAdded', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
