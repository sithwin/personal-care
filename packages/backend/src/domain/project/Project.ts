import type { StoredEvent, UUID } from '../../types';
import type { CreateProjectCommand } from './commands/CreateProjectCommand';
import type { AddTaskToProjectCommand } from './commands/AddTaskToProjectCommand';
import type { CompleteProjectCommand } from './commands/CompleteProjectCommand';
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
        state = { ...(state as ProjectState), taskIds: [...state.taskIds, payload.taskId as UUID] };
      } else if (state !== null && event.eventType === 'ProjectCompleted') {
        state = { ...(state as ProjectState), status: 'done' };
      }
    }
    return state !== null ? new Project(state) : null;
  }

  static create(cmd: CreateProjectCommand): ProjectCreated {
    return new ProjectCreated(cmd.payload);
  }

  addTask(cmd: AddTaskToProjectCommand): TaskAddedToProject {
    return new TaskAddedToProject(cmd.payload);
  }

  complete(cmd: CompleteProjectCommand): ProjectCompleted {
    return new ProjectCompleted(cmd.payload);
  }
}
