import { z } from 'zod';

export const itemCommandSchemas = {
  CreateItemCommand: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    categoryId: z.string().uuid(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
    notes: z.string().optional(),
  }),
  MarkItemAvailableCommand: z.object({
    id: z.string().uuid(),
  }),
  MarkItemConsumedCommand: z.object({
    id: z.string().uuid(),
  }),
  MarkItemAvailableAgainCommand: z.object({
    id: z.string().uuid(),
  }),
};
