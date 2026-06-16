import { z } from 'zod';

const dayRestrictionSchema = z.enum(['weekend', 'weekday']).nullable();

export const balanceRuleCommandSchemas = {
  CreateBalanceRuleCommand: z.object({
    id: z.string().uuid(),
    categoryId: z.string().uuid(),
    minimumCount: z.number(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayRestriction: dayRestrictionSchema,
  }),
  UpdateBalanceRuleCommand: z.object({
    id: z.string().uuid(),
    minimumCount: z.number().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    dayRestriction: dayRestrictionSchema.optional(),
  }),
  DeleteBalanceRuleCommand: z.object({
    id: z.string().uuid(),
  }),
};
