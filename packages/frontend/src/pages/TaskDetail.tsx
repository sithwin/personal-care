import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTask, useCategories, useProjects, useItems, useResources } from '../api/queries';
import {
  updateTask, startTask, completeTask,
  createItem, addItemRequirement, removeItemRequirement,
  createResource, attachResourceToTask, detachResourceFromTask,
  addTaskToProject,
} from '../api/mutations';
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
      await addTaskToProject(data.projectId, taskRef.id);
    }
    await updateTask(taskRef.id, {
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      estimatedDuration: data.estimatedDuration,
      dueDate: data.dueDate,
    });
    await qc.invalidateQueries();
  }

  async function handleStart() {
    await startTask(taskRef.id);
    await qc.invalidateQueries();
  }

  async function handleComplete() {
    await completeTask(taskRef.id, { itemDisposals: [] });
    await qc.invalidateQueries();
  }

  const itemActions: ItemActions = {
    onAddExisting: async (itemId) => {
      await addItemRequirement(taskRef.id, itemId, { consumable: true });
      await qc.invalidateQueries();
    },
    onAddNew: async (name, categoryId) => {
      const { id: itemId } = await createItem({ name, categoryId });
      await addItemRequirement(taskRef.id, itemId, { consumable: true });
      await qc.invalidateQueries();
    },
    onRemove: async (itemId) => {
      await removeItemRequirement(taskRef.id, itemId);
      await qc.invalidateQueries();
    },
  };

  const resourceActions: ResourceActions = {
    onAddExisting: async (resourceId) => {
      await attachResourceToTask(taskRef.id, resourceId);
      await qc.invalidateQueries();
    },
    onAddNew: async (title, type, url) => {
      const { id: resourceId } = await createResource({ title, type, url });
      await attachResourceToTask(taskRef.id, resourceId);
      await qc.invalidateQueries();
    },
    onRemove: async (resourceId) => {
      await detachResourceFromTask(taskRef.id, resourceId);
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
