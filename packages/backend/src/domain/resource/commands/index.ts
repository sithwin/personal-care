export type { CreateResource } from './CreateResource';
export type { UpdateResource } from './UpdateResource';
export type { DeleteResource } from './DeleteResource';

import type { CreateResource } from './CreateResource';
import type { UpdateResource } from './UpdateResource';
import type { DeleteResource } from './DeleteResource';

export type ResourceCommand = CreateResource | UpdateResource | DeleteResource;
