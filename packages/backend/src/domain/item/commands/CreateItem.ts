import type { UUID } from '../../../types';

export interface CreateItem {
  readonly type: 'CreateItem';
  readonly payload: {
    readonly id: UUID;
    readonly name: string;
    readonly categoryId: UUID;
    readonly description?: string;
    readonly quantity?: number;
    readonly price?: number;
    readonly notes?: string;
  };
}
