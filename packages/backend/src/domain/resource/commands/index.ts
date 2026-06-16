export type { CreateResourceCommand } from './CreateResourceCommand';
export type { UpdateResourceCommand } from './UpdateResourceCommand';
export type { DeleteResourceCommand } from './DeleteResourceCommand';

import type { CreateResourceCommand } from './CreateResourceCommand';
import type { UpdateResourceCommand } from './UpdateResourceCommand';
import type { DeleteResourceCommand } from './DeleteResourceCommand';

export type ResourceCommand = CreateResourceCommand | UpdateResourceCommand | DeleteResourceCommand;
