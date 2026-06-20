import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Item } from '../api/queries';
import { useItems } from '../api/queries';
import { markItemAvailable, markItemConsumed, markItemAvailableAgain } from '../api/mutations';

function ItemRow({ item }: { item: Item }) {
  const qc = useQueryClient();

  const markAvailable = async () => { await markItemAvailable(item.id); await qc.invalidateQueries(); };
  const markConsumed = async () => { await markItemConsumed(item.id); await qc.invalidateQueries(); };
  const markAvailableAgain = async () => { await markItemAvailableAgain(item.id); await qc.invalidateQueries(); };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <div className={`w-2 h-2 rounded-full ${item.status === 'to_buy' ? 'bg-yellow-400' : item.status === 'available' ? 'bg-green-400' : 'bg-gray-600'}`} />
      <span className="flex-1 text-sm text-white">{item.name}</span>
      {item.quantity && <span className="text-xs text-gray-500">×{item.quantity}</span>}
      <div className="flex gap-2">
        {item.status === 'to_buy' && (
          <button onClick={markAvailable} className="text-xs px-2 py-1 bg-green-800 text-green-200 rounded hover:bg-green-700">Mark bought</button>
        )}
        {item.status === 'available' && (
          <button onClick={markConsumed} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">Mark used</button>
        )}
        {item.status === 'consumed' && (
          <button onClick={markAvailableAgain} className="text-xs px-2 py-1 bg-blue-800 text-blue-200 rounded hover:bg-blue-700">Still available</button>
        )}
      </div>
    </div>
  );
}

export function Items() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'to_buy';
  const { data: items, isLoading } = useItems(status !== 'all' ? { status } : {});

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-1">
        {(['to_buy', 'available', 'all'] as const).map(s => (
          <button key={s} onClick={() => setSearchParams({ status: s })}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'}`}>
            {s === 'to_buy' ? '🛒 To Buy' : s === 'available' ? '✅ Available' : '🗄 All'}
          </button>
        ))}
      </div>
      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      {!isLoading && items?.length === 0 && <div className="text-gray-600 text-sm">No items</div>}
      <div className="flex flex-col gap-2">
        {items?.map(item => <ItemRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}
