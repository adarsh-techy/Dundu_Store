import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  ScrollText, Search, X, RefreshCw, Filter, Plus, Pencil, Trash2, LogIn, Activity,
  Users, AlertTriangle, Clock, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auditApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import StatCard from '../../../components/ui/StatCard';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';

const ACTION_META = {
  create: { label: 'Created', color: 'green', icon: Plus },
  update: { label: 'Updated', color: 'blue', icon: Pencil },
  delete: { label: 'Deleted', color: 'red', icon: Trash2 },
  login:  { label: 'Login',   color: 'indigo', icon: LogIn },
  other:  { label: 'Action',  color: 'gray', icon: Activity },
};
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const ago = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
const humanEntity = (e) => (e || '').replace(/[-_]/g, ' ');

export default function AuditLog() {
  const limit = 40;
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState({ actor: '', action: '', entity: '', from: '', to: '' });
  const [selected, setSelected] = useState(null);

  // Debounce the search box without an effect: derive when the user pauses typing.
  const applySearch = (v) => { setSearch(v); clearTimeout(applySearch.t); applySearch.t = setTimeout(() => setDebounced(v), 300); };

  const params = useMemo(() => ({
    limit,
    search: debounced.trim() || undefined,
    actor: filters.actor || undefined, action: filters.action || undefined, entity: filters.entity || undefined,
    from: filters.from || undefined, to: filters.to || undefined,
  }), [limit, debounced, filters]);

  // Lazy loading: pages are fetched as the table is scrolled to the bottom.
  const { data, isLoading, isFetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['audit-logs', params],
    queryFn: ({ pageParam = 1 }) => auditApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const total = last?.data?.total || 0;
      const loaded = all.reduce((n, p) => n + (p?.data?.logs?.length || 0), 0);
      return loaded < total ? all.length + 1 : undefined;
    },
  });
  useEffect(() => {
    const root = scrollRef.current; const el = sentinelRef.current;
    if (!root || !el) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { root, rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const { data: fData } = useQuery({ queryKey: ['audit-filters'], queryFn: auditApi.filters, staleTime: 60_000 });
  const { data: detail } = useQuery({ queryKey: ['audit-log', selected], queryFn: () => auditApi.getOne(selected), enabled: !!selected });

  const logs = useMemo(() => (data?.pages || []).flatMap((p) => p?.data?.logs || []), [data]);
  const total = data?.pages?.[0]?.data?.total || 0;
  const stats = fData?.data?.stats || {};
  const actors = fData?.data?.actors || [];
  const entities = fData?.data?.entities || [];
  const actions = fData?.data?.actions || [];
  const activeFilters = Object.values(filters).filter(Boolean).length + (debounced ? 1 : 0);
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clearAll = () => { setFilters({ actor: '', action: '', entity: '', from: '', to: '' }); setSearch(''); setDebounced(''); };

  const copyJson = (obj) => { navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).then(() => toast.success('Copied')); };
  const log = detail?.data?.log;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ScrollText className="h-5 w-5 text-indigo-600" /> Audit log</h1>
          <p className="text-xs text-gray-400 mt-0.5">Every change made in the admin panel — who, what, when and from where. Entries cannot be edited.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total entries" value={stats.total ?? '—'} icon={ScrollText} color="indigo" />
        <StatCard title="Last 24 hours" value={stats.last_24h ?? '—'} icon={Clock} color="blue" />
        <StatCard title="Deletions (7 days)" value={stats.deletes_7d ?? '—'} icon={AlertTriangle} color={stats.deletes_7d ? 'rose' : 'green'} />
        <StatCard title="Active admins (7 days)" value={stats.active_admins_7d ?? '—'} icon={Users} color="purple" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => applySearch(e.target.value)} placeholder="Search summary, admin, record id, payload…" className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400" />
          {search && <button onClick={() => applySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>}
        </div>
        <select value={filters.actor} onChange={(e) => setF('actor', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white">
          <option value="">All admins</option>
          {actors.map((a) => <option key={a.id} value={a.id}>{a.name || a.email} ({a.count})</option>)}
        </select>
        <select value={filters.action} onChange={(e) => setF('action', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a.value} value={a.value}>{ACTION_META[a.value]?.label || a.value} ({a.count})</option>)}
        </select>
        <select value={filters.entity} onChange={(e) => setF('entity', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white capitalize">
          <option value="">All areas</option>
          {entities.map((e) => <option key={e.value} value={e.value}>{humanEntity(e.value)} ({e.count})</option>)}
        </select>
        <input type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white" aria-label="From date" />
        <input type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white" aria-label="To date" />
        {activeFilters > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs font-medium text-indigo-600 px-2 py-2 hover:underline"><Filter className="h-3.5 w-3.5" /> Clear ({activeFilters})</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? <Spinner /> : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ScrollText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">{activeFilters ? 'No entries match these filters' : 'No activity recorded yet'}</p>
            <p className="text-sm mt-1">{activeFilters ? 'Try widening the date range or clearing filters.' : 'Actions taken in the admin panel will appear here automatically.'}</p>
          </div>
        ) : (
          <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 320 }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 shadow-[0_1px_0_#e5e7eb]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold w-10">#</th>
                  <th className="text-left px-4 py-2.5 font-semibold">When</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Admin</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold">What happened</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Area</th>
                  <th className="text-left px-4 py-2.5 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l, i) => {
                  const m = ACTION_META[l.action] || ACTION_META.other;
                  const Icon = m.icon;
                  return (
                    <tr key={l.id} onClick={() => setSelected(l.id)} className="hover:bg-indigo-50/40 cursor-pointer">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="text-gray-800 text-xs font-medium">{ago(l.created_at)}</p>
                        <p className="text-[11px] text-gray-400">{fmt(l.created_at)}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{(l.actor_name || l.actor_email || '?')[0].toUpperCase()}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate max-w-40">{l.actor_name || l.actor_email || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-400">{l.actor_role === 'super_admin' ? 'Super admin' : l.actor_role === 'admin' ? 'Branch admin' : l.actor_role || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Badge color={m.color}><Icon className="h-3 w-3 mr-1" />{m.label}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-md"><p className="truncate">{l.summary}</p><p className="text-[10px] text-gray-400 font-mono truncate">{l.method} {l.path}</p></td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 capitalize whitespace-nowrap">{humanEntity(l.entity_type)}{l.entity_id ? <span className="text-gray-400 font-mono"> · {String(l.entity_id).slice(0, 8)}</span> : ''}</td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-400 font-mono whitespace-nowrap">{l.ip || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div ref={sentinelRef} className="h-px" />
            {isFetchingNextPage && <div className="py-3 text-center text-xs text-gray-400">Loading more…</div>}
            {!hasNextPage && logs.length > 0 && <div className="py-3 text-center text-[11px] text-gray-300">End of log</div>}
          </div>
        )}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
            <span>Loaded {logs.length} of {total}</span>
            {hasNextPage && <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-indigo-600 font-medium hover:underline disabled:opacity-50">Load more</button>}
          </div>
        )}
      </div>

      {selected && (
        <Modal title="Audit entry" onClose={() => setSelected(null)} size="lg">
          {!log ? <Spinner /> : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">{log.summary}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(log.created_at)} · entry #{log.id}</p>
                </div>
                <Badge color={(ACTION_META[log.action] || ACTION_META.other).color}>{(ACTION_META[log.action] || ACTION_META.other).label}</Badge>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  ['Admin', `${log.actor_name || '—'}${log.actor_email ? ` (${log.actor_email})` : ''}`],
                  ['Role', log.actor_role || '—'],
                  ['Area', `${humanEntity(log.entity_type)}${log.entity_id ? ` · ${log.entity_id}` : ''}`],
                  ['Request', `${log.method || ''} ${log.path || ''}`],
                  ['Result', log.status_code ? `HTTP ${log.status_code}` : '—'],
                  ['IP address', log.ip || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-gray-400">{k}</dt>
                    <dd className="text-gray-800 mt-0.5 break-all">{v}</dd>
                  </div>
                ))}
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 col-span-2 sm:col-span-3">
                  <dt className="text-[10px] uppercase tracking-wide text-gray-400">Browser</dt>
                  <dd className="text-gray-600 mt-0.5 break-all">{log.user_agent || '—'}</dd>
                </div>
              </dl>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-700">Submitted data</p>
                  {log.details && <button onClick={() => copyJson(log.details)} className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"><Copy className="h-3 w-3" /> Copy JSON</button>}
                </div>
                {log.details
                  ? <pre className="text-[11px] leading-relaxed bg-gray-900 text-gray-100 rounded-xl p-3 overflow-auto max-h-72">{JSON.stringify(log.details, null, 2)}</pre>
                  : <p className="text-xs text-gray-400">No payload was recorded for this action.</p>}
                <p className="text-[10px] text-gray-400 mt-1.5">Passwords, tokens and secrets are masked as *** before storage.</p>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
