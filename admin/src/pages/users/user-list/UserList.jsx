import { useState, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Trash2, Store, X, Eye, Ban, CheckCircle2,
  Phone, Mail, Users, Calendar, RefreshCw, ShieldCheck,
  ShieldAlert, UserCheck, UserX, ShoppingBag,
} from 'lucide-react';
import { userApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal';
import { formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

function DeleteConfirmModal({ user, onClose, onConfirmed }) {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirmed();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Delete Customer Account" onClose={onClose} size="sm">
      <div className="space-y-4 text-xs">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 leading-relaxed text-rose-800">
          <p className="font-bold mb-1">Permanent Data Removal</p>
          Deleting <span className="font-bold underline">{user.name}</span> will permanently wipe their account history, saved shipping addresses, and cart data.
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-400 font-mono bg-slate-50 focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-2.5 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={typed !== 'DELETE'}
            loading={loading}
            onClick={handleDelete}
          >
            Confirm Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const LIMIT = 20;

export default function UserList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [date, setDate] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'active' | 'blocked' | 'in_store'
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debounceRef = useRef(null);
  const loadMoreRef = useRef(null);

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin-users', activeSearch, date],
    queryFn: ({ pageParam = 1 }) =>
      userApi.list({
        page: pageParam,
        limit: LIMIT,
        search: activeSearch || undefined,
        date: date || undefined,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((acc, p) => acc + (p?.data?.users?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const rawUsers = data ? data.pages.flatMap((p) => p.data.users) : [];
  const total = data?.pages[0]?.data.total ?? 0;

  // Client-side filter for quick tabs
  const users = useMemo(() => {
    if (!statusFilter) return rawUsers;
    if (statusFilter === 'active') return rawUsers.filter((u) => !u.is_blocked);
    if (statusFilter === 'blocked') return rawUsers.filter((u) => u.is_blocked);
    if (statusFilter === 'in_store') return rawUsers.filter((u) => u.is_offline);
    return rawUsers;
  }, [rawUsers, statusFilter]);

  // Aggregate KPI stats
  const stats = useMemo(() => {
    let active = 0;
    let blocked = 0;
    let inStore = 0;
    let codBlocked = 0;

    rawUsers.forEach((u) => {
      if (u.is_blocked) blocked++;
      else active++;
      if (u.is_offline) inStore++;
      if (u.is_cod_blocked) codBlocked++;
    });

    return { total, active, blocked, inStore, codBlocked };
  }, [rawUsers, total]);

  // Search debounce
  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(val), 300);
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleBlock = async (id, currentBlocked) => {
    try {
      await userApi.toggleBlock(id);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(currentBlocked ? 'User account unblocked' : 'User account blocked');
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const toggleCod = async (id, isCodBlocked) => {
    try {
      await userApi.toggleCodBlock(id);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(isCodBlocked ? 'COD payment enabled' : 'COD payment restricted');
    } catch {
      toast.error('Failed to update COD permission');
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await userApi.remove(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Customer profile removed');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── 1. Top Executive Command Bar ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Customer Directory
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {Number(total).toLocaleString('en-IN')} Customer{total !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage registered shoppers, POS in-store profiles, referral programs, and payment privileges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Customers"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Real-Time Customer Metrics Strip ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{total.toLocaleString('en-IN')}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">{stats.active}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Customers</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-700">{stats.inStore}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In-Store / POS</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-rose-700">{stats.blocked}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blocked Accounts</p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Strip ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, email, phone, referral…"
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400 text-slate-700 transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setActiveSearch('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Date Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/60">
            {[
              ['', 'All Customers'],
              ['active', 'Active'],
              ['in_store', 'In-Store'],
              ['blocked', 'Blocked'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === val
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
            />
            {date && (
              <button
                onClick={() => setDate('')}
                className="text-slate-400 hover:text-rose-500 transition-colors ml-1"
                title="Clear date filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Full-Width Customer Directory Table ───────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading customer profiles...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-12 text-slate-400 text-center">#</th>
                  <th className="px-5 py-3.5">Customer Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Referral Code</th>
                  <th className="px-5 py-3.5">Referred By</th>
                  <th className="px-5 py-3.5 text-center">Total Invites</th>
                  <th className="px-5 py-3.5">Joined Date</th>
                  <th className="px-5 py-3.5 text-center">Account Status</th>
                  <th className="px-5 py-3.5 text-center">COD Privilege</th>
                  <th className="px-5 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-20 text-slate-400 text-xs">
                      <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No matching customer accounts found
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/users/${u.id}`)}
                    >
                      {/* Serial Number */}
                      <td className="px-5 py-3.5 font-mono text-slate-400 text-center text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Customer Avatar & Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            {u.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors block truncate max-w-[150px]">
                              {u.name || 'Anonymous User'}
                            </span>
                            {u.is_offline && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-0.5">
                                <Store className="h-2.5 w-2.5" /> In-Store POS
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          {u.phone && (
                            <div className="font-mono text-slate-700 flex items-center gap-1.5 font-semibold text-[11px]">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          {u.email && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate max-w-[160px]">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{u.email}</span>
                            </div>
                          )}
                          {!u.phone && !u.email && <span className="text-slate-400">—</span>}
                        </div>
                      </td>

                      {/* Referral Code */}
                      <td className="px-5 py-3.5">
                        {u.referral_code ? (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {u.referral_code}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Referred By */}
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                        {u.referred_by_name ? (
                          <span className="font-semibold text-slate-800">{u.referred_by_name}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Referral Count */}
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {u.referred_count ?? 0}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Account Status Badge */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.is_blocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_blocked ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          {u.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>

                      {/* COD Permission Badge / Toggle */}
                      <td
                        className="px-5 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleCod(u.id, u.is_cod_blocked)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                            u.is_cod_blocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={u.is_cod_blocked ? 'Click to Enable COD' : 'Click to Restrict COD'}
                        >
                          {u.is_cod_blocked ? (
                            <>
                              <ShieldAlert className="h-3 w-3 text-rose-600" /> COD Blocked
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3 w-3 text-emerald-600" /> COD Allowed
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/users/${u.id}`)}
                            title="View Full Profile"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => toggleBlock(u.id, u.is_blocked)}
                            title={u.is_blocked ? 'Unblock User' : 'Block User'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_blocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {u.is_blocked ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            onClick={() => setDeleteTarget(u)}
                            title="Delete User"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Lazy-load Sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && (
            <span className="text-xs font-semibold text-slate-400">Loading more customers…</span>
          )}
        </div>
      )}
      {!hasNextPage && users.length > 0 && (
        <div className="text-center py-4 text-xs font-medium text-slate-400">
          Showing all {users.length} of {total} registered customers
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}
