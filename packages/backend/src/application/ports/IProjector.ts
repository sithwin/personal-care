import type { StoredEvent } from '../../types';

export type Projector = (event: StoredEvent) => Promise<void>;
