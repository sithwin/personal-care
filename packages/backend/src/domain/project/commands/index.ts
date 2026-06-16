export type { CreateProjectCommand } from './CreateProjectCommand';
export type { AddTaskToProjectCommand } from './AddTaskToProjectCommand';
export type { CompleteProjectCommand } from './CompleteProjectCommand';

import type { CreateProjectCommand } from './CreateProjectCommand';
import type { AddTaskToProjectCommand } from './AddTaskToProjectCommand';
import type { CompleteProjectCommand } from './CompleteProjectCommand';

export type ProjectCommand = CreateProjectCommand | AddTaskToProjectCommand | CompleteProjectCommand;
