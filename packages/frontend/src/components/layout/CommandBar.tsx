import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props { placeholder?: string; }

export function CommandBar({ placeholder = '⌘  Search or capture anything...' }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    navigate(`/tasks?search=${encodeURIComponent(value.trim())}`);
    setValue('');
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition-colors border border-gray-700">
        {placeholder}
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-gray-900 rounded-xl border border-gray-700 shadow-2xl p-4 flex flex-col gap-3">
            <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={!value.trim()}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
                Search
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
