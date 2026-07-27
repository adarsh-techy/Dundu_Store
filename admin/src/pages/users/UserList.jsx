import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Store, X } from 'lucide-react';
import { userApi } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/format';
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
    <Modal title="Delete User" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">This action is permanent and cannot be undone.</p>
          <p className="text-sm text-red-600 mt-1">
            All data for <span className="font-bold">{user.name}</span> — orders, addresses, and cart — will be deleted.
          </p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-400 font-mono"
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
    queryFn: ({ pageParam }) => userApi.list({ search: activeSearch || undefined, date: date || undefined, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.users?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
  const users = data?.pages.flatMap((p) => p.data?.users || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setActiveSearch(val); }, 300);
  };

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

  const toggleBlock = async (id, blocked) => {
    try {
      await userApi.toggleBlock(id);
      invalidate();
      toast.success(blocked ? 'User unblocked' : 'User blocked');
    } catch { toast.error('Failed'); }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await userApi.remove(deleteTarget.id);
      invalidate();
      toast.success('User deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <span className="text-sm text-gray-400">{total} user{total !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={handleSearch} placeholder="Search by name, email or phone..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white" />
        </div>
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
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-pink-100 text-xs text-pink-500 uppercase tracking-wide">
              <tr>{['Name', 'Email / Phone', 'Referral Code', 'Referred By', 'Refers', 'Joined', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/users/${u.id}`)} className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium leading-none">{u.name}</span>
                        {u.is_offline && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            <Store className="h-2.5 w-2.5" /> In-Store
                          </span>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div>{u.email || '—'}</div>
                    <div className="text-xs text-gray-400">{u.phone || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.referral_code
                      ? <span className="font-mono text-xs px-2 py-1 rounded bg-pink-50 text-pink-600 border border-pink-100">{u.referral_code}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.referred_by_name
                      ? <span className="text-indigo-600 font-medium">{u.referred_by_name}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-pink-600">{u.referred_count ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.is_blocked ? 'red' : 'green'}>{u.is_blocked ? 'Blocked' : 'Active'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="xs" variant={u.is_blocked ? 'success' : 'danger'} onClick={() => toggleBlock(u.id, u.is_blocked)}>
                        {u.is_blocked ? 'Unblock' : 'Block'}
                      </Button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        title="Delete user"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
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
