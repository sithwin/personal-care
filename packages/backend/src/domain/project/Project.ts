import type { StoredEvent, UUID } from '../../types';
import type { CreateProjectCommand } from './commands/CreateProjectCommand';
import type { AddTaskToProjectCommand } from './commands/AddTaskToProjectCommand';
import type { CompleteProjectCommand } from './commands/CompleteProjectCommand';
import type { PlanProjectCommand } from './commands/PlanProjectCommand';
import type { StartProjectCommand } from './commands/StartProjectCommand';
import type { PauseProjectCommand } from './commands/PauseProjectCommand';
import type { ResumeProjectCommand } from './commands/ResumeProjectCommand';
import type { UpdateProjectCommand } from './commands/UpdateProjectCommand';
import { ProjectCreated } from './events/ProjectCreated';
import { TaskAddedToProject } from './events/TaskAddedToProject';
import { ProjectCompleted } from './events/ProjectCompleted';
import { ProjectPlanned } from './events/ProjectPlanned';
import { ProjectStarted } from './events/ProjectStarted';
import { ProjectPaused } from './events/ProjectPaused';
import { ProjectResumed } from './events/ProjectResumed';
import { ProjectUpdated } from './events/ProjectUpdated';

type ProjectStatus = 'draft' | 'planned' | 'active' | 'on_hold' | 'done';
type Priority = 'low' | 'medium' | 'high';

interface ProjectState {
  readonly id: UUID;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly taskIds: UUID[];
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly priority: Priority;
}

export class Project {
  private constructor(private readonly state: ProjectState) {}

  static reconstruct(history: StoredEvent[]): Project | null {
    let state: ProjectState | null = null;
    for (const event of history) {
      const p = event.payload;
      if (event.eventType === 'ProjectCreated') {
        state = {
          id: event.aggregateId as UUID,
          name: p.name as string,
          status: 'draft',
          taskIds: [],
          startDate: null,
          endDate: (p.dueDate as string | undefined) ?? null,
          priority: 'medium',
        };
      } else if (state !== null) {
        if (event.eventType === 'TaskAddedToProject' || event.eventType === 'TaskPromotedToProject') {
          state = { ...(state as ProjectState), taskIds: [...state.taskIds, p.taskId as UUID] };
        } else if (event.eventType === 'ProjectCompleted') {
          state = { ...(state as ProjectState), status: 'done' };
        } else if (event.eventType === 'ProjectPlanned') {
          state = { ...(state as ProjectState), status: 'planned', startDate: p.startDate as string, endDate: p.endDate as string };
        } else if (event.eventType === 'ProjectStarted') {
          state = {
            ...(state as ProjectState),
            status: 'active',
            endDate: (p.endDate as string | undefined) ?? state.endDate,
          };
        } else if (event.eventType === 'ProjectPaused') {
          state = { ...(state as ProjectState), status: 'on_hold' };
        } else if (event.eventType === 'ProjectResumed') {
          state = { ...(state as ProjectState), status: 'active' };
        } else if (event.eventType === 'ProjectUpdated') {
          state = {
            ...(state as ProjectState),
            name: (p.name as string | undefined) ?? state.name,
            priority: (p.priority as Priority | undefined) ?? state.priority,
          };
        }
      }
    }
    return state !== null ? new Project(state) : null;
  }

  static create(cmd: CreateProjectCommand): ProjectCreated {
    return new ProjectCreated(crypto.randomUUID() as UUID, cmd.payload);
  }

  addTask(cmd: AddTaskToProjectCommand): TaskAddedToProject {
    return new TaskAddedToProject(cmd.payload);
  }

  complete(_cmd: CompleteProjectCommand): ProjectCompleted {
    if (this.state.status === 'done') throw new Error('Project already completed');
    return new ProjectCompleted({ id: this.state.id });
  }

  plan(cmd: PlanProjectCommand): ProjectPlanned {
    if (this.state.status === 'done') throw new Error('Cannot plan a completed project');
    return new ProjectPlanned(cmd.payload);
  }

  start(cmd: StartProjectCommand): ProjectStarted {
    if (this.state.status === 'done') throw new Error('Cannot start a completed project');
    return new ProjectStarted(cmd.payload);
  }

  pause(_cmd: PauseProjectCommand): ProjectPaused {
    if (this.state.status !== 'active') throw new Error('Project is not active');
    return new ProjectPaused({ id: this.state.id });
  }

  resume(_cmd: ResumeProjectCommand): ProjectResumed {
    if (this.state.status !== 'on_hold') throw new Error('Project is not on hold');
    return new ProjectResumed({ id: this.state.id });
  }

  update(cmd: UpdateProjectCommand): ProjectUpdated {
    if (this.state.status === 'done') throw new Error('Cannot update a completed project');
    return new ProjectUpdated(cmd.payload);
  }
}
