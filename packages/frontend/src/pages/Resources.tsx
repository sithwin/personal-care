import React, { useState } from 'react';
import { useResources } from '../api/queries';

const TYPE_ICONS: Record<string, string> = { link: '🔗', note: '📝', video: '🎥', file: '📄', doc: '📖' };

export function Resources() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const { data: resources, isLoading } = useResources({ ...(search ? { q: search } : {}), ...(type ? { type } : {}) });

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-indigo-500" />
        <select value={type} onChange={e => setType(e.target.value)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none">
          <option value="">All types</option>
          {['link', 'note', 'video', 'file', 'doc'].map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
        </select>
      </div>
      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      <div className="flex flex-col gap-2">
        {resources?.map(r => (
          <div key={r.id} className="flex items-start gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
            <span className="text-lg mt-0.5">{TYPE_ICONS[r.type] ?? '📎'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{r.title}</div>
              {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline truncate block">{r.url}</a>}
              {r.notes && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{r.notes}</div>}
              {r.task_ids.length > 0 && <div className="text-xs text-gray-600 mt-1">{r.task_ids.length} task{r.task_ids.length > 1 ? 's' : ''} linked</div>}
            </div>
          </div>
        ))}
        {!isLoading && resources?.length === 0 && <div className="text-gray-600 text-sm">No resources found</div>}
      </div>
    </div>
  );
}
