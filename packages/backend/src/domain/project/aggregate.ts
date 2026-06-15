import { DomainEvent } from '../../types';
import { ProjectCommand, ProjectState } from './types';

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): ProjectState | null {
  let state: ProjectState | null = null;
  for (const e of events) {
    const p = e.payload as Record<string, unknown>;
    if (e.eventType === 'ProjectCreated') state = { id: p.id as string, name: p.name as string, status: 'active', taskIds: [] };
    else if (state) {
      if (e.eventType === 'TaskAddedToProject') state.taskIds.push(p.taskId as string);
      else if (e.eventType === 'ProjectCompleted') state.status = 'done';
    }
  }
  return state;
}

export function handleProjectCommand(
  command: ProjectCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'project';

  switch (command.type) {
    case 'CreateProject':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ProjectCreated', payload: command.payload }];
    case 'AddTaskToProject':
      if (!state) throw new Error('Project not found');
      return [{ aggregateId: command.payload.projectId, aggregateType, eventType: 'TaskAddedToProject', payload: command.payload }];
    case 'CompleteProject':
      if (!state) throw new Error('Project not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ProjectCompleted', payload: command.payload }];
  }
}
