import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const planProjectSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const startProjectSchema = z.object({
  endDate: z.string().optional(),
});
