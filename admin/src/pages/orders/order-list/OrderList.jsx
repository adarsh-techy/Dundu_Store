import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Trash2, X } from 'lucide-react';
import { orderApi } from '../../../api';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import CategoryChips from '../../../components/ui/CategoryChips';
import { formatPrice, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

const statusColor = { pending: 'yellow', packed: 'blue', shipped: 'blue', delivered: 'green', cancelled: 'red', returned: 'gray' };
const STATUSES = ['', 'pending', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

function DeleteModal({ order, onClose, onConfirm }) {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };
  return (
    <Modal title="Delete Order" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Permanently delete order <strong>#{order.order_number}</strong> for <strong>{order.user_name}</strong>? This removes it from the customer's account and cannot be undone.
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
          </label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-red-400" />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" size="sm" disabled={typed !== 'DELETE'} loading={loading} onClick={handle}>
            Delete Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function OrderList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
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
    queryKey: ['admin-orders', status, category, date],
    queryFn: ({ pageParam }) => orderApi.list({
      status: status || undefined,
      category: category || undefined,
      date: date || undefined,
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

  const doDelete = async () => {
    await orderApi.remove(deleteTarget.id);
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    toast.success('Order deleted');
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <span className="text-sm text-gray-400">{total} order{total !== 1 ? 's' : ''}</span>
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
          <select
            value={status} onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}</option>)}
          </select>
        </div>
      </div>

      <CategoryChips value={category} onChange={setCategory} />

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-pink-100 text-xs text-pink-500 uppercase tracking-wide">
              <tr>
                {['Order #', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No orders found</td></tr>
              ) : orders.map((o) => {
                const items = o.items || [];
                const preview = items.slice(0, 2);
                const extra = items.length - preview.length;
                return (
                  <tr key={o.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-indigo-600 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                      #{o.order_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>{o.user_name}</td>
                    <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {preview.map((item, i) => (
                            item.product_image ? (
                              <img key={i} src={item.product_image} alt={item.product_name}
                                className="w-9 h-10 object-cover rounded-md border-2 border-white bg-gray-100 shadow-sm" />
                            ) : (
                              <div key={i} className="w-9 h-10 rounded-md border-2 border-white bg-gray-100 flex items-center justify-center text-sm shadow-sm">
                                👗
                              </div>
                            )
                          ))}
                          {extra > 0 && (
                            <div className="w-9 h-10 rounded-md border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                              +{extra}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          {preview[0] && (
                            <p className="text-xs font-medium text-gray-700 truncate max-w-[140px]">{preview[0].product_name}</p>
                          )}
                          {preview[0]?.variant_info && (
                            <p className="text-xs text-gray-400 truncate max-w-[140px]">
                              {[preview[0].variant_info.size, preview[0].variant_info.color].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {items.length > 1 && (
                            <p className="text-xs text-gray-400">{items.length} items total</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>{formatPrice(o.total)}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                      <Badge color={o.payment_status === 'paid' ? 'green' : 'yellow'}>{o.payment_status}</Badge>
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                      <Badge color={statusColor[o.status] || 'gray'}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(o); }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete order"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
      {!hasNextPage && orders.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {orders.length} of {total}</div>
      )}

      {deleteTarget && (
        <DeleteModal order={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete} />
      )}
    </div>
  );
}
