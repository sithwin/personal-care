import React, { useState } from 'react';
import type { Task, Item, Category, Project, Resource } from '../../api/queries';

type ResourceType = 'link' | 'note' | 'video' | 'file' | 'doc';

interface PendingExistingItem { type: 'existing'; itemId: string; }
interface PendingNewItem { type: 'new'; name: string; categoryId: string; }
type PendingItem = PendingExistingItem | PendingNewItem;

interface PendingExistingResource { type: 'existing'; resourceId: string; }
interface PendingNewResource { type: 'new'; title: string; resourceType: ResourceType; url?: string; }
type PendingResource = PendingExistingResource | PendingNewResource;

export interface TaskFormData {
  name: string;
  description?: string;
  categoryId: string;
  projectId?: string;
  estimatedDuration?: { value: number; unit: 'hour' | 'day' };
  dueDate?: string;
  pendingItems: PendingItem[];
  pendingResources: PendingResource[];
}

export interface ItemActions {
  onAddExisting: (itemId: string) => Promise<void>;
  onAddNew: (name: string, categoryId: string) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

export interface ResourceActions {
  onAddExisting: (resourceId: string) => Promise<void>;
  onAddNew: (title: string, type: ResourceType, url?: string) => Promise<void>;
  onRemove: (resourceId: string) => Promise<void>;
}

export interface TaskFormProps {
  mode: 'create' | 'edit';
  task?: Task;
  categories: Category[];
  projects: Project[];
  allItems: Item[];
  allResources: Resource[];
  onSubmit: (data: TaskFormData) => Promise<void>;
  itemActions?: ItemActions;
  resourceActions?: ResourceActions;
}

const ITEM_STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  to_buy:    { label: 'To Buy',    emoji: '🛒', color: 'bg-yellow-900/40 text-yellow-300' },
  available: { label: 'Available', emoji: '✅', color: 'bg-green-900/40 text-green-300'  },
  consumed:  { label: 'Consumed',  emoji: '📦', color: 'bg-gray-700 text-gray-400'       },
};

const RESOURCE_TYPES: ResourceType[] = ['link', 'note', 'video', 'file', 'doc'];

