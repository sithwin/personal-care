import { z } from 'zod';

export const createTaskSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  estimatedDuration: z.object({
    value: z.number(),
    unit: z.enum(['hour', 'day']),
  }).optional(),
  dueDate: z.string().optional(),
});

export const updateTaskSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().optional(),
  estimatedDuration: z.object({
    value: z.number(),
    unit: z.enum(['hour', 'day']),
  }).optional(),
  dueDate: z.string().optional(),
});

export const startTaskSchema = z.object({
  id: z.string().uuid(),
});

export const completeTaskSchema = z.object({
  id: z.string().uuid(),
  itemDisposals: z.array(z.object({
    itemId: z.string().uuid(),
    consumed: z.boolean(),
  })),
});

export const addItemRequirementSchema = z.object({
  consumable: z.boolean(),
});

export const setTaskRecurrenceSchema = z.object({
  recurrenceRule: z.object({
    interval: z.number(),
    unit: z.enum(['day', 'week', 'month', 'year']),
  }),
  dueDate: z.string().optional(),
});

export const scheduleTaskSchema = z.object({
  scheduledDate: z.string(),
  scheduledStartTime: z.string(),
});

export const promoteToProjectSchema = z.object({
  projectId: z.string().uuid(),
});
