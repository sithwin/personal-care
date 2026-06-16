import { DomainEvent } from '../../shared/DomainEvent';
import type { AddItemRequirementCommand } from '../commands/AddItemRequirementCommand';

export class ItemRequirementAdded extends DomainEvent {
  constructor(readonly payload: AddItemRequirementCommand['payload']) {
    super('ItemRequirementAdded', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
