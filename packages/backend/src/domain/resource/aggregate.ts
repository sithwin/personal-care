import { DomainEvent } from '../../types';
import { ResourceCommand } from './types';

export function handleResourceCommand(
  command: ResourceCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const aggregateType = 'resource';
  const exists = history.some(e => e.eventType === 'ResourceCreated');

  switch (command.type) {
    case 'CreateResource':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ResourceCreated', payload: command.payload }];
    case 'UpdateResource':
      if (!exists) throw new Error('Resource not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ResourceUpdated', payload: command.payload }];
    case 'DeleteResource':
      if (!exists) throw new Error('Resource not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ResourceDeleted', payload: command.payload }];
  }
}
