import type { UUID, ResourceType } from '../../../types';

export interface CreateResourceCommand {
  readonly type: 'CreateResourceCommand';
  readonly payload: {
    readonly title: string;
    readonly type: ResourceType;
    readonly url?: string;
    readonly notes?: string;
    readonly categoryId?: UUID;
  };
}
