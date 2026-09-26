import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Trash2, Truck, Pencil, Package, CheckCircle2, Clock,
  MapPin, User, Phone, CreditCard, Copy, Printer, AlertTriangle, QrCode,
  ShieldCheck, RefreshCw, X, ChevronRight,
} from 'lucide-react';
import { orderApi } from '../../../api';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import Input from '../../../components/ui/Input';
import { formatPrice, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    step: 1,
  },
  packed: {
    label: 'Packed',
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    step: 2,
  },
  shipped: {
    label: 'In Transit',
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    step: 3,
  },
  delivered: {
    label: 'Delivered',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    step: 4,
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    step: 0,
  },
  returned: {
    label: 'Returned',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    step: 0,
  },
};

const NEXT_STATUS = {
  pending: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
};

const COURIERS = [
  'Dundu Delivery', 'Delhivery', 'BlueDart', 'DTDC', 'Ekart',
  'Xpressbees', 'India Post', 'Shadowfax', 'Shiprocket', 'Other',
];

function ConfirmModal({ title, orderNumber, word, color, bg, border, message, actionLabel, onClose, onConfirm }) {
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
    <Modal title={title} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className={`${bg} ${border} rounded-xl p-3.5 text-xs leading-relaxed`} style={{ color }}>
          {message(orderNumber)}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Type <span className="font-mono font-bold" style={{ color }}>{word}</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            placeholder={word}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none bg-slate-50 focus:bg-white transition-all"
            style={{ outlineColor: color }}
            onFocus={(e) => (e.target.style.borderColor = color)}
            onBlur={(e) => (e.target.style.borderColor = '')}
          />
        </div>
        <div className="flex gap-2.5 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={typed !== word}
            loading={loading}
            onClick={handle}
            style={typed === word ? { backgroundColor: color, color: '#fff', border: 'none' } : {}}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const DeliverConfirmModal = (p) => (
  <ConfirmModal
    {...p}
    title="Mark as Delivered"
    word="DELIVERED"
    color="#059669"
    bg="bg-emerald-50"
    border="border border-emerald-200"
    message={(n) => (
      <span>
        Confirm that order <strong className="font-mono">#{n}</strong> has been successfully handed over to the customer. This action is irreversible.
      </span>
    )}
    actionLabel="Confirm Delivery"
  />
);

const PackedConfirmModal = (p) => (
  <ConfirmModal
    {...p}
    title="Mark as Packed"
    word="PACKED"
    color="#2563eb"
    bg="bg-blue-50"
    border="border border-blue-200"
    message={(n) => (
      <span>
        Confirm that order <strong className="font-mono">#{n}</strong> has been picked, securely packed, and is ready for dispatch.
      </span>
    )}
    actionLabel="Confirm Packed"
  />
);

const CancelConfirmModal = (p) => (
  <ConfirmModal
    {...p}
    title="Cancel Order"
    word="CANCEL"
    color="#d97706"
    bg="bg-amber-50"
    border="border border-amber-200"
    message={(n) => (
      <span>
        This will cancel order <strong className="font-mono">#{n}</strong> and automatically restore warehouse stock levels.
      </span>
    )}
    actionLabel="Confirm Cancellation"
  />
);

const DeleteConfirmModal = (p) => (
  <ConfirmModal
    {...p}
    title="Delete Order Record"
    word="DELETE"
    color="#dc2626"
    bg="bg-rose-50"
    border="border border-rose-200"
    message={(n) => (
      <span>
        Permanently delete order <strong className="font-mono">#{n}</strong> and remove all tracking records. This action cannot be undone.
      </span>
    )}
    actionLabel="Delete Order"
  />
);

function CourierModal({ order, onClose, onSaved }) {
  const isEdit = !!(order.courier_tracking_number);
  const [form, setForm] = useState({
    courier_name: order.courier_name || '',
    courier_tracking_number: order.courier_tracking_number || '',
    courier_phone: order.courier_phone || '',
  });
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const isDundu = form.courier_name === 'Dundu Delivery';

  if (isEdit && order.courier_name === 'Dundu Delivery') {
    return (
      <Modal title="Dundu Delivery — Shipment Details" onClose={onClose} size="sm">
        <div className="space-y-4 text-xs">
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase">Tracking Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{order.courier_tracking_number}</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Courier & tracking number are bound to the internal Dundu Delivery network. Use the Hub Pickup QR button on the order page to reprint the hub token.
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDundu && !form.courier_tracking_number.trim()) {
      toast.error('Tracking number is required');
      return;
    }
    if (!isEdit && typed !== 'SHIP') {
      toast.error('Type SHIP to confirm');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await orderApi.updateCourier(order.id, form);
        toast.success('Courier details updated');
        onSaved();
      } else {
        const payload = isDundu
          ? { status: 'shipped', courier_name: form.courier_name, courier_phone: form.courier_phone }
          : { status: 'shipped', ...form };
        const res = await orderApi.updateStatus(order.id, payload);
        toast.success('Order marked as shipped');
        onSaved(res?.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update courier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Courier Information' : 'Dispatch Order — Courier Manifest'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
            Select Logistics Partner
          </label>
          <div className="flex flex-wrap gap-2">
            {COURIERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((p) => ({ ...p, courier_name: c }))}
                className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                  form.courier_name === c
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {form.courier_name === 'Other' && (
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Custom Courier Name</label>
            <input
              value={form.courier_name === 'Other' ? '' : form.courier_name}
              onChange={(e) => setForm((p) => ({ ...p, courier_name: e.target.value }))}
              placeholder="e.g. Professional Couriers"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
            />
          </div>
        )}

        {isDundu ? (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900">
            <p className="font-bold mb-1">Dundu In-House Delivery</p>
            Tracking number and Hub Pickup QR will be automatically generated upon dispatch.
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Tracking / AWB Number <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.courier_tracking_number}
              onChange={set('courier_tracking_number')}
              placeholder="e.g. 1234567890"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">
            Courier Helpline / Contact (Optional)
          </label>
          <input
            value={form.courier_phone}
            onChange={set('courier_phone')}
            placeholder="e.g. 1800-XXX-XXXX"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
          />
        </div>

        {!isEdit && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Type <span className="font-mono font-bold text-indigo-600">SHIP</span> to confirm dispatch
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              placeholder="SHIP"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400"
            />
          </div>
        )}

        <div className="flex gap-2.5 justify-end pt-3">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            type="submit"
            loading={loading}
            disabled={!isEdit && typed !== 'SHIP'}
            className="px-4"
          >
            {isEdit ? 'Save Changes' : 'Confirm & Dispatch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);
  const [showCourier, setShowCourier] = useState(false);
  const [showDeliver, setShowDeliver] = useState(false);
  const [showPacked, setShowPacked] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => orderApi.getOne(id),
  });
  const order = data?.data?.order;

  const advanceStatus = (st) => {
    if (st === 'packed') { setShowPacked(true); return; }
    if (st === 'shipped') { setShowCourier(true); return; }
    if (st === 'delivered') { setShowDeliver(true); return; }
  };

  const refresh = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  const confirmPacked = async () => {
    await orderApi.updateStatus(id, { status: 'packed' });
    toast.success('Order marked as packed');
    setShowPacked(false);
    refresh();
  };

  const confirmDeliver = async () => {
    await orderApi.updateStatus(id, { status: 'delivered' });
    toast.success('Order marked as delivered');
    setShowDeliver(false);
    refresh();
  };

  const confirmCancel = async () => {
    await orderApi.updateStatus(id, { status: 'cancelled' });
    toast.success('Order cancelled and inventory restored');
    setShowCancel(false);
    refresh();
  };

  const doDelete = async () => {
    await orderApi.remove(id);
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    toast.success('Order deleted');
    navigate('/orders');
  };

  const onCourierSaved = (dt) => {
    setShowCourier(false);
    refetch();
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    if (dt?.qr_data_url) setQrModal(dt.qr_data_url);
  };

  const viewPickupQr = async () => {
    setQrLoading(true);
    try {
      const res = await orderApi.getQr(id);
      setQrModal(res?.data?.qr_data_url);
    } catch (err) {
      toast.error(err.message || 'Failed to load QR');
    } finally {
      setQrLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-500">Loading order dossier...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
        <p className="text-sm font-bold text-slate-800">Order not found or inaccessible</p>
        <Button variant="outline" onClick={() => navigate('/orders')} className="mt-2">
          Back to Orders
        </Button>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[order.status];
  const hasTracking = !!(order.courier_tracking_number);
  const stConfig = STATUS_CONFIG[order.status] || {
    label: order.status,
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    step: 0,
  };

  const steps = [
    { key: 'pending', label: 'Ordered', step: 1 },
    { key: 'packed', label: 'Packed', step: 2 },
    { key: 'shipped', label: 'Shipped', step: 3 },
    { key: 'delivered', label: 'Delivered', step: 4 },
  ];

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── 1. Top Executive Action Header ───────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 border border-slate-200 shrink-0"
            title="Back to Orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Order #{order.order_number}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${stConfig.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stConfig.dot}`} />
                {stConfig.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                order.payment_status === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {order.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrintReceipt}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-slate-900 border border-slate-200 shrink-0"
            title="Print Receipt"
          >
            <Printer className="h-4 w-4" />
          </button>

          {nextStatus && (
            <Button
              onClick={() => advanceStatus(nextStatus)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-sm text-xs"
            >
              Advance to {nextStatus.toUpperCase()} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {['pending', 'packed'].includes(order.status) && (
            <Button
              onClick={() => setShowCancel(true)}
              variant="outline"
              className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs"
            >
              Cancel Order
            </Button>
          )}

          <button
            onClick={() => setShowDelete(true)}
            className="p-2.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors"
            title="Delete Order"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Visual Fulfillment Progress Stepper ───────────────────────── */}
      {order.status !== 'cancelled' && order.status !== 'returned' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between relative max-w-3xl mx-auto px-4">
            {/* Progress line */}
            <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-slate-100 -z-0" />
            <div
              className="absolute top-1/2 left-8 -translate-y-1/2 h-0.5 bg-slate-900 -z-0 transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, ((stConfig.step - 1) / (steps.length - 1)) * 100))}%`,
              }}
            />

            {steps.map((s) => {
              const isPassed = stConfig.step >= s.step;
              const isCurrent = stConfig.step === s.step;
              return (
                <div key={s.key} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isPassed
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 border-2 border-white'
                    } ${isCurrent ? 'ring-4 ring-slate-900/10' : ''}`}
                  >
                    {isPassed ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                  </div>
                  <span
                    className={`text-[11px] font-bold mt-2 whitespace-nowrap ${
                      isPassed ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Main Split View: Items & Logistics vs Customer & Payment ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Items & Logistics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                Purchased Items ({order.items?.length || 0})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100 text-[11px]">
                  <tr>
                    <th className="px-5 py-3 w-16">Item</th>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">Variant</th>
                    <th className="px-5 py-3 text-center">Qty</th>
                    <th className="px-5 py-3 text-right">Unit Price</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item, i) => {
                    const imgSrc = item.product_image || null;
                    const size = item.variant_info?.size || '';
                    const color = item.variant_info?.color || '';
                    const variant = [size, color].filter(Boolean).join(' · ');

                    return (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={item.product_name}
                              className="w-12 h-14 object-cover rounded-xl border border-slate-200/80 bg-slate-50 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-14 rounded-xl border border-slate-200/80 bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 line-clamp-2 leading-relaxed">
                            {item.product_name}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {variant ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {variant}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-600">
                          {formatPrice(item.unit_price)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-slate-900">
                          {formatPrice(item.unit_price * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Reconciliation Summary */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promotional Discount</span>
                  <span className="font-semibold">-{formatPrice(order.discount)}</span>
                </div>
              )}
              {order.wallet_amount > 0 && (
                <div className="flex justify-between text-indigo-600">
                  <span>Store Wallet Credit Applied</span>
                  <span className="font-semibold">-{formatPrice(order.wallet_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-200 text-slate-900">
                <span>Total Amount</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              {order.wallet_amount > 0 && (
                <div className="flex justify-between text-xs font-bold text-slate-700 pt-1">
                  <span>Net Payable at Door / Online</span>
                  <span>{formatPrice(order.total - order.wallet_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Courier & Logistics Manifest */}
          {(order.status === 'shipped' || order.status === 'delivered' || hasTracking) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-700" />
                  <h2 className="font-bold text-slate-900 text-sm">Shipping & Courier Manifest</h2>
                </div>
                <div className="flex items-center gap-2">
                  {order.courier_name === 'Dundu Delivery' && order.status === 'shipped' && !order.picked_up_at && (
                    <button
                      onClick={viewPickupQr}
                      disabled={qrLoading}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      {qrLoading ? 'Loading…' : 'Pickup QR'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowCourier(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    {hasTracking ? 'Edit Dispatch' : 'Add Tracking'}
                  </button>
                </div>
              </div>

              {hasTracking ? (
                <div className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Logistics Partner
                      </span>
                      <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                        {order.courier_name || 'Standard Courier'}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tracking / AWB Number
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {order.courier_tracking_number}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(order.courier_tracking_number);
                            toast.success('Tracking number copied!');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-900 transition-colors"
                          title="Copy tracking number"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {order.courier_phone && (
                    <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <span>Carrier Support Contact:</span>
                      <span className="font-mono font-bold text-slate-900">{order.courier_phone}</span>
                    </div>
                  )}

                  {order.courier_name === 'Dundu Delivery' && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Hub Handover</span>
                        {order.picked_up_at ? (
                          <span className="text-right">
                            <span className="font-bold text-slate-900">{order.picked_up_by_name}</span>
                            {order.picked_up_by_phone && (
                              <span className="text-slate-400"> ({order.picked_up_by_phone})</span>
                            )}
                            <br />
                            <span className="text-[10px] text-slate-400">{formatDate(order.picked_up_at)}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold">Awaiting pickup at warehouse hub</span>
                        )}
                      </div>

                      {order.status === 'delivered' && (
                        <div className="flex justify-between text-xs pt-1">
                          <span className="text-slate-500">Delivered By</span>
                          <span className="text-right">
                            <span className="font-bold text-slate-900">{order.delivered_by_name}</span>
                            {order.delivered_by_phone && (
                              <span className="text-slate-400"> ({order.delivered_by_phone})</span>
                            )}
                            {order.delivery_completed_at && (
                              <>
                                <br />
                                <span className="text-[10px] text-slate-400">{formatDate(order.delivery_completed_at)}</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  No tracking information attached yet. Click "Add Tracking" to enter courier details.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Customer, Address, Payment Cards */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-3.5 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Customer Information
            </h2>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{order.user_name || 'Guest User'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                <p className="font-mono font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {order.user_phone || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-3.5 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              Shipping Destination
            </h2>
            {order.address_line1 ? (
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {order.name} · <span className="font-mono font-normal">{order.phone}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</span>
                  <p className="text-slate-700 leading-relaxed mt-0.5">
                    {order.address_line1}
                    {order.address_line2 ? `, ${order.address_line2}` : ''}
                  </p>
                  <p className="text-slate-700 font-semibold mt-0.5">
                    {order.city}, {order.state} — <span className="font-mono">{order.pincode}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No structured delivery address attached</p>
            )}
          </div>

          {/* Payment & Settlement Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-3.5 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              Payment & Settlement
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Method</span>
                <span className="font-bold text-slate-900 uppercase">
                  {order.payment_method || 'Cash on Delivery'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    order.payment_status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {order.payment_status === 'paid' ? 'Paid' : 'Unpaid / Pending'}
                </span>
              </div>
              {order.razorpay_payment_id && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Gateway Ref</span>
                  <span className="font-mono text-slate-700 text-[11px]">{order.razorpay_payment_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showPacked && (
        <PackedConfirmModal
          orderNumber={order.order_number}
          onClose={() => setShowPacked(false)}
          onConfirm={confirmPacked}
        />
      )}
      {showCancel && (
        <CancelConfirmModal
          orderNumber={order.order_number}
          onClose={() => setShowCancel(false)}
          onConfirm={confirmCancel}
        />
      )}
      {showDeliver && (
        <DeliverConfirmModal
          orderNumber={order.order_number}
          onClose={() => setShowDeliver(false)}
          onConfirm={confirmDeliver}
        />
      )}
      {showDelete && (
        <DeleteConfirmModal
          orderNumber={order.order_number}
          onClose={() => setShowDelete(false)}
          onConfirm={doDelete}
        />
      )}
      {showCourier && (
        <CourierModal
          order={order}
          onClose={() => setShowCourier(false)}
          onSaved={onCourierSaved}
        />
      )}
      {qrModal && (
        <Modal title="Hub Pickup QR" onClose={() => setQrModal(null)} size="sm">
          <div className="flex flex-col items-center gap-3 py-2">
            <img src={qrModal} alt="Pickup QR" className="w-56 h-56 border border-slate-200 rounded-xl" />
            <p className="text-xs text-slate-500 text-center">
              Hand this to the assigned Dundu Delivery agent to scan at the warehouse hub.
            </p>
            <Button variant="outline" size="sm" onClick={() => setQrModal(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
