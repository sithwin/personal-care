import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useTask, useCategories, useProjects, useItems, useResources } from '../api/queries';
import { dispatch } from '../api/commands';
import { TaskForm } from '../components/tasks/TaskForm';
import type { TaskFormData, ItemActions, ResourceActions } from '../components/tasks/TaskForm';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: task, isLoading } = useTask(id!);
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();

  if (isLoading || !task || !categories) {
    return <div className="text-gray-500 text-sm">Loading...</div>;
  }

  const taskRef = task;

  async function handleSave(data: TaskFormData) {
    if (data.projectId && data.projectId !== taskRef.project_id) {
      await dispatch('AddTaskToProjectCommand', { projectId: data.projectId, taskId: taskRef.id });
    }
    await dispatch('UpdateTaskCommand', {
      id: taskRef.id,
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      estimatedDuration: data.estimatedDuration as Record<string, unknown> | undefined,
      dueDate: data.dueDate,
    });
    await qc.invalidateQueries();
  }

  async function handleStart() {
    await dispatch('StartTaskCommand', { id: taskRef.id });
    await qc.invalidateQueries();
  }

  async function handleComplete() {
    await dispatch('CompleteTaskCommand', { id: taskRef.id, itemDisposals: [] });
    await qc.invalidateQueries();
  }

  const itemActions: ItemActions = {
    onAddExisting: async (itemId) => {
      await dispatch('AddItemRequirementCommand', { taskId: taskRef.id, itemId, consumable: true });
      await qc.invalidateQueries();
    },
    onAddNew: async (name, categoryId) => {
      const itemId = uuidv4();
      await dispatch('CreateItemCommand', { id: itemId, name, categoryId });
      await dispatch('AddItemRequirementCommand', { taskId: taskRef.id, itemId, consumable: true });
      await qc.invalidateQueries();
    },
    onRemove: async (itemId) => {
      await dispatch('RemoveItemRequirementCommand', { taskId: taskRef.id, itemId });
      await qc.invalidateQueries();
    },
  };

  const resourceActions: ResourceActions = {
    onAddExisting: async (resourceId) => {
      await dispatch('AttachResourceToTaskCommand', { taskId: taskRef.id, resourceId });
      await qc.invalidateQueries();
    },
    onAddNew: async (title, type, url) => {
      const resourceId = uuidv4();
      await dispatch('CreateResourceCommand', { id: resourceId, title, type, url });
      await dispatch('AttachResourceToTaskCommand', { taskId: taskRef.id, resourceId });
      await qc.invalidateQueries();
    },
    onRemove: async (resourceId) => {
      await dispatch('DetachResourceFromTaskCommand', { taskId: taskRef.id, resourceId });
      await qc.invalidateQueries();
    },
  };

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/tasks" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Tasks</Link>
      </div>

      {(task.status === 'ready' || task.status === 'ongoing') && (
        <div className="flex gap-2">
          {task.status === 'ready' && (
            <button type="button" onClick={handleStart}
              className="px-3 py-1.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600">
              Start
            </button>
          )}
          {task.status === 'ongoing' && (
            <button type="button" onClick={handleComplete}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">
              Complete
            </button>
          )}
        </div>
      )}

      <TaskForm
        mode="edit"
        task={task}
        categories={categories}
        projects={projects ?? []}
        allItems={allItems ?? []}
        allResources={allResources ?? []}
        onSubmit={handleSave}
        itemActions={itemActions}
        resourceActions={resourceActions}
      />
    </div>
  );
}
