import { type DomainEvent } from '../../types';
import {
  type ProjectCommand,
  type ProjectState,
  type CreateProjectPayload,
  type AddTaskToProjectPayload,
  type CompleteProjectPayload,
} from './types';

type ProjectEvent =
  | { eventType: 'ProjectCreated'; payload: CreateProjectPayload }
  | { eventType: 'TaskAddedToProject'; payload: AddTaskToProjectPayload }
  | { eventType: 'ProjectCompleted'; payload: CompleteProjectPayload };

function reconstruct(history: Pick<DomainEvent, 'eventType' | 'payload'>[]): ProjectState | null {
  let state: ProjectState | null = null;
  for (const raw of history) {
    const event = raw as ProjectEvent;
    if (event.eventType === 'ProjectCreated') {
      state = { id: event.payload.id, name: event.payload.name, status: 'active', taskIds: [] };
    } else if (state !== null) {
      const current = state as ProjectState;
      if (event.eventType === 'TaskAddedToProject') {
        state = { ...current, taskIds: [...current.taskIds, event.payload.taskId] };
      } else if (event.eventType === 'ProjectCompleted') {
        state = { ...current, status: 'done' };
      }
    }
  }
  return state;
}

export function handleProjectCommand(
  command: ProjectCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[],
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'project';

  switch (command.type) {
    case 'CreateProject':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ProjectCreated', payload: command.payload }];

    case 'AddTaskToProject': {
      if (state === null) throw new Error('Project not found');
      return [{ aggregateId: command.payload.projectId, aggregateType, eventType: 'TaskAddedToProject', payload: command.payload }];
    }

    case 'CompleteProject': {
      if (state === null) throw new Error('Project not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ProjectCompleted', payload: command.payload }];
    }

    default: {
      const exhaustive: never = command;
      throw new Error(`Unhandled command type: ${(exhaustive as { type: string }).type}`);
    }
  }
}
