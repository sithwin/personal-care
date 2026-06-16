import type { StoredEvent, UUID } from '../../types';
import type { CreateProject } from './commands/CreateProject';
import type { AddTaskToProject } from './commands/AddTaskToProject';
import type { CompleteProject } from './commands/CompleteProject';
import { ProjectCreated } from './events/ProjectCreated';
import { TaskAddedToProject } from './events/TaskAddedToProject';
import { ProjectCompleted } from './events/ProjectCompleted';

interface ProjectState {
  readonly id: UUID;
  readonly name: string;
  readonly status: 'active' | 'on_hold' | 'done';
  readonly taskIds: UUID[];
}

export class Project {
  private constructor(private readonly state: ProjectState) {}

  static reconstruct(history: StoredEvent[]): Project | null {
    let state: ProjectState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'ProjectCreated') {
        state = { id: payload.id as UUID, name: payload.name as string, status: 'active', taskIds: [] };
      } else if (state !== null && event.eventType === 'TaskAddedToProject') {
        state = { ...state, taskIds: [...state.taskIds, payload.taskId as UUID] };
      } else if (state !== null && event.eventType === 'ProjectCompleted') {
        state = { ...state, status: 'done' };
      }
    }
    return state !== null ? new Project(state) : null;
  }

  static create(cmd: CreateProject): ProjectCreated {
    return new ProjectCreated(cmd.payload);
  }

  addTask(cmd: AddTaskToProject): TaskAddedToProject {
    return new TaskAddedToProject(cmd.payload);
  }

  complete(cmd: CompleteProject): ProjectCompleted {
    return new ProjectCompleted(cmd.payload);
  }
}