export function TaskForm({
  mode, task, categories, projects, allItems, allResources, onSubmit, itemActions, resourceActions,
}: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [categoryId, setCategoryId] = useState(task?.category_id ?? categories[0]?.id ?? '');
  const [projectId, setProjectId] = useState(task?.project_id ?? '');
  const [durationValue, setDurationValue] = useState(String(task?.estimated_duration_value ?? ''));
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day'>((task?.estimated_duration_unit as 'hour' | 'day') ?? 'hour');
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? '');
  const [submitError, setSubmitError] = useState('');

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pendingResources, setPendingResources] = useState<PendingResource[]>([]);

  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState(categoryId);
  const [showNewResourceForm, setShowNewResourceForm] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<ResourceType>('link');
  const [newResourceUrl, setNewResourceUrl] = useState('');

  const editAttachedItems = mode === 'edit' ? (task?.required_items ?? []) : [];
  const takenItemIds = new Set([
    ...editAttachedItems.map(i => i.item_id),
    ...pendingItems.filter((p): p is PendingExistingItem => p.type === 'existing').map(p => p.itemId),
  ]);
  const unattachedItems = allItems.filter(i => !takenItemIds.has(i.id));

  const editAttachedResources = mode === 'edit' ? (task?.resources ?? []) : [];
  const takenResourceIds = new Set([
    ...editAttachedResources.map(r => r.resource_id),
    ...pendingResources.filter((p): p is PendingExistingResource => p.type === 'existing').map(p => p.resourceId),
  ]);
  const unattachedResources = allResources.filter(r => !takenResourceIds.has(r.id));

  const handleSubmit = async () => {
    setSubmitError('');
    try {
      await onSubmit({
        name: name.trim(),
        description: description || undefined,
        categoryId,
        projectId: projectId || undefined,
        estimatedDuration: durationValue ? { value: Number(durationValue), unit: durationUnit } : undefined,
        dueDate: dueDate || undefined,
        pendingItems,
        pendingResources,
      });
    } catch {
      setSubmitError('Failed to save task — please try again.');
    }
  };

  const handleAddExistingItem = async (itemId: string) => {
    if (mode === 'edit') {
      await itemActions?.onAddExisting(itemId);
    } else {
      setPendingItems(prev => [...prev, { type: 'existing', itemId }]);
    }
  };

  const handleAddNewItem = async () => {
    if (!newItemName.trim()) return;
    if (mode === 'edit') {
      await itemActions?.onAddNew(newItemName.trim(), newItemCategoryId);
    } else {
      setPendingItems(prev => [...prev, { type: 'new', name: newItemName.trim(), categoryId: newItemCategoryId }]);
    }
    setNewItemName('');
    setShowNewItemForm(false);
  };

  const handleRemoveItem = async (key: string) => {
    if (mode === 'edit') {
      await itemActions?.onRemove(key);
    } else {
      setPendingItems(prev => prev.filter(p =>
        p.type === 'existing' ? p.itemId !== key : p.name !== key
      ));
    }
  };

  const handleAddExistingResource = async (resourceId: string) => {
    if (mode === 'edit') {
      await resourceActions?.onAddExisting(resourceId);
    } else {
      setPendingResources(prev => [...prev, { type: 'existing', resourceId }]);
    }
  };

  const handleAddNewResource = async () => {
    if (!newResourceTitle.trim()) return;
    if (mode === 'edit') {
      await resourceActions?.onAddNew(newResourceTitle.trim(), newResourceType, newResourceUrl || undefined);
    } else {
      setPendingResources(prev => [...prev, {
        type: 'new', title: newResourceTitle.trim(), resourceType: newResourceType, url: newResourceUrl || undefined,
      }]);
    }
    setNewResourceTitle('');
    setNewResourceUrl('');
    setShowNewResourceForm(false);
  };

  const handleRemoveResource = async (key: string) => {
    if (mode === 'edit') {
      await resourceActions?.onRemove(key);
    } else {
      setPendingResources(prev => prev.filter(p =>
        p.type === 'existing' ? p.resourceId !== key : p.title !== key
      ));
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Detail fields */}
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
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

        <div className="flex items-center justify-between gap-3">
          {submitError && <p className="text-sm text-red-400">{submitError}</p>}
          <div className="ml-auto">
            <button type="button" onClick={handleSubmit} disabled={!name.trim() || !categoryId}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
              {mode === 'create' ? 'Create Task' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Items section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Items Required</h2>

        {mode === 'edit' && editAttachedItems.length === 0 && (
          <p className="text-sm text-gray-600">No items required.</p>
        )}
        {mode === 'create' && pendingItems.length === 0 && (
          <p className="text-sm text-gray-600">No items added yet.</p>
        )}

        {mode === 'edit' && editAttachedItems.map(ti => {
          const item = allItems.find(i => i.id === ti.item_id);
          const cfg = ITEM_STATUS_CONFIG[ti.item_status] ?? ITEM_STATUS_CONFIG['to_buy']!;
          return (
            <div key={ti.item_id} className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
              <span className="flex-1 text-sm text-white">{item?.name ?? ti.item_id}</span>
              <button type="button" onClick={() => void handleRemoveItem(ti.item_id)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        {mode === 'create' && pendingItems.map((p, i) => {
          const itemName = p.type === 'existing'
            ? (allItems.find(item => item.id === p.itemId)?.name ?? p.itemId)
            : p.name;
          const key = p.type === 'existing' ? p.itemId : p.name;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-400 italic">• {itemName}</span>
              <button type="button" onClick={() => void handleRemoveItem(key)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        <select disabled={unattachedItems.length === 0} defaultValue=""
          onChange={e => { if (e.target.value) { void handleAddExistingItem(e.target.value); e.currentTarget.value = ''; } }}
          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700 disabled:opacity-40">
          <option value="">{unattachedItems.length === 0 ? 'No items available' : '+ Add existing item…'}</option>
          {unattachedItems.map(i => {
            const cfg = ITEM_STATUS_CONFIG[i.status] ?? ITEM_STATUS_CONFIG['to_buy']!;
            return <option key={i.id} value={i.id}>{cfg.emoji} {i.name}</option>;
          })}
        </select>

        {!showNewItemForm && (
          <button type="button" onClick={() => { setShowNewItemForm(true); setNewItemCategoryId(categoryId); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 text-left">
            + New item
          </button>
        )}

        {showNewItemForm && (
          <div className="flex gap-2 items-center flex-wrap">
            <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
              placeholder="Item name..." autoFocus
              className="flex-1 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700" />
            <select value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <button type="button" onClick={() => void handleAddNewItem()} disabled={!newItemName.trim()}
              className="px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
              Add
            </button>
            <button type="button" onClick={() => { setShowNewItemForm(false); setNewItemName(''); }}
              className="text-xs text-gray-500 hover:text-white">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Resources section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Resources</h2>

        {mode === 'edit' && editAttachedResources.length === 0 && (
          <p className="text-sm text-gray-600">No resources attached.</p>
        )}
        {mode === 'create' && pendingResources.length === 0 && (
          <p className="text-sm text-gray-600">No resources added yet.</p>
        )}

        {mode === 'edit' && editAttachedResources.map(r => (
          <div key={r.resource_id} className="flex items-center gap-2">
            <span className="flex-1 text-sm text-white">{r.title}</span>
            <button type="button" onClick={() => void handleRemoveResource(r.resource_id)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
          </div>
        ))}

        {mode === 'create' && pendingResources.map((p, i) => {
          const resourceTitle = p.type === 'existing'
            ? (allResources.find(r => r.id === p.resourceId)?.title ?? p.resourceId)
            : p.title;
          const key = p.type === 'existing' ? p.resourceId : p.title;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-400 italic">• {resourceTitle}</span>
              <button type="button" onClick={() => void handleRemoveResource(key)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        <select disabled={unattachedResources.length === 0} defaultValue=""
          onChange={e => { if (e.target.value) { void handleAddExistingResource(e.target.value); e.currentTarget.value = ''; } }}
          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700 disabled:opacity-40">
          <option value="">{unattachedResources.length === 0 ? 'No resources available' : '+ Add existing resource…'}</option>
          {unattachedResources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>

        {!showNewResourceForm && (
          <button type="button" onClick={() => setShowNewResourceForm(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 text-left">
            + New resource
          </button>
        )}

        {showNewResourceForm && (
          <div className="flex gap-2 items-center flex-wrap">
            <input value={newResourceTitle} onChange={e => setNewResourceTitle(e.target.value)}
              placeholder="Title..." autoFocus
              className="flex-1 min-w-32 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700" />
            <select value={newResourceType} onChange={e => setNewResourceType(e.target.value as ResourceType)}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {newResourceType === 'link' && (
              <input value={newResourceUrl} onChange={e => setNewResourceUrl(e.target.value)} placeholder="URL..."
                className="flex-1 min-w-48 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700" />
            )}
            <button type="button" onClick={() => void handleAddNewResource()} disabled={!newResourceTitle.trim()}
              className="px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
              Add
            </button>
            <button type="button" onClick={() => { setShowNewResourceForm(false); setNewResourceTitle(''); setNewResourceUrl(''); }}
              className="text-xs text-gray-500 hover:text-white">
              Cancel
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
