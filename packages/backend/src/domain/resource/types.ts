import { UUID, ResourceType } from '../../types';

export interface CreateResourcePayload { id: UUID; title: string; type: ResourceType; url?: string; notes?: string; categoryId?: UUID; }
export interface UpdateResourcePayload { id: UUID; title?: string; url?: string; notes?: string; }
export interface DeleteResourcePayload { id: UUID; }

export type ResourceCommand =
  | { type: 'CreateResource'; payload: CreateResourcePayload }
  | { type: 'UpdateResource'; payload: UpdateResourcePayload }
  | { type: 'DeleteResource'; payload: DeleteResourcePayload };
