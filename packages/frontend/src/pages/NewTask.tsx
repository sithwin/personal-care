import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useProjects, useItems, useResources } from '../api/queries';
import { dispatch } from '../api/commands';
import { TaskForm } from '../components/tasks/TaskForm';
import type { TaskFormData } from '../components/tasks/TaskForm';

export function NewTask() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();

  if (!categories) return <div className="text-gray-500 text-sm">Loading...</div>;

  async function handleSubmit(data: TaskFormData) {
    const taskId = uuidv4();

    await dispatch('CreateTaskCommand', {
      id: taskId,
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      projectId: data.projectId,
      estimatedDuration: data.estimatedDuration,
      dueDate: data.dueDate,
    } as Record<string, unknown>);

    try {
      for (const pending of data.pendingItems) {
        if (pending.type === 'new') {
          const itemId = uuidv4();
          await dispatch('CreateItemCommand', { id: itemId, name: pending.name, categoryId: pending.categoryId });
          await dispatch('AddItemRequirementCommand', { taskId, itemId, consumable: true });
        } else {
          await dispatch('AddItemRequirementCommand', { taskId, itemId: pending.itemId, consumable: true });
        }
      }
      for (const pending of data.pendingResources) {
        if (pending.type === 'new') {
          const resourceId = uuidv4();
          await dispatch('CreateResourceCommand', { id: resourceId, title: pending.title, type: pending.resourceType, url: pending.url });
          await dispatch('AttachResourceToTaskCommand', { taskId, resourceId });
        } else {
          await dispatch('AttachResourceToTaskCommand', { taskId, resourceId: pending.resourceId });
        }
      }
    } catch (err) {
      console.error('Failed to attach items/resources after task creation:', err);
    }

    await qc.invalidateQueries();
    navigate(`/tasks/${taskId}`);
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/tasks" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Tasks</Link>
      </div>
      <TaskForm
        mode="create"
        categories={categories}
        projects={projects ?? []}
        allItems={allItems ?? []}
        allResources={allResources ?? []}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
