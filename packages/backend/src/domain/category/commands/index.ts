export type { CreateCategory } from './CreateCategory';
export type { UpdateCategory } from './UpdateCategory';
export type { DeleteCategory } from './DeleteCategory';

import type { CreateCategory } from './CreateCategory';
import type { UpdateCategory } from './UpdateCategory';
import type { DeleteCategory } from './DeleteCategory';

export type CategoryCommand = CreateCategory | UpdateCategory | DeleteCategory;
