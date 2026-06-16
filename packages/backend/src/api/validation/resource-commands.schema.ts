import { z } from 'zod';

export const resourceCommandSchemas = {
  CreateResourceCommand: z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    type: z.enum(['link', 'note', 'video', 'file', 'doc']),
    url: z.string().optional(),
    notes: z.string().optional(),
    categoryId: z.string().uuid().optional(),
  }),
  UpdateResourceCommand: z.object({
    id: z.string().uuid(),
    title: z.string().optional(),
    url: z.string().optional(),
    notes: z.string().optional(),
  }),
  DeleteResourceCommand: z.object({
    id: z.string().uuid(),
  }),
};
