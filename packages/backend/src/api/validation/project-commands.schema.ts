import { z } from 'zod';

export const projectCommandSchemas = {
  CreateProjectCommand: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    categoryId: z.string().uuid(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
  }),
  AddTaskToProjectCommand: z.object({
    projectId: z.string().uuid(),
    taskId: z.string().uuid(),
  }),
  CompleteProjectCommand: z.object({
    id: z.string().uuid(),
  }),
};
