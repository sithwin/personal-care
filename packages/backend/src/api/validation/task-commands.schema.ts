import { z } from 'zod';

export const taskCommandSchemas = {
  CreateTaskCommand: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    categoryId: z.string().uuid(),
    description: z.string().optional(),
    projectId: z.string().uuid().optional(),
    estimatedDuration: z.object({ value: z.number(), unit: z.enum(['hour', 'day']) }).optional(),
    dueDate: z.string().optional(),
  }),
  StartTaskCommand: z.object({
    id: z.string().uuid(),
  }),
  CompleteTaskCommand: z.object({
    id: z.string().uuid(),
    itemDisposals: z.array(z.object({ itemId: z.string().uuid(), consumed: z.boolean() })),
  }),
  AddItemRequirementCommand: z.object({
    taskId: z.string().uuid(),
    itemId: z.string().uuid(),
    consumable: z.boolean(),
  }),
  AttachResourceToTaskCommand: z.object({
    taskId: z.string().uuid(),
    resourceId: z.string().uuid(),
  }),
  DetachResourceFromTaskCommand: z.object({
    taskId: z.string().uuid(),
    resourceId: z.string().uuid(),
  }),
  SetTaskRecurrenceCommand: z.object({
    id: z.string().uuid(),
    recurrenceRule: z.object({ interval: z.number(), unit: z.enum(['day', 'week', 'month', 'year']) }),
    dueDate: z.string().optional(),
  }),
  SkipRecurrenceCommand: z.object({
    id: z.string().uuid(),
  }),
  ScheduleTaskCommand: z.object({
    id: z.string().uuid(),
    scheduledDate: z.string(),
    scheduledStartTime: z.string(),
  }),
  PromoteToProjectCommand: z.object({
    taskId: z.string().uuid(),
    projectId: z.string().uuid(),
  }),
  UpdateTaskCommand: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    categoryId: z.string().uuid().optional(),
    description: z.string().optional(),
    estimatedDuration: z.object({ value: z.number(), unit: z.enum(['hour', 'day']) }).optional(),
    dueDate: z.string().optional(),
  }),
};
