export type { CreateItemCommand } from './CreateItemCommand';
export type { MarkItemAvailableCommand } from './MarkItemAvailableCommand';
export type { MarkItemConsumedCommand } from './MarkItemConsumedCommand';
export type { MarkItemAvailableAgainCommand } from './MarkItemAvailableAgainCommand';

import type { CreateItemCommand } from './CreateItemCommand';
import type { MarkItemAvailableCommand } from './MarkItemAvailableCommand';
import type { MarkItemConsumedCommand } from './MarkItemConsumedCommand';
import type { MarkItemAvailableAgainCommand } from './MarkItemAvailableAgainCommand';

export type ItemCommand = CreateItemCommand | MarkItemAvailableCommand | MarkItemConsumedCommand | MarkItemAvailableAgainCommand;
