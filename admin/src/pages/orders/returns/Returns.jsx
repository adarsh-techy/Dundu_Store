import { useState, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  X, Wallet, Landmark, Banknote, Repeat, RotateCcw, Calendar, RefreshCw,
  Search, Package, CheckCircle2, Clock, XCircle, ArrowUpRight, ChevronRight,
  User, Phone, Eye, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { orderApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

const REFUND_METHODS = [
  { key: 'wallet', label: 'Wallet Credit', icon: Wallet, desc: 'Instantly credit customer Dundu wallet balance' },
  { key: 'original', label: 'Original Payment Method', icon: Landmark, desc: 'Refund via payment gateway to original source' },
  { key: 'bank_transfer', label: 'Manual Bank Transfer', icon: Banknote, desc: 'NEFT / IMPS / UPI direct transfer with UTR ref' },
  { key: 'replacement', label: 'Product Replacement', icon: Repeat, desc: 'Create a free ₹0 replacement order for dispatch' },
];

const REFUND_METHOD_LABELS = {
  wallet: 'Wallet Credit',
  original: 'Original Payment',
  bank_transfer: 'Bank Transfer',
  replacement: 'Product Replacement',
};

const STATUS_TABS = [
  { key: '', label: 'All Requests' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved & Refunded' },
  { key: 'rejected', label: 'Rejected' },
];

export default function Returns() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [refundMethod, setRefundMethod] = useState('wallet');
  const [refundReference, setRefundReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState('');
  const loadMoreRef = useRef(null);
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin-returns', date, status, debouncedSearch],
    queryFn: ({ pageParam }) =>
      orderApi.getReturns({
        date: date || undefined,
        status: status || undefined,
        search: debouncedSearch || undefined,
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

  // Real-time KPI counts
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    returns.forEach((r) => {
      if (r.status === 'pending') pending++;
      else if (r.status === 'approved') approved++;
      else if (r.status === 'rejected') rejected++;
    });
    return { pending, approved, rejected };
  }, [returns]);

  const canRefundOriginal = selected?.has_online_payment && selected?.payment_status === 'paid';

  const handle = async (actionStatus) => {
    if (actionStatus === 'approved' && refundMethod === 'bank_transfer' && !refundReference.trim()) {
      toast.error('Please enter the bank transfer UTR / reference number');
      return;
    }
    setLoading(true);
    try {
      await orderApi.handleReturn(selected.id, {
        status: actionStatus,
        admin_note: note,
        ...(actionStatus === 'approved'
          ? {
              refund_method: refundMethod,
              refund_reference: refundMethod === 'bank_transfer' ? refundReference.trim() : undefined,
            }
          : {}),
      });
      toast.success(`Return request ${actionStatus === 'approved' ? 'approved & processed' : 'rejected'}`);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-returns'] });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to process return decision');
    } finally {
      setLoading(false);
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
      {/* ── 1. Top Executive Command Header ──────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Return & Refund Requests
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {total} Request{total !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review customer return inquiries, approve wallet refunds, bank transfers, or dispatch product replacements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Returns"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Real-Time Return Metrics Strip ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{total}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Claims</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-700">{stats.pending}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Review</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">{stats.approved}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved / Resolved</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-rose-700">{stats.rejected}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rejected</p>
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
              placeholder="Search by Order #, Customer, Reason..."
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
      </div>

      {/* ── 4. Full-Width Return Ledger Table ────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading return requests...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Order Reference</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Items in Order</th>
                  <th className="px-5 py-3.5">Reason for Return</th>
                  <th className="px-5 py-3.5">Requested Date</th>
                  <th className="px-5 py-3.5 text-center">Status & Resolution</th>
                  <th className="px-5 py-3.5 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-400 text-xs">
                      <RotateCcw className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No return requests found matching the active criteria
                    </td>
                  </tr>
                ) : (
                  returns.map((r) => {
                    const items = r.items || [];
                    const preview = items.slice(0, 2);
                    const extra = items.length - preview.length;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => navigate(`/orders/${r.order_id}`)}
                            className="font-mono font-bold text-slate-900 hover:text-emerald-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs transition-colors inline-block"
                          >
                            #{r.order_number}
                          </button>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            {formatPrice(r.order_total)}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              {r.user_name ? r.user_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{r.user_name || 'Customer'}</p>
                              {r.user_phone && (
                                <p className="text-[10px] font-mono text-slate-500">{r.user_phone}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
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
                            <div className="min-w-0 max-w-[130px]">
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

                        <td className="px-5 py-3.5 max-w-xs">
                          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-slate-700 leading-relaxed text-[11px]">
                            {r.reason}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                          {formatDate(r.created_at)}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                              r.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : r.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.status === 'approved'
                                  ? 'bg-emerald-500'
                                  : r.status === 'rejected'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            {r.status === 'approved'
                              ? 'Approved'
                              : r.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending Review'}
                          </span>

                          {r.status === 'approved' && (
                            <div className="text-[10px] text-slate-500 mt-1.5">
                              {r.replacement_order_number ? (
                                <button
                                  onClick={() => navigate(`/orders?search=${r.replacement_order_number}`)}
                                  className="font-mono text-indigo-600 font-bold hover:underline"
                                >
                                  Replaced: #{r.replacement_order_number}
                                </button>
                              ) : (
                                <span>
                                  via {REFUND_METHOD_LABELS[r.refund_method] || r.refund_method}
                                  {r.refund_amount != null && (
                                    <strong className="block text-emerald-700">
                                      {formatPrice(r.refund_amount)}
                                    </strong>
                                  )}
                                  {r.refund_reference && (
                                    <span className="font-mono block text-slate-400">
                                      Ref: {r.refund_reference}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === 'pending' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelected(r);
                                  setNote('');
                                  setRefundMethod('wallet');
                                  setRefundReference('');
                                }}
                                className="text-xs px-3 py-1 shadow-sm"
                              >
                                Review
                              </Button>
                            ) : (
                              <button
                                onClick={() => navigate(`/orders/${r.order_id}`)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                                title="View Associated Order"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
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
            <span className="text-xs text-slate-400 font-semibold">Loading more return requests...</span>
          )}
        </div>
      )}
      {!hasNextPage && returns.length > 0 && (
        <div className="text-center py-4 text-xs text-slate-400 font-medium">
          Showing all {returns.length} of {total} claims
        </div>
      )}

      {/* ── Executive Review Return Modal ── */}
      {selected && (
        <Modal title="Review & Adjudicate Return Request" onClose={() => setSelected(null)} size="md">
          <div className="space-y-4 text-xs">
            {/* Order info banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Original Order
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  #{selected.order_number}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer
                </span>
                <span className="font-bold text-slate-800">
                  {selected.user_name || 'Guest User'} ({selected.user_phone})
                </span>
              </div>
            </div>

            {/* Customer reason callout */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Customer Reason Statement
              </span>
              <p className="text-slate-800 leading-relaxed font-medium text-xs">
                "{selected.reason}"
              </p>
            </div>

            {/* Financial Reconciliation Breakdown */}
            {selected.order_total != null && refundMethod !== 'replacement' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Order Value</span>
                  <span className="font-bold text-slate-900">{formatPrice(selected.order_total)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Courier Return Fee (Shipping Deduction)</span>
                  <span className="text-rose-600 font-semibold">
                    − {formatPrice(selected.courier_charge || 0)}
                  </span>
                </div>
                <div className="flex justify-between font-black text-slate-900 pt-1.5 border-t border-slate-200 text-sm">
                  <span>Net Refund to Customer</span>
                  <span className="text-emerald-700">
                    {formatPrice(selected.refund_amount ?? selected.order_total)}
                  </span>
                </div>
              </div>
            )}

            {refundMethod === 'replacement' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-indigo-900 leading-relaxed">
                <p className="font-bold mb-1">Replacement Order Protocol</p>
                No financial refund will be disbursed. The return item will be restocked, and a ₹0 replacement order will be immediately queued in the Orders list for warehouse packaging and dispatch.
              </div>
            )}

            {/* Resolution Method Options */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Resolution Method (If Approved)
              </label>
              <div className="space-y-2">
                {REFUND_METHODS.map(({ key, label, icon: Icon, desc }) => {
                  const disabled = key === 'original' && !canRefundOriginal;
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-50'
                          : refundMethod === key
                          ? 'border-slate-900 bg-slate-900 text-white cursor-pointer shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refund-method"
                        value={key}
                        disabled={disabled}
                        checked={refundMethod === key}
                        onChange={() => setRefundMethod(key)}
                        className="hidden"
                      />
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${refundMethod === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{label}</span>
                          {disabled && (
                            <span className="text-[10px] text-slate-400 font-semibold">Not Paid Online</span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 leading-tight ${refundMethod === key ? 'text-slate-300' : 'text-slate-400'}`}>
                          {desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {refundMethod === 'bank_transfer' && (
                <div className="mt-2.5">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Bank Transfer UTR / Transaction Reference <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                    placeholder="Enter NEFT / IMPS / UPI reference number..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* Admin Internal Note */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Admin Note / Audit Remarks (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Reason for approval/rejection or logistics remarks..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-400 resize-none bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="danger"
                size="sm"
                loading={loading}
                onClick={() => handle('rejected')}
              >
                Reject Request
              </Button>
              <Button
                size="sm"
                loading={loading}
                onClick={() => handle('approved')}
                className="px-5 shadow-sm"
              >
                Approve & Execute Resolution
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
