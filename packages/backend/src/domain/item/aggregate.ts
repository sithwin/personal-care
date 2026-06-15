import { type DomainEvent } from '../../types';
import { type ItemCommand, type ItemState, type CreateItemPayload, type MarkItemPayload } from './types';

type ItemEvent =
  | { eventType: 'ItemCreated'; payload: CreateItemPayload & { status: 'to_buy' } }
  | { eventType: 'ItemMarkedAvailable'; payload: MarkItemPayload }
  | { eventType: 'ItemMarkedConsumed'; payload: MarkItemPayload }
  | { eventType: 'ItemMarkedAvailableAgain'; payload: MarkItemPayload };

function reconstruct(history: Pick<DomainEvent, 'eventType' | 'payload'>[]): ItemState | null {
  let state: ItemState | null = null;
  for (const raw of history) {
    const e = raw as ItemEvent;
    if (e.eventType === 'ItemCreated') {
      state = { id: e.payload.id, name: e.payload.name, categoryId: e.payload.categoryId, status: 'to_buy' };
    } else if (state !== null) {
      const s = state as ItemState;
      if (e.eventType === 'ItemMarkedAvailable' || e.eventType === 'ItemMarkedAvailableAgain') {
        state = { ...s, status: 'available' };
      } else if (e.eventType === 'ItemMarkedConsumed') {
        state = { ...s, status: 'consumed' };
      }
    }
  }
  return state;
}

export function handleItemCommand(
  command: ItemCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[],
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'item';

  switch (command.type) {
    case 'CreateItem':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemCreated', payload: { ...command.payload, status: 'to_buy' } }];

    case 'MarkItemAvailable': {
      if (state === null) throw new Error('Item not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedAvailable', payload: command.payload }];
    }

    case 'MarkItemConsumed': {
      if (state === null || state.status !== 'available') throw new Error('Item must be available to consume');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedConsumed', payload: command.payload }];
    }

    case 'MarkItemAvailableAgain': {
      if (state === null) throw new Error('Item not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedAvailableAgain', payload: command.payload }];
    }

    default: {
      const _exhaustive: never = command;
      throw new Error(`Unhandled command type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}
