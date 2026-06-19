import type { StoredEvent } from '../../types';
import type { RequestContext } from './RequestContext';

export type Projector = (event: StoredEvent, ctx: RequestContext) => Promise<void>;
