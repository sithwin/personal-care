import { z } from 'zod';

const dayRestrictionSchema = z.enum(['weekend', 'weekday']).nullable();

export const createBalanceRuleSchema = z.object({
  categoryId: z.string().uuid(),
  minimumCount: z.number(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayRestriction: dayRestrictionSchema,
});

export const updateBalanceRuleSchema = z.object({
  minimumCount: z.number().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  dayRestriction: dayRestrictionSchema.optional(),
});
