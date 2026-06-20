import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
  isDefault: z.boolean(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const deleteCategorySchema = z.object({
  id: z.string().uuid(),
});
