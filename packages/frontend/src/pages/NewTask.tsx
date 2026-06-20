import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useProjects, useItems, useResources } from '../api/queries';
import { createTask, createItem, addItemRequirement, createResource, attachResourceToTask } from '../api/mutations';
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
    const { id: taskId } = await createTask({
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      projectId: data.projectId,
      estimatedDuration: data.estimatedDuration,
      dueDate: data.dueDate,
    });

    try {
      for (const pending of data.pendingItems) {
        if (pending.type === 'new') {
          const { id: itemId } = await createItem({ name: pending.name, categoryId: pending.categoryId });
          await addItemRequirement(taskId, itemId, { consumable: true });
        } else {
          await addItemRequirement(taskId, pending.itemId, { consumable: true });
        }
      }
      for (const pending of data.pendingResources) {
        if (pending.type === 'new') {
          const { id: resourceId } = await createResource({ title: pending.title, type: pending.resourceType, url: pending.url });
          await attachResourceToTask(taskId, resourceId);
        } else {
          await attachResourceToTask(taskId, pending.resourceId);
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
