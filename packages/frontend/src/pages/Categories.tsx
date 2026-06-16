import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Category } from '../api/queries';
import { useCategories } from '../api/queries';
import { dispatch } from '../api/commands';
import { v4 as uuidv4 } from 'uuid';

const EMOJIS = ['💪','🏃','🧘','🛁','💊','🥗','📚','🎯','🏠','🌿','💤','🧹','🛒','🔧','🎨','🎵','💻','📝','🧠','💡','🌟','⚡','🔑','📅'];
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280'];

interface EmojiGridProps { value: string; onChange: (emoji: string) => void; }

function EmojiGrid({ value, onChange }: EmojiGridProps) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {EMOJIS.map(e => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={`text-lg p-1 rounded hover:bg-gray-700 transition-colors ${value === e ? 'ring-2 ring-indigo-500 bg-gray-700' : ''}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

interface ColorPickerProps { value: string; onChange: (color: string) => void; }

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-indigo-500' : ''}`}
        />
      ))}
    </div>
  );
}

interface CategoryRowProps { category: Category; }

function CategoryRow({ category }: CategoryRowProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [icon, setIcon] = useState(category.icon);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);

  const canDelete = category.task_count === 0 && category.item_count === 0;

  const handleSave = async () => {
    await dispatch('UpdateCategoryCommand', { id: category.id, name, icon, color });
    await qc.invalidateQueries();
    setEditing(false);
  };

  const handleCancel = () => {
    setIcon(category.icon);
    setName(category.name);
    setColor(category.color);
    setEditing(false);
  };

  const handleDelete = async () => {
    await dispatch('DeleteCategoryCommand', { id: category.id });
    await qc.invalidateQueries();
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-3 px-4 py-3 bg-gray-900 border border-indigo-700 rounded-lg">
        <EmojiGrid value={icon} onChange={setIcon} />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Category name..."
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500"
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <span className="text-xl">{category.icon}</span>
      <span className="flex-1 text-sm text-white">{category.name}</span>
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
      {category.task_count > 0 && (
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{category.task_count} tasks</span>
      )}
      {category.item_count > 0 && (
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{category.item_count} items</span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={!canDelete}
        title={!canDelete ? 'Reassign or remove all tasks and items first' : undefined}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Delete
      </button>
    </div>
  );
}

interface NewCategoryRowProps { onDone: () => void; }

function NewCategoryRow({ onDone }: NewCategoryRowProps) {
  const qc = useQueryClient();
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleSave = async () => {
    await dispatch('CreateCategoryCommand', { id: uuidv4(), name, icon, color, isDefault: false });
    await qc.invalidateQueries();
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 bg-gray-900 border border-indigo-700 border-dashed rounded-lg">
      <EmojiGrid value={icon} onChange={setIcon} />
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Category name..."
        autoFocus
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500"
        >
          Create
        </button>
      </div>
    </div>
  );
}

export function Categories() {
  const { data: categories, isLoading } = useCategories();
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Categories</h1>
        <p className="text-sm text-gray-500">Organise your tasks and items by life area.</p>
      </div>
      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      <div className="flex flex-col gap-2">
        {categories?.map(cat => <CategoryRow key={cat.id} category={cat} />)}
        {addingNew && <NewCategoryRow onDone={() => setAddingNew(false)} />}
      </div>
      {!addingNew && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="self-start px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          + Add Category
        </button>
      )}
    </div>
  );
}
