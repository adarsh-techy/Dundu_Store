import { useState, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, Heart, Trash2, X, RefreshCw, Package, Phone,
  Calendar, ExternalLink, MessageCircle, Filter, TrendingUp,
  BookmarkCheck, Users,
} from 'lucide-react';
import { wishlistApi, categoryApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatPrice, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

function ConfirmModal({ title, message, confirmLabel, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="space-y-4 text-xs">
        <p className="text-slate-600 leading-relaxed">{message}</p>
        <div className="flex gap-2.5 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={loading} onClick={handle}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Wishlists() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const loadMoreRef = useRef(null);
  const limit = 20;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Categories list for filtering
  const { data: catData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryApi.list,
  });
  const categories = catData?.data?.categories || [];

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin-wishlists', debouncedSearch, category, date],
    queryFn: ({ pageParam }) =>
      wishlistApi.listAll({
        search: debouncedSearch || undefined,
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

  // Aggregate stats computed from loaded items
  const stats = useMemo(() => {
    const userSet = new Set();
    let pipelineValue = 0;

    wishlists.forEach((w) => {
      if (w.user_id) userSet.add(w.user_id);
      pipelineValue += parseFloat(w.offer_price || w.price || 0);
    });

    const userCount = userSet.size;
    const avgPerUser = userCount > 0 ? pipelineValue / userCount : 0;

    return { total, loadedCount: wishlists.length, userCount, pipelineValue, avgPerUser };
  }, [wishlists, total]);

  const doRemove = async () => {
    if (!deleteTarget) return;
    try {
      await wishlistApi.remove(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['admin-wishlists'] });
      toast.success('Item removed from customer wishlist');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to remove item');
    }
  };

  // Direct WhatsApp conversion trigger
  const handleWhatsAppOutreach = (w) => {
    const rawPhone = (w.user_phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const message = encodeURIComponent(
      `Hi ${w.user_name || 'there'}, your saved favorite "${w.product_name}" is currently available at Dundu Store! 🛍️ Check it out here:`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  /* ── Lazy-load next page on scroll ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '250px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── 1. Top Executive Command Header ──────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Customer Wishlists & Intent
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {total} Saved Item{total !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Inspect bookmarking trends, high-intent purchase pipelines, and engage shoppers with targeted outreach
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Wishlists"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Real-Time Wishlist Metrics Strip ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <BookmarkCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{total}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bookmarks</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">{stats.userCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Engaged Shoppers</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-indigo-700">{formatPrice(stats.pipelineValue)}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pipeline Wish Value</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-700">{formatPrice(stats.avgPerUser)}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Intent / Shopper</p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Strip ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Product, Shopper, Phone..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category & Date filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Category filter pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Department:
              </span>
              <button
                onClick={() => setCategory('')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  !category
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All
              </button>
              {categories.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(category === c.slug ? '' : c.slug)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all capitalize ${
                    category === c.slug
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Date Picker */}
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
                title="Clear date"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Full-Width Wishlists Ledger Table ─────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading customer wishlists...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-12 text-slate-400">#</th>
                  <th className="px-5 py-3.5">Saved Product</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5 text-right">Retail Price</th>
                  <th className="px-5 py-3.5">Interested Shopper</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Bookmarked On</th>
                  <th className="px-5 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wishlists.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-slate-400 text-xs">
                      <Heart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No wishlist bookmarks matching the selected criteria
                    </td>
                  </tr>
                ) : (
                  wishlists.map((w, idx) => (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                            {w.image_url ? (
                              <img
                                src={w.image_url}
                                alt={w.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[220px]">
                            <button
                              onClick={() => navigate(`/products/${w.product_id}`)}
                              className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-xs text-left truncate block max-w-full hover:underline"
                            >
                              {w.product_name}
                            </button>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              ID: {w.product_id?.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {w.category_name || 'General'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <p className="font-extrabold text-slate-900 text-xs">
                          {formatPrice(w.offer_price || w.price)}
                        </p>
                        {w.offer_price && (
                          <p className="text-[10px] text-slate-400 line-through">
                            {formatPrice(w.price)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {w.user_name ? w.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <button
                            onClick={() => navigate(`/users/${w.user_id}`)}
                            className="font-bold text-slate-900 hover:text-emerald-700 hover:underline transition-colors text-xs"
                          >
                            {w.user_name || 'Anonymous User'}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">
                        {w.user_phone ? (
                          <a
                            href={`tel:${w.user_phone}`}
                            className="hover:text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3 text-slate-400" />
                            {w.user_phone}
                          </a>
                        ) : (
                          <span>{w.user_email || '—'}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatDate(w.created_at)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {w.user_phone && (
                            <button
                              onClick={() => handleWhatsAppOutreach(w)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="Engage Customer on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/products/${w.product_id}`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                            title="View Product"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(w)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove from Wishlist"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
            <span className="text-xs text-slate-400 font-semibold">Loading more wishlist bookmarks...</span>
          )}
        </div>
      )}
      {!hasNextPage && wishlists.length > 0 && (
        <div className="text-center py-4 text-xs text-slate-400 font-medium">
          Showing all {wishlists.length} of {total} wishlist items
        </div>
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
