import { type UUID, type ItemStatus } from '../../types';

export interface CreateItemPayload { id: UUID; name: string; categoryId: UUID; description?: string; quantity?: number; price?: number; notes?: string; }
export interface MarkItemPayload { id: UUID; }

export type ItemCommand =
  | { type: 'CreateItem'; payload: CreateItemPayload }
  | { type: 'MarkItemAvailable'; payload: MarkItemPayload }
  | { type: 'MarkItemConsumed'; payload: MarkItemPayload }
  | { type: 'MarkItemAvailableAgain'; payload: MarkItemPayload };

export interface ItemState { id: UUID; name: string; categoryId: UUID; status: ItemStatus; }
