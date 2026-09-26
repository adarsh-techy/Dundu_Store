import { useState, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Trash2, X, Search, Filter, RefreshCw, ShoppingBag, Eye, Calendar,
  Package, CheckCircle2, Clock, Truck, AlertCircle, RotateCcw,
} from 'lucide-react';
import { orderApi, categoryApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  packed: {
    label: 'Packed',
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  shipped: {
    label: 'Shipped',
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  delivered: {
    label: 'Delivered',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  returned: {
    label: 'Returned',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

const STATUS_TABS = [
  { key: '', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
];

function DeleteModal({ order, onClose, onConfirm }) {
  const [typed, setTyped] = useState('');
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
    <Modal title="Delete Order Record" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 leading-relaxed">
          Permanently delete order <strong className="font-mono">#{order.order_number}</strong> for{' '}
          <strong>{order.user_name}</strong>? This action will remove the record from both store history and customer profile.
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-rose-400 bg-slate-50 focus:bg-white transition-all"
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
            onClick={handle}
          >
            Confirm Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function OrderList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
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
    queryKey: ['admin-orders', status, category, date, debouncedSearch],
    queryFn: ({ pageParam }) =>
      orderApi.list({
        status: status || undefined,
        category: category || undefined,
        date: date || undefined,
        search: debouncedSearch || undefined,
        page: pageParam,
        limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.orders?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });

  const orders = data?.pages.flatMap((p) => p.data?.orders || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;

  // Quick stats computed from current loaded results or summary
  const stats = useMemo(() => {
    let pendingCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;
    let totalRevenue = 0;

    orders.forEach((o) => {
      if (o.status === 'pending' || o.status === 'packed') pendingCount++;
      if (o.status === 'shipped') shippedCount++;
      if (o.status === 'delivered') deliveredCount++;
      if (o.status !== 'cancelled') totalRevenue += Number(o.total || 0);
    });

    return { pendingCount, shippedCount, deliveredCount, totalRevenue };
  }, [orders]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await orderApi.remove(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order deleted successfully');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete order');
    }
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
      {/* ── 1. Top Executive Orders Header ───────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Orders & Fulfillment
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {total} Order{total !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Track customer purchases, fulfillment stages, shipping manifests, and payment statuses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Orders"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Real-Time Metric Strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{total}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Volume</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-700">{stats.pendingCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">To Pack & Ship</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-indigo-700">{stats.shippedCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Transit</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">{stats.deliveredCount}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered</p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Strip ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        {/* Status navigation pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                status === tab.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order #, Customer, Phone..."
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

          {/* Date Picker & Category Filter */}
          <div className="flex items-center gap-2.5 flex-wrap">
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
                  title="Clear Date"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-slate-400"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Full-Width Orders Table ───────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading orders ledger...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-12 text-slate-400">#</th>
                  <th className="px-5 py-3.5">Order Number</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Placed At</th>
                  <th className="px-5 py-3.5">Items Summary</th>
                  <th className="px-5 py-3.5 text-center">Payment</th>
                  <th className="px-5 py-3.5 text-center">Fulfillment</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-slate-400 text-xs">
                      <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No order records found matching the active criteria
                    </td>
                  </tr>
                ) : (
                  orders.map((o, idx) => {
                    const items = o.items || [];
                    const preview = items.slice(0, 2);
                    const extra = items.length - preview.length;
                    const st = STATUS_CONFIG[o.status] || {
                      label: o.status,
                      pill: 'bg-slate-100 text-slate-700 border-slate-200',
                      dot: 'bg-slate-400',
                    };

                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-emerald-700 transition-colors bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                            #{o.order_number}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 text-xs leading-tight">
                            {o.user_name || 'Guest User'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {o.user_phone || '—'}
                          </p>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                          {formatDate(o.created_at)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
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
                                    <Package className="h-3.5 w-3.5 text-slate-400" />
                                  </div>
                                )
                              ))}
                              {extra > 0 && (
                                <div className="w-8 h-9 rounded-lg border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
                                  +{extra}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 max-w-[150px]">
                              {preview[0] && (
                                <p className="text-xs font-semibold text-slate-800 truncate">
                                  {preview[0].product_name}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400">
                                {items.length} item{items.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              o.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {o.payment_status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                          <span className="block text-[10px] text-slate-400 uppercase mt-0.5">
                            {o.payment_method || 'COD'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right font-black text-slate-900 text-xs">
                          {formatPrice(o.total)}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => navigate(`/orders/${o.id}`)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                              title="View Order Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(o)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Order"
                            >
                              <Trash2 className="h-4 w-4" />
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
            <span className="text-xs text-slate-400 font-semibold">Loading more orders...</span>
          )}
        </div>
      )}
      {!hasNextPage && orders.length > 0 && (
        <div className="text-center py-4 text-xs text-slate-400 font-medium">
          Showing all {orders.length} of {total} orders
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          order={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}
