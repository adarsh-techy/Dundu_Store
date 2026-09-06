import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, Trash2, X } from 'lucide-react';
import { wishlistApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import CategoryChips from '../../../components/ui/CategoryChips';
import { formatPrice, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

function ConfirmModal({ title, message, confirmLabel, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" size="sm" loading={loading} onClick={handle}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Wishlists() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const loadMoreRef = useRef(null);
  const limit = 15;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-wishlists', search, category, date],
    queryFn: ({ pageParam }) => wishlistApi.listAll({
      search: search || undefined,
      category: category || undefined,
      date: date || undefined,
      page: pageParam,
      limit,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.wishlists?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
  const wishlists = data?.pages.flatMap((p) => p.data?.wishlists || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;

  // Distinct users among currently loaded items
  const userCount = new Set(wishlists.map((w) => w.user_id)).size;

  const doRemove = async () => {
    await wishlistApi.remove(deleteTarget.id);
    qc.invalidateQueries({ queryKey: ['admin-wishlists'] });
    toast.success('Removed from wishlist');
    setDeleteTarget(null);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" /> Wishlists
          </h1>
          {!isLoading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {total} item{total !== 1 ? 's' : ''} total · {wishlists.length} loaded across {userCount} user{userCount !== 1 ? 's' : ''}
            </p>
          )}
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
              placeholder="Search user or product…"
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

      <CategoryChips value={category} onChange={setCategory} />

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-pink-50 text-xs text-pink-500 uppercase tracking-wide">
              <tr>
                {['#', 'Product', 'Price', 'User', 'Contact', 'Added', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left font-medium ${h === '#' ? 'w-12' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wishlists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400">
                    <Heart className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                    No wishlist items found
                  </td>
                </tr>
              ) : wishlists.map((w, idx) => (
                <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {w.image_url
                        ? <img src={w.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />}
                      <span className="font-medium text-gray-800">{w.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {w.offer_price ? (
                      <div>
                        <span className="font-semibold text-pink-600">{formatPrice(w.offer_price)}</span>
                        <span className="text-xs text-gray-400 line-through ml-1">{formatPrice(w.price)}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-800">{formatPrice(w.price)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/users/${w.user_id}`)}
                      className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {w.user_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <div>{w.user_email || '—'}</div>
                    <div className="text-gray-400">{w.user_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(w.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteTarget(w)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
      {!hasNextPage && wishlists.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {wishlists.length} of {total}</div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Remove Wishlist Item"
          message={`Remove "${deleteTarget.product_name}" from ${deleteTarget.user_name}'s wishlist?`}
          confirmLabel="Remove"
          onClose={() => setDeleteTarget(null)}
          onConfirm={doRemove}
        />
      )}
    </div>
  );
}
