import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
});
