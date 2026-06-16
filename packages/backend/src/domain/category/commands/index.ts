export type { CreateCategoryCommand } from './CreateCategoryCommand';
export type { UpdateCategoryCommand } from './UpdateCategoryCommand';
export type { DeleteCategoryCommand } from './DeleteCategoryCommand';

import type { CreateCategoryCommand } from './CreateCategoryCommand';
import type { UpdateCategoryCommand } from './UpdateCategoryCommand';
import type { DeleteCategoryCommand } from './DeleteCategoryCommand';

export type CategoryCommand = CreateCategoryCommand | UpdateCategoryCommand | DeleteCategoryCommand;
