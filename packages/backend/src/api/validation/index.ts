import type { ZodSchema } from 'zod';
import { taskCommandSchemas } from './task-commands.schema';
import { itemCommandSchemas } from './item-commands.schema';
import { categoryCommandSchemas } from './category-commands.schema';
import { projectCommandSchemas } from './project-commands.schema';
import { resourceCommandSchemas } from './resource-commands.schema';
import { balanceRuleCommandSchemas } from './balance-rule-commands.schema';

export const commandSchemas: Record<string, ZodSchema> = {
  ...taskCommandSchemas,
  ...itemCommandSchemas,
  ...categoryCommandSchemas,
  ...projectCommandSchemas,
  ...resourceCommandSchemas,
  ...balanceRuleCommandSchemas,
};
