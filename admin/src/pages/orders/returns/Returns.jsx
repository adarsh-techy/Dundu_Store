import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { X, Wallet, Landmark, Banknote, Repeat } from 'lucide-react';
import { orderApi } from '../../../api';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

const REFUND_METHODS = [
  { key: 'wallet', label: 'Wallet Credit', icon: Wallet },
  { key: 'original', label: 'Original Payment Method', icon: Landmark },
  { key: 'bank_transfer', label: 'Bank Transfer', icon: Banknote },
  { key: 'replacement', label: 'Replace Product', icon: Repeat },
];

const REFUND_METHOD_LABELS = {
  wallet: 'Wallet Credit',
  original: 'Original Payment Method',
  bank_transfer: 'Bank Transfer',
  replacement: 'Product Replacement',
};

export default function Returns() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [refundMethod, setRefundMethod] = useState('wallet');
  const [refundReference, setRefundReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const loadMoreRef = useRef(null);
  const limit = 15;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-returns', date],
    queryFn: ({ pageParam }) => orderApi.getReturns({
      date: date || undefined,
      page: pageParam,
      limit,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.returns?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
  const returns = data?.pages.flatMap((p) => p.data?.returns || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;

  const canRefundOriginal = selected?.has_online_payment && selected?.payment_status === 'paid';

  const handle = async (status) => {
    if (status === 'approved' && refundMethod === 'bank_transfer' && !refundReference.trim()) {
      toast.error('Enter a bank transfer reference (UTR / transaction number)');
      return;
    }
    setLoading(true);
    try {
      await orderApi.handleReturn(selected.id, {
        status,
        admin_note: note,
        ...(status === 'approved' ? {
          refund_method: refundMethod,
          refund_reference: refundMethod === 'bank_transfer' ? refundReference.trim() : undefined,
        } : {}),
      });
      toast.success(`Return ${status}`);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-returns'] });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed');
    }
    finally { setLoading(false); }
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
          <h1 className="text-xl font-bold text-gray-900">Return Requests</h1>
          <span className="text-sm text-gray-400">{total} request{total !== 1 ? 's' : ''}</span>
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
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>{['Order', 'Customer', 'Reason', 'Date', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium bg-pink-50 text-pink-700 border-b border-pink-200">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {returns.length === 0
                ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">No return requests</td></tr>
                : returns.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-indigo-600">#{r.order_number}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{r.user_name}</div>
                      {r.user_phone && <div className="text-xs text-gray-400">{r.user_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge color={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'yellow'}>
                        {r.status}
                      </Badge>
                      {r.status === 'approved' && r.refund_method && (
                        <div className="text-xs text-gray-400 mt-1">
                          via {REFUND_METHOD_LABELS[r.refund_method] || r.refund_method}
                          {r.refund_reference && <span className="font-mono"> · {r.refund_reference}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <Button size="xs" variant="outline" onClick={() => { setSelected(r); setNote(''); setRefundMethod('wallet'); setRefundReference(''); }}>Review</Button>
                      )}
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
      {!hasNextPage && returns.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {returns.length} of {total}</div>
      )}

      {selected && (
        <Modal title="Review Return Request" onClose={() => setSelected(null)} size="sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p className="font-medium text-gray-700 mb-1">Customer reason:</p>
              <p className="text-gray-600">{selected.reason}</p>
            </div>
            {selected.order_total != null && refundMethod !== 'replacement' && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Order total</span>
                  <span>₹{Number(selected.order_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Courier return charge</span>
                  <span>− ₹{Number(selected.courier_charge || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-indigo-700 pt-1 border-t border-indigo-100">
                  <span>Refund amount</span>
                  <span>₹{Number(selected.refund_amount ?? selected.order_total).toFixed(2)}</span>
                </div>
              </div>
            )}
            {refundMethod === 'replacement' && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
                No money is refunded — the same item(s) from this order will be restocked and a new
                ₹0 replacement order will be created for you to pack &amp; ship, same as any other order.
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Resolution (if approved)</label>
              <div className="space-y-1.5">
                {REFUND_METHODS.map(({ key, label, icon: Icon }) => {
                  const disabled = key === 'original' && !canRefundOriginal;
                  return (
                    <label key={key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        disabled ? 'opacity-40 cursor-not-allowed border-gray-100'
                          : refundMethod === key ? 'border-indigo-400 bg-indigo-50 cursor-pointer' : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                      }`}>
                      <input type="radio" name="refund-method" value={key} disabled={disabled}
                        checked={refundMethod === key} onChange={() => setRefundMethod(key)}
                        className="text-indigo-600 focus:ring-indigo-400" />
                      <Icon className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-gray-700">{label}</span>
                      {disabled && <span className="text-xs text-gray-400 ml-auto">not paid online</span>}
                    </label>
                  );
                })}
              </div>
              {refundMethod === 'bank_transfer' && (
                <input
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  placeholder="Bank transfer reference / UTR number"
                  className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">Admin Note (optional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="danger" loading={loading} onClick={() => handle('rejected')}>Reject</Button>
              <Button variant="success" loading={loading} onClick={() => handle('approved')}>Approve</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
