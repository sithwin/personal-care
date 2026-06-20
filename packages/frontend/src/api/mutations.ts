import { fetchJSON } from './client';

interface Created { id: string; }

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export interface CreateCategoryBody { name: string; icon: string; color: string; isDefault: boolean; }
export interface UpdateCategoryBody { name?: string; icon?: string; color?: string; }

export function createCategory(body: CreateCategoryBody): Promise<Created> {
  return fetchJSON('/categories', { method: 'POST', body: JSON.stringify(body) });
}

export function updateCategory(id: string, body: UpdateCategoryBody): Promise<void> {
  return fetchJSON(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteCategory(id: string): Promise<void> {
  return fetchJSON(`/categories/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export interface EstimatedDuration { value: number; unit: string; }

export interface CreateTaskBody {
  name: string;
  categoryId: string;
  description?: string;
  projectId?: string;
  estimatedDuration?: EstimatedDuration;
  dueDate?: string;
}

export interface UpdateTaskBody {
  name?: string;
  categoryId?: string;
  description?: string;
  estimatedDuration?: EstimatedDuration;
  dueDate?: string;
}

export function createTask(body: CreateTaskBody): Promise<Created> {
  return fetchJSON('/tasks', { method: 'POST', body: JSON.stringify(body) });
}

export function updateTask(id: string, body: UpdateTaskBody): Promise<void> {
  return fetchJSON(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function startTask(id: string): Promise<void> {
  return fetchJSON(`/tasks/${id}/start`, { method: 'POST' });
}

export function completeTask(id: string, body: { itemDisposals: unknown[] }): Promise<void> {
  return fetchJSON(`/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify(body) });
}

export function scheduleTask(id: string, body: { scheduledDate: string; scheduledStartTime: string }): Promise<void> {
  return fetchJSON(`/tasks/${id}/schedule`, { method: 'POST', body: JSON.stringify(body) });
}

export function addItemRequirement(taskId: string, itemId: string, body: { consumable: boolean }): Promise<void> {
  return fetchJSON(`/tasks/${taskId}/items/${itemId}`, { method: 'POST', body: JSON.stringify(body) });
}

export function removeItemRequirement(taskId: string, itemId: string): Promise<void> {
  return fetchJSON(`/tasks/${taskId}/items/${itemId}`, { method: 'DELETE' });
}

export function attachResourceToTask(taskId: string, resourceId: string): Promise<void> {
  return fetchJSON(`/tasks/${taskId}/resources/${resourceId}`, { method: 'POST' });
}

export function detachResourceFromTask(taskId: string, resourceId: string): Promise<void> {
  return fetchJSON(`/tasks/${taskId}/resources/${resourceId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
export interface CreateItemBody { name: string; categoryId: string; }

export function createItem(body: CreateItemBody): Promise<Created> {
  return fetchJSON('/items', { method: 'POST', body: JSON.stringify(body) });
}

export function markItemAvailable(id: string): Promise<void> {
  return fetchJSON(`/items/${id}/available`, { method: 'POST' });
}

export function markItemConsumed(id: string): Promise<void> {
  return fetchJSON(`/items/${id}/consumed`, { method: 'POST' });
}

export function markItemAvailableAgain(id: string): Promise<void> {
  return fetchJSON(`/items/${id}/available-again`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export interface CreateProjectBody { name: string; categoryId: string; description?: string; }
export interface UpdateProjectBody { priority?: 'low' | 'medium' | 'high'; name?: string; description?: string; }

export function createProject(body: CreateProjectBody): Promise<Created> {
  return fetchJSON('/projects', { method: 'POST', body: JSON.stringify(body) });
}

export function updateProject(id: string, body: UpdateProjectBody): Promise<void> {
  return fetchJSON(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function planProject(id: string, body: { startDate: string; endDate: string }): Promise<void> {
  return fetchJSON(`/projects/${id}/plan`, { method: 'POST', body: JSON.stringify(body) });
}

export function startProject(id: string, body?: { endDate?: string }): Promise<void> {
  return fetchJSON(`/projects/${id}/start`, body ? { method: 'POST', body: JSON.stringify(body) } : { method: 'POST' });
}

export function pauseProject(id: string): Promise<void> {
  return fetchJSON(`/projects/${id}/pause`, { method: 'POST' });
}

export function resumeProject(id: string): Promise<void> {
  return fetchJSON(`/projects/${id}/resume`, { method: 'POST' });
}

export function completeProject(id: string): Promise<void> {
  return fetchJSON(`/projects/${id}/complete`, { method: 'POST' });
}

export function addTaskToProject(projectId: string, taskId: string): Promise<void> {
  return fetchJSON(`/projects/${projectId}/tasks/${taskId}`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
export interface CreateResourceBody { title: string; type: string; url?: string; notes?: string; }

export function createResource(body: CreateResourceBody): Promise<Created> {
  return fetchJSON('/resources', { method: 'POST', body: JSON.stringify(body) });
}
