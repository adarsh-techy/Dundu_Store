import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Trash2, Store, X, Eye, Ban, CheckCircle2,
  ShieldAlert, Phone, Mail, User, Users, Calendar, ArrowUpRight,
} from 'lucide-react';
import { userApi } from '../../../api';
import Badge from '../../../components/ui/Badge';
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
    <Modal title="Delete User Account" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm text-rose-700 font-semibold">This action is permanent and cannot be undone.</p>
          <p className="text-xs text-rose-600 mt-1">
            All data for <span className="font-bold">{user.name}</span> (orders, addresses, cart items) will be removed.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 font-mono bg-slate-50"
          />
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant="danger"
            size="sm"
            disabled={typed !== 'DELETE'}
            loading={loading}
            onClick={handleDelete}
          >
            Delete User
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const LIMIT = 15;

export default function UserList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [date, setDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debounceRef = useRef(null);
  const loadMoreRef = useRef(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-users', activeSearch, date],
    queryFn: ({ pageParam = 1 }) => userApi.list({
      page: pageParam,
      limit: LIMIT,
      search: activeSearch || undefined,
      date: date || undefined,
    }),
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.data.total;
      const loaded = allPages.reduce((acc, p) => acc + p.data.users.length, 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const users = data ? data.pages.flatMap((p) => p.data.users) : [];
  const total = data?.pages[0]?.data.total ?? 0;

  // Search debounce
  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(val), 350);
  };

  // Intersection observer for infinite scroll
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
      qc.invalidateQueries(['admin-users']);
      toast.success(currentBlocked ? 'User account unblocked' : 'User account blocked');
    } catch {
      toast.error('Failed to update user');
    }
  };

  const toggleCod = async (id, isCodBlocked) => {
    try {
      await userApi.toggleCodBlock(id);
      qc.invalidateQueries(['admin-users']);
      toast.success(isCodBlocked ? 'COD payment enabled for user' : 'COD payment blocked for user');
    } catch {
      toast.error('Failed to update COD status');
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await userApi.remove(deleteTarget.id);
      qc.invalidateQueries(['admin-users']);
      toast.success('User deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">

      {/* ── Top Header Toolbar ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {Number(total).toLocaleString('en-IN')} Users
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Manage customer accounts, payment permissions, and orders</p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto items-center">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search by name, email, phone…"
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50/70 focus:bg-white focus:outline-none focus:border-indigo-400 text-slate-700 transition-colors"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setActiveSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50/70 focus:bg-white focus:outline-none focus:border-indigo-400 text-slate-700 transition-colors"
          />
          {date && (
            <button
              onClick={() => setDate('')}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table Container ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-80 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-400">Loading customer list...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-left text-[11px] font-bold text-indigo-100 uppercase tracking-wider shadow-sm">
                  <th className="px-5 py-3.5 w-12 text-center">#</th>
                  <th className="px-5 py-3.5">Customer Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Referral Code</th>
                  <th className="px-5 py-3.5">Referred By</th>
                  <th className="px-5 py-3.5 text-center">Refers</th>
                  <th className="px-5 py-3.5">Joined Date</th>
                  <th className="px-5 py-3.5 text-center">Account Status</th>
                  <th className="px-5 py-3.5 text-center">COD Access</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-slate-400 text-xs">
                      No matching customers found
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Serial Number */}
                      <td className="px-5 py-4 text-xs font-semibold text-slate-400 text-center">
                        {idx + 1}
                      </td>

                      {/* Customer Avatar & Name (Click to view details) */}
                      <td className="px-5 py-4">
                        <Link
                          to={`/users/${u.id}`}
                          className="flex items-center gap-3 text-left group/user cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-xs shrink-0 shadow-xs group-hover/user:scale-105 group-hover/user:bg-indigo-100 group-hover/user:border-indigo-300 transition-all">
                            {u.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-[140px] group-hover/user:text-indigo-600 group-hover/user:underline transition-colors">
                              {u.name}
                            </span>
                            {u.is_offline && (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md mt-0.5">
                                <Store className="h-2.5 w-2.5" /> In-Store
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Contact Info */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{u.email || '—'}</span>
                          </div>
                          {u.phone && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Referral Code */}
                      <td className="px-5 py-4">
                        {u.referral_code ? (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                            {u.referral_code}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Referred By */}
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                        {u.referred_by_name ? (
                          <span className="text-indigo-600 font-bold">{u.referred_by_name}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Referral Count */}
                      <td className="px-5 py-4 text-center">
                        <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {u.referred_count ?? 0}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4 text-xs font-medium text-slate-400">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Account Status Badge */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            u.is_blocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {u.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>

                      {/* COD Permission Badge / Toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => toggleCod(u.id, u.is_cod_blocked)}
                          className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border transition-all ${
                            u.is_cod_blocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={u.is_cod_blocked ? 'Click to Enable COD' : 'Click to Block COD'}
                        >
                          {u.is_cod_blocked ? '🚫 COD Blocked' : '✅ COD Allowed'}
                        </button>
                      </td>

                      {/* Actions (Pure Borderless/Backgroundless Icon Buttons) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* 1. View User Details */}
                          <button
                            onClick={() => navigate(`/users/${u.id}`)}
                            title="View Full Profile"
                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* 2. Block / Unblock User */}
                          <button
                            onClick={() => toggleBlock(u.id, u.is_blocked)}
                            title={u.is_blocked ? 'Unblock User Account' : 'Block User Account'}
                            className={`p-1 transition-colors ${
                              u.is_blocked
                                ? 'text-emerald-500 hover:text-emerald-600'
                                : 'text-amber-500 hover:text-amber-600'
                            }`}
                          >
                            <Ban className="h-4 w-4" />
                          </button>

                          {/* 3. Delete User */}
                          <button
                            onClick={() => setDeleteTarget(u)}
                            title="Delete User"
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
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
          {isFetchingNextPage && <span className="text-xs font-semibold text-slate-400">Loading more customers…</span>}
        </div>
      )}
      {!hasNextPage && users.length > 0 && (
        <div className="text-center py-4 text-xs font-medium text-slate-400">
          — Showing all {users.length} registered customers —
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
