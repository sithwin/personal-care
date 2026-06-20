import { z } from 'zod';

export const createResourceSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['link', 'note', 'video', 'file', 'doc']),
  url: z.string().optional(),
  notes: z.string().optional(),
  categoryId: z.string().uuid().optional(),
});

export const updateResourceSchema = z.object({
  title: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});
