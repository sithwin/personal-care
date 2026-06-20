import type { UUID } from '../../../types';

export interface CreateItemCommand {
  readonly type: 'CreateItemCommand';
  readonly payload: {
    readonly name: string;
    readonly categoryId: UUID;
    readonly description?: string;
    readonly quantity?: number;
    readonly price?: number;
    readonly notes?: string;
  };
}
