import { type DomainEvent } from '../../types';
import { type CategoryCommand, type CategoryState } from './types';

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): CategoryState | null {
  let state: CategoryState | null = null;
  for (const e of events) {
    if (e.eventType === 'CategoryCreated') {
      state = { ...(e.payload as CategoryState), deleted: false };
    } else if (e.eventType === 'CategoryUpdated' && state) {
      Object.assign(state, e.payload);
    } else if (e.eventType === 'CategoryDeleted' && state) {
      state.deleted = true;
    }
  }
  return state;
}

export function handleCategoryCommand(
  command: CategoryCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'category';

  switch (command.type) {
    case 'CreateCategory':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryCreated', payload: command.payload }];

    case 'UpdateCategory': {
      if (!state || state.deleted) throw new Error('Category not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryUpdated', payload: command.payload }];
    }

    case 'DeleteCategory': {
      if (!state || state.deleted) throw new Error('Category not found');
      if (state.isDefault) throw new Error('Cannot delete built-in category');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryDeleted', payload: command.payload }];
    }

    default: {
      const _exhaustive: never = command;
      throw new Error(`Unhandled command type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}
