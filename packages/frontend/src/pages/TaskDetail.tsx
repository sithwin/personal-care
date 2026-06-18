import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTask, useCategories, useProjects, useItems, useResources } from '../api/queries';
import { dispatch } from '../api/commands';

const ITEM_STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  to_buy:    { label: 'To Buy',    emoji: '🛒', color: 'bg-yellow-900/40 text-yellow-300' },
  available: { label: 'Available', emoji: '✅', color: 'bg-green-900/40 text-green-300'  },
  consumed:  { label: 'Consumed',  emoji: '📦', color: 'bg-gray-700 text-gray-400'       },
};

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: task, isLoading } = useTask(id!);
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day'>('hour');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setDescription(task.description ?? '');
    setCategoryId(task.category_id);
    setProjectId(task.project_id ?? '');
    setDurationValue(String(task.estimated_duration_value ?? ''));
    setDurationUnit((task.estimated_duration_unit as 'hour' | 'day') ?? 'hour');
    setDueDate(task.due_date?.slice(0, 10) ?? '');
  }, [task]);

  if (isLoading) return <div className="text-gray-500 text-sm">Loading...</div>;
  if (!task) return <div className="text-gray-500 text-sm">Task not found.</div>;

  const handleSave = async () => {
    if (projectId && projectId !== task.project_id) {
      await dispatch('AddTaskToProjectCommand', { projectId, taskId: task.id });
    }
    await dispatch('UpdateTaskCommand', {
      id: task.id,
      name: name.trim() || undefined,
      categoryId: categoryId || undefined,
      description: description || undefined,
      estimatedDuration: durationValue ? { value: Number(durationValue), unit: durationUnit } : undefined,
      dueDate: dueDate || undefined,
    });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTaskCommand', { id: task.id });
    await qc.invalidateQueries();
  };

  const handleComplete = async () => {
    await dispatch('CompleteTaskCommand', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleRemoveItem = async (itemId: string) => {
    await dispatch('RemoveItemRequirementCommand', { taskId: task.id, itemId });
    await qc.invalidateQueries();
  };

  const handleAddItem = async (itemId: string) => {
    await dispatch('AddItemRequirementCommand', { taskId: task.id, itemId, consumable: true });
    await qc.invalidateQueries();
  };

  const handleAddResource = async (resourceId: string) => {
    await dispatch('AttachResourceToTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const handleRemoveResource = async (resourceId: string) => {
    await dispatch('DetachResourceFromTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const attachedItemIds = new Set((task.required_items ?? []).map(i => i.item_id));
  const attachedResourceIds = new Set((task.resources ?? []).map(r => r.resource_id));
  const unattachedItems = (allItems ?? []).filter(i => !attachedItemIds.has(i.id));
  const unattachedResources = (allResources ?? []).filter(r => !attachedResourceIds.has(r.id));

  return (
    <div className="max-w-2xl flex flex-col gap-6">

      <div className="flex items-center gap-3">
        <Link to="/tasks" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Tasks</Link>
      </div>

      {/* Status actions */}
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

      {/* Editable fields */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Details</h2>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name..."
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />

        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)" rows={3}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500 resize-none" />

        <div className="flex gap-2">
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
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

        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
            Save
          </button>
        </div>
      </div>

      {/* Items section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Items Required</h2>

        {(task.required_items ?? []).length === 0 && (
          <p className="text-sm text-gray-600">No items required.</p>
        )}

        {(task.required_items ?? []).map(ti => {
          const item = allItems?.find(i => i.id === ti.item_id);
          const cfg = ITEM_STATUS_CONFIG[ti.item_status] ?? ITEM_STATUS_CONFIG.to_buy!;
          return (
            <div key={ti.item_id} className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                {cfg.emoji} {cfg.label}
              </span>
              <span className="flex-1 text-sm text-white">{item?.name ?? ti.item_id}</span>
              <button type="button" onClick={() => handleRemoveItem(ti.item_id)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        {unattachedItems.length > 0 && (
          <select defaultValue=""
            onChange={e => { if (e.target.value) { handleAddItem(e.target.value); e.currentTarget.value = ''; } }}
            className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">+ Add item…</option>
            {unattachedItems.map(i => {
              const cfg = ITEM_STATUS_CONFIG[i.status] ?? ITEM_STATUS_CONFIG.to_buy!;
              return <option key={i.id} value={i.id}>{cfg.emoji} {i.name}</option>;
            })}
          </select>
        )}
      </div>

      {/* Resources section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Resources</h2>

        {(task.resources ?? []).length === 0 && (
          <p className="text-sm text-gray-600">No resources attached.</p>
        )}

        {(task.resources ?? []).map(r => (
          <div key={r.resource_id} className="flex items-center gap-2">
            <span className="flex-1 text-sm text-white">{r.title}</span>
            <button type="button" onClick={() => handleRemoveResource(r.resource_id)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
          </div>
        ))}

        {unattachedResources.length > 0 && (
          <select defaultValue=""
            onChange={e => { if (e.target.value) { handleAddResource(e.target.value); e.currentTarget.value = ''; } }}
            className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">+ Add resource…</option>
            {unattachedResources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        )}
      </div>

    </div>
  );
}
