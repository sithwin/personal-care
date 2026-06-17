import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Task } from '../api/queries';
import { useTasks, useCategories, useItems, useResources, useProjects } from '../api/queries';
import { dispatch } from '../api/commands';

const STATUS_TABS = ['ready', 'ongoing', 'pending', 'planned', 'done'] as const;

function TaskRow({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();
  const cat = categories?.find(c => c.id === task.category_id);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.name);
  const [categoryId, setCategoryId] = useState(task.category_id);
  const [description, setDescription] = useState(task.description ?? '');
  const [durationValue, setDurationValue] = useState(String(task.estimated_duration_value ?? ''));
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day'>(
    (task.estimated_duration_unit as 'hour' | 'day') ?? 'hour',
  );
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? '');

  const handleSave = async () => {
    await dispatch('UpdateTaskCommand', {
      id: task.id,
      name: name.trim() || undefined,
      categoryId: categoryId || undefined,
      description: description || undefined,
      estimatedDuration: durationValue ? { value: Number(durationValue), unit: durationUnit } : undefined,
      dueDate: dueDate || undefined,
    });
    await qc.invalidateQueries();
    setEditing(false);
  };

  const handleCancel = () => {
    setName(task.name);
    setCategoryId(task.category_id);
    setDescription(task.description ?? '');
    setDurationValue(String(task.estimated_duration_value ?? ''));
    setDurationUnit((task.estimated_duration_unit as 'hour' | 'day') ?? 'hour');
    setDueDate(task.due_date?.slice(0, 10) ?? '');
    setEditing(false);
  };

  const handleAddItem = async (itemId: string) => {
    await dispatch('AddItemRequirementCommand', { taskId: task.id, itemId, consumable: true });
    await qc.invalidateQueries();
  };

  const handleAddResource = async (resourceId: string) => {
    await dispatch('AttachResourceToTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const handleDetachResource = async (resourceId: string) => {
    await dispatch('DetachResourceFromTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const handleAssignProject = async (projectId: string) => {
    if (!projectId) return;
    await dispatch('AddTaskToProjectCommand', { projectId, taskId: task.id });
    await qc.invalidateQueries();
  };

  const handleComplete = async () => {
    await dispatch('CompleteTaskCommand', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTaskCommand', { id: task.id });
    await qc.invalidateQueries();
  };

  const attachedItemIds = new Set(task.required_items.map(i => i.item_id));
  const attachedResourceIds = new Set(task.resources.map(r => r.resource_id));
  const availableItems = allItems?.filter(i => !attachedItemIds.has(i.id)) ?? [];
  const availableResources = allResources?.filter(r => !attachedResourceIds.has(r.id)) ?? [];

  if (editing) {
    return (
      <div className="flex flex-col gap-3 px-4 py-3 bg-gray-900 border border-indigo-700 rounded-lg">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name..."
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)"
          rows={2}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500 resize-none" />
        <div className="flex gap-2">
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={task.project_id ?? ''} onChange={e => handleAssignProject(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">No project</option>
            {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input type="number" value={durationValue} onChange={e => setDurationValue(e.target.value)}
            placeholder="Duration" min={1}
            className="w-24 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700" />
          <select value={durationUnit} onChange={e => setDurationUnit(e.target.value as 'hour' | 'day')}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            <option value="hour">hour</option>
            <option value="day">day</option>
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700" />
        </div>

        {/* Items */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Items required</span>
          {task.required_items.map(i => (
            <span key={i.item_id} className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">
              {allItems?.find(a => a.id === i.item_id)?.name ?? i.item_id}
              {i.consumable && ' (consumable)'}
            </span>
          ))}
          {availableItems.length > 0 && (
            <select defaultValue="" onChange={e => { if (e.target.value) handleAddItem(e.target.value); e.target.value = ''; }}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              <option value="">+ Add item…</option>
              {availableItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          )}
        </div>

        {/* Resources */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Resources</span>
          {task.resources.map(r => (
            <div key={r.resource_id} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">{r.title}</span>
              <button type="button" onClick={() => handleDetachResource(r.resource_id)}
                className="text-xs text-gray-500 hover:text-red-400">✕</button>
            </div>
          ))}
          {availableResources.length > 0 && (
            <select defaultValue="" onChange={e => { if (e.target.value) handleAddResource(e.target.value); e.target.value = ''; }}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              <option value="">+ Add resource…</option>
              {availableResources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button type="button" onClick={handleSave} disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <button onClick={task.status === 'ongoing' ? handleComplete : task.status === 'ready' ? handleStart : undefined}
        className="text-gray-500 hover:text-white transition-colors text-lg">
        {task.status === 'done' ? '✅' : '☐'}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>{task.name}</div>
        {task.recurrence_rule && <span className="text-xs text-gray-500">🔁 Every {task.recurrence_rule.interval} {task.recurrence_rule.unit}</span>}
      </div>
      {cat && <span className="text-xs text-gray-500">{cat.icon} {cat.name}</span>}
      {task.estimated_duration_value && (
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
          {task.estimated_duration_value}{task.estimated_duration_unit?.charAt(0)}
        </span>
      )}
      {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>}
      <button type="button" onClick={() => setEditing(true)}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
        Edit
      </button>
    </div>
  );
}

export function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'ready';
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const { data: tasks, isLoading } = useTasks({ status, ...(categoryId ? { categoryId } : {}) });
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setSearchParams({ status: s })}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'}`}>
            {s}
          </button>
        ))}
        {categoryId && categories && (
          <span className="ml-2 text-sm text-gray-400 flex items-center gap-1">
            {categories.find(c => c.id === categoryId)?.icon} {categories.find(c => c.id === categoryId)?.name}
            <button onClick={() => setSearchParams({ status })} className="text-gray-600 hover:text-white ml-1">×</button>
          </span>
        )}
      </div>

      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      {!isLoading && tasks?.length === 0 && <div className="text-gray-600 text-sm">No tasks with status &quot;{status}&quot;</div>}
      <div className="flex flex-col gap-2">
        {tasks?.map(task => <TaskRow key={task.id} task={task} />)}
      </div>
    </div>
  );
}
