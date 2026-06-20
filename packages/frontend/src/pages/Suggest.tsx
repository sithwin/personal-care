import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuggestions, useCategories } from '../api/queries';
import { startTask } from '../api/mutations';

const QUICK_PICKS = [0.5, 1, 2, 3];

export function Suggest() {
  const [hours, setHours] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const { data: tasks, isLoading } = useSuggestions(hours, categoryId || undefined);
  const { data: categories } = useCategories();
  const qc = useQueryClient();

  const handleStart = async (taskId: string) => {
    await startTask(taskId);
    await qc.invalidateQueries();
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-white">What should I do?</h1>
        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-400">I have</label>
          <div className="flex gap-2 flex-wrap">
            {QUICK_PICKS.map(h => (
              <button key={h} onClick={() => setHours(h)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${hours === h ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {h < 1 ? '30 min' : `${h}h`}
              </button>
            ))}
            <input type="number" value={hours} onChange={e => setHours(parseFloat(e.target.value))} min={0.25} step={0.25}
              className="w-20 px-2 py-1.5 rounded-lg bg-gray-800 text-white text-sm border border-gray-700 outline-none" />
            <span className="text-sm text-gray-500 self-center">hours</span>
          </div>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="w-full max-w-xs bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none">
            <option value="">Any category</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <div className="text-gray-500 text-sm">Finding suggestions...</div>}
      {!isLoading && tasks?.length === 0 && <div className="text-gray-600 text-sm">No ready tasks fit your available time.</div>}
      <div className="flex flex-col gap-2">
        {tasks?.map(task => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{task.name}</div>
              {task.estimated_duration_value && (
                <div className="text-xs text-gray-500 mt-0.5">{task.estimated_duration_value} {task.estimated_duration_unit}</div>
              )}
            </div>
            {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>}
            <button onClick={() => handleStart(task.id)}
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors">
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
