import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../api/queries';

const STATUS_LABEL: Record<string, string> = {
  ready: 'Ready', ongoing: 'Ongoing', pending: 'Pending', planned: 'Planned', done: 'Done',
  to_buy: 'To Buy', available: 'Available', consumed: 'Consumed',
  draft: 'Draft', active: 'Active', on_hold: 'On Hold',
};

export function TopBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setOpen(debouncedQuery.length >= 2);
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data, isFetching } = useSearch(debouncedQuery);

  const handleSelect = (type: 'task' | 'project' | 'item', entityId: string) => {
    if (type === 'task') navigate(`/tasks/${entityId}`);
    else if (type === 'project') navigate('/tasks');
    else navigate('/items');
    setQuery('');
    setOpen(false);
  };

  const hasResults = data && (data.tasks.length > 0 || data.projects.length > 0 || data.items.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="⌘  Search tasks, projects, items..."
        className="w-full px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm placeholder-gray-500 outline-none border border-gray-700 focus:border-indigo-500 transition-colors"
      />
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          {isFetching && !data && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          )}
          {!isFetching && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500">No results for &quot;{debouncedQuery}&quot;</div>
          )}
          {data && data.tasks.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</div>
              {data.tasks.map(hit => (
                <button key={hit.entityId} type="button"
                  onClick={() => handleSelect('task', hit.entityId)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors text-left">
                  <span>☐ {hit.name}</span>
                  {hit.status && <span className="text-xs text-gray-500 shrink-0 ml-2">{STATUS_LABEL[hit.status] ?? hit.status}</span>}
                </button>
              ))}
            </div>
          )}
          {data && data.projects.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</div>
              {data.projects.map(hit => (
                <button key={hit.entityId} type="button"
                  onClick={() => handleSelect('project', hit.entityId)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors text-left">
                  <span>📁 {hit.name}</span>
                  {hit.status && <span className="text-xs text-gray-500 shrink-0 ml-2">{STATUS_LABEL[hit.status] ?? hit.status}</span>}
                </button>
              ))}
            </div>
          )}
          {data && data.items.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</div>
              {data.items.map(hit => (
                <button key={hit.entityId} type="button"
                  onClick={() => handleSelect('item', hit.entityId)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors text-left">
                  <span>📦 {hit.name}</span>
                  {hit.status && <span className="text-xs text-gray-500 shrink-0 ml-2">{STATUS_LABEL[hit.status] ?? hit.status}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
