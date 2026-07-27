import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { cartApi } from '../api';
import Spinner from '../components/ui/Spinner';
import CategoryChips from '../components/ui/CategoryChips';
import { formatDate } from '../utils/format';

export default function CartMonitor() {
  const navigate = useNavigate();
  const [abandoned, setAbandoned] = useState(false);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const loadMoreRef = useRef(null);
  const limit = 15;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-carts', abandoned, category, date],
    queryFn: ({ pageParam }) => cartApi.monitor({
      abandoned: abandoned ? 'true' : 'false',
      category: category || undefined,
      date: date || undefined,
      page: pageParam,
      limit,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.carts?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
  const carts = data?.pages.flatMap((p) => p.data?.carts || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;

  /* ── lazy-load next page as the sentinel scrolls into view ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Cart Monitor</h1>
          <span className="text-sm text-gray-400">{total} customer{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 text-gray-700"
            />
            {date && (
              <button
                onClick={() => setDate('')}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Clear date filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[['Active', false], ['Abandoned (24h+)', true]].map(([label, val]) => (
              <button key={label} onClick={() => setAbandoned(val)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${abandoned === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CategoryChips value={category} onChange={setCategory} />

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-pink-100 text-xs text-pink-500 uppercase tracking-wide">
              <tr>{['Customer', 'Phone', 'Items in Cart', 'Last Active'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {carts.length === 0
                ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">No {abandoned ? 'abandoned' : 'active'} carts{category ? ' in this category' : ''}</td></tr>
                : carts.map((c) => (
                  <tr key={c.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/users/${c.user_id}`)}
                        className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">{c.items} items</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.last_active)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── lazy-load sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && <span className="text-sm text-gray-400">Loading more…</span>}
        </div>
      )}
      {!hasNextPage && carts.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {carts.length} of {total}</div>
      )}
    </div>
  );
}
