import { useState, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ShoppingCart, Calendar, RefreshCw, Package,
  Clock, MessageCircle, Eye, Trash2,
  TrendingUp, Filter, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { cartApi, categoryApi, userApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

export default function CartMonitor() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [abandoned, setAbandoned] = useState(''); // '' | 'false' | 'true'
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [inspectCart, setInspectCart] = useState(null);
  const [clearingId, setClearingId] = useState(null);
  const loadMoreRef = useRef(null);
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Categories for filter
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
    queryKey: ['admin-carts', abandoned, category, date, debouncedSearch],
    queryFn: ({ pageParam }) =>
      cartApi.monitor({
        abandoned: abandoned || undefined,
        category: category || undefined,
        date: date || undefined,
        search: debouncedSearch || undefined,
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

  // Real-time aggregate KPI metrics
  const stats = useMemo(() => {
    let activeCount = 0;
    let abandonedCount = 0;
    let totalCartValue = 0;
    let highValueCount = 0;

    carts.forEach((c) => {
      const val = parseFloat(c.cart_total || 0);
      totalCartValue += val;
      if (val >= 1500) highValueCount++;
      if (c.is_abandoned) abandonedCount++;
      else activeCount++;
    });

    return { activeCount, abandonedCount, totalCartValue, highValueCount };
  }, [carts]);

  // Clear customer cart
  const handleClearCart = async (userId, userName) => {
    if (!confirm(`Are you sure you want to clear the shopping cart for ${userName || 'this customer'}?`)) return;
    setClearingId(userId);
    try {
      await userApi.clearCart(userId);
      toast.success('Customer cart cleared');
      qc.invalidateQueries({ queryKey: ['admin-carts'] });
      if (inspectCart?.user_id === userId) setInspectCart(null);
    } catch {
      toast.error('Failed to clear cart');
    } finally {
      setClearingId(null);
    }
  };

  // Launch WhatsApp recovery message
  const handleWhatsAppRecovery = (c) => {
    const rawPhone = (c.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const firstItem = c.items_preview?.[0]?.product_name || 'items';
    const message = encodeURIComponent(
      `Hello ${c.name || 'there'}, we noticed you left ${firstItem} in your cart at Dundu Store! 🛍️\n\nComplete your order now to enjoy fast shipping:`
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
      {/* ── 1. Top Command Header ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Live Cart Monitor & Recovery
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {total} Shopper{total !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time radar for active shopping baskets, high-intent checkouts, and 1-click WhatsApp recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Carts"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Real-Time Cart Metrics Strip ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{total}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Baskets</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">{stats.activeCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Shopping (&lt;24h)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-700">{stats.abandonedCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Abandoned (24h+)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-indigo-700">{formatPrice(stats.totalCartValue)}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pipeline Cart Value</p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Strip ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        {/* Status toggles */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/60">
            {[
              ['', 'All Carts'],
              ['false', 'Active Carts (<24h)'],
              ['true', 'Abandoned (24h+)'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setAbandoned(val)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  abandoned === val
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Customer, Phone, Product..."
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
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
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
        </div>
      </div>

      {/* ── 4. Full-Width Carts Ledger Table ─────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Scanning shopper carts...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-12 text-slate-400">#</th>
                  <th className="px-5 py-3.5">Shopper Details</th>
                  <th className="px-5 py-3.5">Basket Items Preview</th>
                  <th className="px-5 py-3.5 text-center">Items In Bag</th>
                  <th className="px-5 py-3.5 text-right">Estimated Value</th>
                  <th className="px-5 py-3.5">Last Interaction</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right w-28">Recovery Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-slate-400 text-xs">
                      <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No carts found matching the active filters
                    </td>
                  </tr>
                ) : (
                  carts.map((c, idx) => {
                    const items = c.items_preview || [];
                    const preview = items.slice(0, 3);
                    const extra = items.length - preview.length;
                    const isBusy = clearingId === c.user_id;

                    return (
                      <tr key={c.user_id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                              {c.name ? c.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <button
                                onClick={() => navigate(`/users/${c.user_id}`)}
                                className="font-bold text-slate-900 group-hover:text-emerald-700 hover:underline transition-colors text-xs text-left block"
                              >
                                {c.name || 'Anonymous Shopper'}
                              </button>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                                {c.phone && <span>{c.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setInspectCart(c)}
                            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                            title="Click to view all cart items"
                          >
                            <div className="flex -space-x-2 shrink-0">
                              {preview.map((item, i) => (
                                item.product_image ? (
                                  <img
                                    key={i}
                                    src={item.product_image}
                                    alt={item.product_name}
                                    className="w-8 h-9 object-cover rounded-lg border-2 border-white bg-slate-100 shadow-sm"
                                  />
                                ) : (
                                  <div
                                    key={i}
                                    className="w-8 h-9 rounded-lg border-2 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm"
                                  >
                                    <Package className="h-3.5 w-3.5" />
                                  </div>
                                )
                              ))}
                              {extra > 0 && (
                                <div className="w-8 h-9 rounded-lg border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
                                  +{extra}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 max-w-[140px]">
                              {preview[0] && (
                                <p className="text-xs font-semibold text-slate-800 truncate">
                                  {preview[0].product_name}
                                </p>
                              )}
                              <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                                View items <ChevronRight className="h-2.5 w-2.5" />
                              </span>
                            </div>
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                          <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 text-[11px]">
                            {c.total_quantity || c.items} Pcs
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right font-black text-slate-900 text-xs">
                          {formatPrice(c.cart_total || 0)}
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                          {formatDate(c.last_active)}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.is_abandoned
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.is_abandoned ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            {c.is_abandoned ? 'Abandoned (24h+)' : 'Active (<24h)'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.phone && (
                              <button
                                onClick={() => handleWhatsAppRecovery(c)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="Send WhatsApp Recovery Message"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setInspectCart(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Inspect Cart Items"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleClearCart(c.user_id, c.name)}
                              disabled={isBusy}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                              title="Clear Cart"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
            <span className="text-xs text-slate-400 font-semibold">Scanning more shopper carts...</span>
          )}
        </div>
      )}
      {!hasNextPage && carts.length > 0 && (
        <div className="text-center py-4 text-xs text-slate-400 font-medium">
          Showing all {carts.length} of {total} customer carts
        </div>
      )}

      {/* ── Cart Inspection Modal ── */}
      {inspectCart && (
        <Modal
          title={`Shopper Basket — ${inspectCart.name || 'Anonymous User'}`}
          onClose={() => setInspectCart(null)}
          size="md"
        >
          <div className="space-y-4 text-xs">
            {/* Shopper header */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                <span className="font-bold text-slate-900 text-sm">{inspectCart.name || 'Anonymous'}</span>
                {inspectCart.phone && (
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">{inspectCart.phone}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Value</span>
                <span className="font-black text-slate-900 text-base">
                  {formatPrice(inspectCart.cart_total || 0)}
                </span>
              </div>
            </div>

            {/* Items list */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Items in Basket ({inspectCart.items_preview?.length || 0})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(inspectCart.items_preview || []).map((item, idx) => {
                  const variant = [item.variant_info?.size, item.variant_info?.color].filter(Boolean).join(' · ');
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-10 h-12 object-cover rounded-lg border border-slate-200 bg-slate-50 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                            {item.product_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {variant && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                {variant}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-slate-900 text-xs">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                        {item.quantity > 1 && (
                          <span className="block text-[10px] text-slate-400">
                            {formatPrice(item.unit_price)} each
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClearCart(inspectCart.user_id, inspectCart.name)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
              >
                Clear Cart
              </Button>

              <div className="flex items-center gap-2">
                {inspectCart.phone && (
                  <Button
                    size="sm"
                    onClick={() => handleWhatsAppRecovery(inspectCart)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Recover on WhatsApp
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setInspectCart(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
