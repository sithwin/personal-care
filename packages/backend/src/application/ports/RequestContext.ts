import type { ILogger } from './ILogger';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  log: ILogger;
}
