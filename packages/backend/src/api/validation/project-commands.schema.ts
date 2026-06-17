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
  PlanProjectCommand: z.object({
    id: z.string().uuid(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  StartProjectCommand: z.object({
    id: z.string().uuid(),
    endDate: z.string().optional(),
  }),
  PauseProjectCommand: z.object({
    id: z.string().uuid(),
  }),
  ResumeProjectCommand: z.object({
    id: z.string().uuid(),
  }),
  UpdateProjectCommand: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  }),
};
