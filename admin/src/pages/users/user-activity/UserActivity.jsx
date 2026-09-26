import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Search,
  X,
  Calendar,
  Users,
  LogIn,
  Eye,
  Clock,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { insightsApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatDateTime } from '../../../utils/format';

const formatHour = (hour) => {
  if (hour === null || hour === undefined || isNaN(Number(hour))) return '—';
  const h = Math.round(Number(hour));
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
};

export default function UserActivity() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const loadMoreRef = useRef(null);
  const limit = 20;

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin-user-activity', search, date],
    queryFn: ({ pageParam }) =>
      insightsApi.getUserActivity({
        search: search.trim() || undefined,
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
  const metrics = data?.pages?.[0]?.data?.metrics || {
    total_users: total,
    total_logins: users.reduce((s, u) => s + (parseInt(u.login_count, 10) || 0), 0),
    total_views: users.reduce((s, u) => s + (parseInt(u.views_count, 10) || 0), 0),
    peak_hour: null,
  };

  /* ── Infinite scroll observer ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '240px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Color generator for avatar initials
  const getAvatarBg = (name) => {
    const colors = [
      'bg-slate-700 text-white',
      'bg-indigo-600 text-white',
      'bg-blue-600 text-white',
      'bg-emerald-600 text-white',
      'bg-violet-600 text-white',
      'bg-amber-600 text-white',
      'bg-cyan-700 text-white',
    ];
    if (!name) return colors[0];
    const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return colors[code % colors.length];
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                User Activity & Sessions
              </h1>
              <p className="text-xs text-slate-500">
                Track live logins, peak engagement windows, and customer product interactions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            title="Refresh activity logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Real-Time Metrics Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Users</p>
            <p className="text-xl font-bold text-slate-900">{metrics.total_users ?? total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <LogIn className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {date ? 'Day Logins' : 'Total Logins'}
            </p>
            <p className="text-xl font-bold text-slate-900">{Number(metrics.total_logins || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Catalog Views</p>
            <p className="text-xl font-bold text-slate-900">{Number(metrics.total_views || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Peak Hour</p>
            <p className="text-xl font-bold text-slate-900">
              {formatHour(metrics.peak_hour)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, or phone…"
            className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-slate-50/50 hover:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex items-center flex-1 sm:flex-initial">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-slate-700 transition-all cursor-pointer"
            />
            {date && (
              <button
                onClick={() => setDate('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Clear date"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-2 rounded-xl">
            {total} Record{total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Main Data Table ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-400 font-medium">Loading user activity ledger...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-14 text-center">#</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5 text-center">Login Frequency</th>
                  <th className="px-5 py-3.5">Last Login Time</th>
                  <th className="px-5 py-3.5 text-center">Peak Active Hour</th>
                  <th className="px-5 py-3.5 text-center">Product Views</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Activity className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-800">No user activity recorded</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        {search || date
                          ? 'No customer activity logs match your active filters. Try modifying your search or clearing date.'
                          : 'As customers sign in and browse the catalog, their engagement timestamps and metrics will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => {
                    const initials = (u.name || 'User')
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join('');

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/users/${u.id}`)}
                      >
                        <td className="px-5 py-4 text-center text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                          {idx + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${getAvatarBg(
                                u.name
                              )}`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate flex items-center gap-1.5">
                                <span>{u.name || 'Unnamed Customer'}</span>
                              </div>
                              <div className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                {u.email && <span>{u.email}</span>}
                                {u.email && u.phone && <span>•</span>}
                                {u.phone && <span>{u.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              u.login_count > 10
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : u.login_count > 0
                                ? 'bg-slate-100 text-slate-700 border border-slate-200/60'
                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}
                          >
                            <LogIn className="w-3 h-3" />
                            {u.login_count} {u.login_count === 1 ? 'login' : 'logins'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600 text-xs">
                          {u.last_login_at ? (
                            <div className="space-y-0.5">
                              <span className="font-medium text-slate-800 block">
                                {formatDateTime(u.last_login_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Never logged in</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {u.most_active_hour !== null && u.most_active_hour !== undefined ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {formatHour(u.most_active_hour)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              u.views_count > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            {u.views_count} {u.views_count === 1 ? 'view' : 'views'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/users/${u.id}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
                            title="View Customer Profile"
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Sentinel & Infinite Scroll Indicator ── */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-6 border-t border-slate-100">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Spinner size="sm" />
                  <span>Loading more activity logs…</span>
                </div>
              ) : (
                <button
                  onClick={() => fetchNextPage()}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Load Next Batch
                </button>
              )}
            </div>
          )}

          {!hasNextPage && users.length > 0 && (
            <div className="text-center py-4 bg-slate-50/50 border-t border-slate-100 text-xs font-medium text-slate-400">
              Showing all {users.length} loaded records of {total} registered users
            </div>
          )}
        </div>
      )}
    </div>
  );
}
