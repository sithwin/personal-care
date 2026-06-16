export type { CreateProject } from './CreateProject';
export type { AddTaskToProject } from './AddTaskToProject';
export type { CompleteProject } from './CompleteProject';

import type { CreateProject } from './CreateProject';
import type { AddTaskToProject } from './AddTaskToProject';
import type { CompleteProject } from './CompleteProject';

export type ProjectCommand = CreateProject | AddTaskToProject | CompleteProject;
