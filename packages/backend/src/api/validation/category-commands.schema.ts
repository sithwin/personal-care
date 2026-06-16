import { z } from 'zod';

export const categoryCommandSchemas = {
  CreateCategoryCommand: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    icon: z.string().min(1),
    color: z.string().min(1),
    isDefault: z.boolean(),
  }),
  UpdateCategoryCommand: z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
  DeleteCategoryCommand: z.object({
    id: z.string().uuid(),
  }),
};
