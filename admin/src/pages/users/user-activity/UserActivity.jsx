import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Activity, X } from 'lucide-react';
import { insightsApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatDateTime } from '../../../utils/format';

const formatHour = (hour) => {
  if (hour === null || hour === undefined) return '—';
  const h = Math.round(Number(hour));
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
};

export default function UserActivity() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
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
    queryKey: ['admin-user-activity', search, date],
    queryFn: ({ pageParam }) => insightsApi.getUserActivity({
      search: search || undefined,
      date: date || undefined,
      page: pageParam,
      limit,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.users?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
  const users = data?.pages.flatMap((p) => p.data?.users || []) || [];
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-pink-500" /> User Activity
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} user{total !== 1 ? 's' : ''}</p>
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
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or phone…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-pink-100 text-xs text-pink-500 uppercase tracking-wide">
              <tr>
                {['#', 'User', 'Logins', 'Last Login', 'Most Active Hour', 'Products Viewed'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left font-medium ${h === '#' ? 'w-12' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
              ) : users.map((u, idx) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  <td className="px-4 py-3 text-xs font-semibold text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-indigo-600">{u.name}</div>
                    <div className="text-xs text-gray-400">{u.email || u.phone || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {u.login_count} login{u.login_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.last_login_at ? formatDateTime(u.last_login_at) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatHour(u.most_active_hour)}</td>
                  <td className="px-4 py-3 text-gray-500">{u.views_count}</td>
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
      {!hasNextPage && users.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {users.length} of {total}</div>
      )}
    </div>
  );
}
