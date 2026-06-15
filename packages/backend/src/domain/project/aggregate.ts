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
    const e = raw as ProjectEvent;
    if (e.eventType === 'ProjectCreated') {
      state = { id: e.payload.id, name: e.payload.name, status: 'active', taskIds: [] };
    } else if (state !== null) {
      const s = state as ProjectState;
      if (e.eventType === 'TaskAddedToProject') {
        state = { ...s, taskIds: [...s.taskIds, e.payload.taskId] };
      } else if (e.eventType === 'ProjectCompleted') {
        state = { ...s, status: 'done' };
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
      const _exhaustive: never = command;
      throw new Error(`Unhandled command type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}
