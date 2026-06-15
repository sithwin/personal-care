import { type DomainEvent } from '../../types';
import {
  type CategoryCommand,
  type CategoryState,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
  type DeleteCategoryPayload,
} from './types';

// Typed representation of events this aggregate emits and replays.
// A single boundary cast (raw as CategoryEvent) keeps all subsequent
// reconstruct logic free of unsafe assertions.
type CategoryEvent =
  | { eventType: 'CategoryCreated'; payload: CreateCategoryPayload }
  | { eventType: 'CategoryUpdated'; payload: UpdateCategoryPayload }
  | { eventType: 'CategoryDeleted'; payload: DeleteCategoryPayload };

function reconstruct(history: Pick<DomainEvent, 'eventType' | 'payload'>[]): CategoryState | null {
  let state: CategoryState | null = null;
  for (const raw of history) {
    const e = raw as CategoryEvent;
    if (e.eventType === 'CategoryCreated') {
      state = { ...e.payload, deleted: false };
    } else if (e.eventType === 'CategoryUpdated' && state !== null) {
      state = { ...(state as CategoryState), ...e.payload };
    } else if (e.eventType === 'CategoryDeleted' && state !== null) {
      state = { ...(state as CategoryState), deleted: true };
    }
  }
  return state;
}

export function handleCategoryCommand(
  command: CategoryCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[],
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'category';

  switch (command.type) {
    case 'CreateCategory':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryCreated', payload: command.payload }];

    case 'UpdateCategory': {
      if (state === null || state.deleted) throw new Error('Category not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryUpdated', payload: command.payload }];
    }

    case 'DeleteCategory': {
      if (state === null || state.deleted) throw new Error('Category not found');
      if (state.isDefault) throw new Error('Cannot delete built-in category');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryDeleted', payload: command.payload }];
    }

    default: {
      const _exhaustive: never = command;
      throw new Error(`Unhandled command type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}
