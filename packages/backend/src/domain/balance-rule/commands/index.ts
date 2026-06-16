export type { CreateBalanceRule } from './CreateBalanceRule';
export type { UpdateBalanceRule } from './UpdateBalanceRule';
export type { DeleteBalanceRule } from './DeleteBalanceRule';

import type { CreateBalanceRule } from './CreateBalanceRule';
import type { UpdateBalanceRule } from './UpdateBalanceRule';
import type { DeleteBalanceRule } from './DeleteBalanceRule';

export type BalanceRuleCommand = CreateBalanceRule | UpdateBalanceRule | DeleteBalanceRule;
