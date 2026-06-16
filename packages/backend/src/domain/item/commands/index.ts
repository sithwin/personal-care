export type { CreateItem } from './CreateItem';
export type { MarkItemAvailable } from './MarkItemAvailable';
export type { MarkItemConsumed } from './MarkItemConsumed';
export type { MarkItemAvailableAgain } from './MarkItemAvailableAgain';

import type { CreateItem } from './CreateItem';
import type { MarkItemAvailable } from './MarkItemAvailable';
import type { MarkItemConsumed } from './MarkItemConsumed';
import type { MarkItemAvailableAgain } from './MarkItemAvailableAgain';

export type ItemCommand = CreateItem | MarkItemAvailable | MarkItemConsumed | MarkItemAvailableAgain;
