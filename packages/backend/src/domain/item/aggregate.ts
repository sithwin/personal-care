import { DomainEvent } from '../../types';
import { ItemCommand, ItemState } from './types';

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): ItemState | null {
  let state: ItemState | null = null;
  for (const e of events) {
    if (e.eventType === 'ItemCreated') state = { ...(e.payload as ItemState) };
    else if (state) {
      if (e.eventType === 'ItemMarkedAvailable' || e.eventType === 'ItemMarkedAvailableAgain') state.status = 'available';
      else if (e.eventType === 'ItemMarkedConsumed') state.status = 'consumed';
    }
  }
  return state;
}

export function handleItemCommand(
  command: ItemCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'item';

  switch (command.type) {
    case 'CreateItem':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemCreated', payload: { ...command.payload, status: 'to_buy' } }];
    case 'MarkItemAvailable': {
      if (!state) throw new Error('Item not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedAvailable', payload: command.payload }];
    }
    case 'MarkItemConsumed': {
      if (!state || state.status !== 'available') throw new Error('Item must be available to consume');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedConsumed', payload: command.payload }];
    }
    case 'MarkItemAvailableAgain': {
      if (!state) throw new Error('Item not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedAvailableAgain', payload: command.payload }];
    }
  }
}
