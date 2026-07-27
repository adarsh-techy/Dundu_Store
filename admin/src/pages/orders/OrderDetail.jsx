import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Truck, Pencil } from 'lucide-react';
import { orderApi } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import { formatPrice, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const statusColor = { pending: 'yellow', packed: 'blue', shipped: 'blue', delivered: 'green', cancelled: 'red', returned: 'gray' };
const NEXT_STATUS = { pending: 'packed', packed: 'shipped', shipped: 'delivered' };

const COURIERS = ['Dundu Delivery', 'Delhivery', 'BlueDart', 'DTDC', 'Ekart', 'Xpressbees', 'India Post', 'Shadowfax', 'Shiprocket', 'Other'];

function ConfirmModal({ title, orderNumber, word, color, bg, border, message, actionLabel, onClose, onConfirm }) {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className={`${bg} ${border} rounded-lg p-3 text-sm`} style={{ color }}>
          {message(orderNumber)}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">
            Type <span className="font-mono font-bold" style={{ color }}>{word}</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            placeholder={word}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none"
            style={{ outlineColor: color }}
            onFocus={(e) => (e.target.style.borderColor = color)}
            onBlur={(e) => (e.target.style.borderColor = '')}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" disabled={typed !== word} loading={loading} onClick={handle}
            style={typed === word ? { backgroundColor: color, color: '#fff', border: 'none' } : {}}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const DeliverConfirmModal = (p) => (
  <ConfirmModal {...p} title="Mark as Delivered" word="DELIVERED" color="#16a34a"
    bg="bg-green-50" border="border border-green-200"
    message={(n) => <span>Confirm that order <strong>#{n}</strong> has been delivered to the customer. This cannot be undone.</span>}
    actionLabel="Mark as Delivered" />
);

const PackedConfirmModal = (p) => (
  <ConfirmModal {...p} title="Mark as Packed" word="PACKED" color="#2563eb"
    bg="bg-blue-50" border="border border-blue-200"
    message={(n) => <span>Confirm that order <strong>#{n}</strong> has been packed and is ready to ship.</span>}
    actionLabel="Mark as Packed" />
);

const CancelConfirmModal = (p) => (
  <ConfirmModal {...p} title="Cancel Order" word="CANCEL" color="#d97706"
    bg="bg-amber-50" border="border border-amber-200"
    message={(n) => <span>This will cancel order <strong>#{n}</strong> and restore stock. This cannot be undone.</span>}
    actionLabel="Cancel Order" />
);

const DeleteConfirmModal = (p) => (
  <ConfirmModal {...p} title="Delete Order" word="DELETE" color="#dc2626"
    bg="bg-red-50" border="border border-red-200"
    message={(n) => <span>This permanently deletes order <strong>#{n}</strong> and removes it from the customer's account. Cannot be undone.</span>}
    actionLabel="Delete Order" />
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

  // Editing an already-shipped Dundu Delivery order: tracking number & QR
  // are tied to the pickup token, so this is a read-only view, not a form.
  if (isEdit && order.courier_name === 'Dundu Delivery') {
    return (
      <Modal title="Dundu Delivery — Shipment Details" onClose={onClose}>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Tracking No.</span>
            <span className="font-mono font-bold text-indigo-700">{order.courier_tracking_number}</span>
          </div>
          <p className="text-xs text-gray-400">
            Courier &amp; tracking number are locked for in-house Dundu Delivery shipments. Use the pickup QR button on the order page to view/reprint the hub-pickup code.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDundu && !form.courier_tracking_number.trim()) { toast.error('Tracking number is required'); return; }
    if (!isEdit && typed !== 'SHIP') { toast.error('Type SHIP to confirm'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await orderApi.updateCourier(order.id, form);
        toast.success('Courier details updated');
        onSaved();
      } else {
        const payload = isDundu ? { status: 'shipped', courier_name: form.courier_name, courier_phone: form.courier_phone } : { status: 'shipped', ...form };
        const res = await orderApi.updateStatus(order.id, payload);
        toast.success('Order marked as shipped');
        onSaved(res?.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Courier Details' : 'Mark as Shipped — Enter Courier Info'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Courier Company</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COURIERS.map((c) => (
              <button key={c} type="button"
                onClick={() => setForm((p) => ({ ...p, courier_name: c }))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  form.courier_name === c
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <Input placeholder="Or type courier name" value={form.courier_name} onChange={set('courier_name')} />
        </div>

        {isDundu ? (
          <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            Tracking number &amp; hub-pickup QR code are generated automatically for Dundu Delivery.
          </p>
        ) : (
          <Input label="Tracking Number *" placeholder="e.g. DEL123456789IN"
            value={form.courier_tracking_number} onChange={set('courier_tracking_number')} required />
        )}

        <Input label="Courier Helpline (optional)" placeholder="e.g. 1800-XXX-XXXX"
          value={form.courier_phone} onChange={set('courier_phone')} />

        {!isEdit && (
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Type <span className="font-mono font-bold text-indigo-600">SHIP</span> to confirm
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              placeholder="SHIP"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-400"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={!isEdit && typed !== 'SHIP'}>
            {isEdit ? 'Save Changes' : 'Ship Order'}
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => orderApi.getOne(id),
  });
  const order = data?.data?.order;

  const advanceStatus = (status) => {
    if (status === 'packed')    { setShowPacked(true);  return; }
    if (status === 'shipped')   { setShowCourier(true); return; }
    if (status === 'delivered') { setShowDeliver(true); return; }
  };

  const refresh = () => { refetch(); qc.invalidateQueries(['admin-orders']); };

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
    toast.success('Order cancelled');
    setShowCancel(false);
    refresh();
  };

  const doDelete = async () => {
    await orderApi.remove(id);
    qc.invalidateQueries(['admin-orders']);
    toast.success('Order deleted');
    navigate('/orders');
  };

  const onCourierSaved = (data) => {
    setShowCourier(false);
    refetch();
    qc.invalidateQueries(['admin-orders']);
    if (data?.qr_data_url) setQrModal(data.qr_data_url);
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

  if (isLoading) return <Spinner />;
  if (!order) return <div className="text-center py-20 text-gray-400">Order not found</div>;

  const nextStatus = NEXT_STATUS[order.status];
  const hasTracking = !!(order.courier_tracking_number);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order #{order.order_number}</h1>
          <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge color={statusColor[order.status] || 'gray'} className="text-sm px-3 py-1">{order.status}</Badge>
          {nextStatus && (
            <Button onClick={() => advanceStatus(nextStatus)} size="sm">
              Mark as {nextStatus}
            </Button>
          )}
          {['pending', 'packed'].includes(order.status) && (
            <Button onClick={() => setShowCancel(true)} variant="danger" size="sm">Cancel</Button>
          )}
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete order"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showPacked   && <PackedConfirmModal   orderNumber={order.order_number} onClose={() => setShowPacked(false)}   onConfirm={confirmPacked} />}
      {showCancel   && <CancelConfirmModal   orderNumber={order.order_number} onClose={() => setShowCancel(false)}   onConfirm={confirmCancel} />}
      {showDeliver  && <DeliverConfirmModal  orderNumber={order.order_number} onClose={() => setShowDeliver(false)}  onConfirm={confirmDeliver} />}
      {showDelete   && <DeleteConfirmModal   orderNumber={order.order_number} onClose={() => setShowDelete(false)}   onConfirm={doDelete} />}
      {showCourier  && <CourierModal order={order} onClose={() => setShowCourier(false)} onSaved={onCourierSaved} />}
      {qrModal && (
        <Modal title="Hub Pickup QR" onClose={() => setQrModal(null)} size="sm">
          <div className="flex flex-col items-center gap-3 py-2">
            <img src={qrModal} alt="Pickup QR" className="w-56 h-56 border border-gray-200 rounded-xl" />
            <p className="text-xs text-gray-400 text-center">Hand this to the assigned Dundu Delivery agent to scan at the hub.</p>
            <Button variant="outline" size="sm" onClick={() => setQrModal(null)}>Close</Button>
          </div>
        </Modal>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {/* Items */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-pink-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm">Order Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-16"></th>
                  {['Product', 'Size / Color', 'Qty', 'Unit Price', 'Subtotal'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium bg-pink-50 text-pink-700 border-b border-pink-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items?.map((item, i) => {
                  const imgSrc = item.product_image
                    ? (item.product_image.startsWith('http') ? item.product_image : item.product_image)
                    : null;
                  const size  = item.variant_info?.size  || '';
                  const color = item.variant_info?.color || '';
                  const variant = [size, color].filter(Boolean).join(' · ') || '—';
                  return (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        {imgSrc ? (
                          <img src={imgSrc} alt={item.product_name}
                            className="w-12 h-14 object-cover rounded-lg border border-gray-100 bg-gray-50" />
                        ) : (
                          <div className="w-12 h-14 rounded-lg border border-gray-100 bg-gray-100 flex items-center justify-center text-xl">
                            👗
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px]">
                        <span className="line-clamp-2">{item.product_name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{variant}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{formatPrice(item.unit_price)}</td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(item.unit_price * item.quantity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span className="text-pink-600">{formatPrice(order.total)}</span></div>
            </div>
          </div>

          {/* Courier / Tracking card — shown when shipped or delivered */}
          {(order.status === 'shipped' || order.status === 'delivered' || hasTracking) && (
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-indigo-50 flex items-center justify-between bg-indigo-50">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  <h2 className="font-semibold text-indigo-800 text-sm">Courier & Tracking</h2>
                </div>
                <div className="flex items-center gap-2">
                  {order.courier_name === 'Dundu Delivery' && order.status === 'shipped' && !order.picked_up_at && (
                    <button
                      onClick={viewPickupQr}
                      disabled={qrLoading}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      {qrLoading ? 'Loading…' : 'View Pickup QR'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowCourier(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    {hasTracking ? 'Edit' : 'Add Tracking'}
                  </button>
                </div>
              </div>
              {hasTracking ? (
                <div className="px-5 py-4 space-y-3 text-sm">
                  {order.courier_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Courier</span>
                      <span className="font-semibold text-gray-800">{order.courier_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Tracking No.</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 text-sm">{order.courier_tracking_number}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(order.courier_tracking_number); toast.success('Copied!'); }}
                        className="text-xs text-gray-400 hover:text-indigo-600 px-1.5 py-0.5 rounded border border-gray-200 hover:border-indigo-300 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  {order.courier_phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Helpline</span>
                      <span className="font-medium text-gray-800">{order.courier_phone}</span>
                    </div>
                  )}
                  {order.courier_name === 'Dundu Delivery' && (
                    <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hub Pickup</span>
                        {order.picked_up_at ? (
                          <span className="text-right">
                            <span className="font-semibold text-gray-800">{order.picked_up_by_name}</span>
                            {order.picked_up_by_phone && <span className="text-gray-400"> · {order.picked_up_by_phone}</span>}
                            <br /><span className="text-xs text-gray-400">{formatDate(order.picked_up_at)}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">Awaiting pickup at hub</span>
                        )}
                      </div>
                      {order.status === 'delivered' && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Delivered By</span>
                          <span className="text-right">
                            <span className="font-semibold text-gray-800">{order.delivered_by_name}</span>
                            {order.delivered_by_phone && <span className="text-gray-400"> · {order.delivered_by_phone}</span>}
                            {order.delivery_completed_at && <><br /><span className="text-xs text-gray-400">{formatDate(order.delivery_completed_at)}</span></>}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="px-5 py-4 text-sm text-gray-400">No tracking info added yet. Click "Add Tracking" to enter courier details.</p>
              )}
            </div>
          )}
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <div className="bg-green-50 rounded-2xl shadow-sm border border-pink-100 p-5">
            <h2 className="font-semibold text-pink-700 text-sm mb-3">Customer</h2>
            <p className="text-sm font-medium text-blue-800">{order.user_name}</p>
            <p className="text-sm text-blue-800 ">{order.user_phone}</p>
          </div>
          <div className="bg-green-50 rounded-2xl shadow-sm border border-pink-100 p-5">
            <h2 className="font-semibold text-pink-700 text-sm mb-3">Delivery Address</h2>
            {order.address_line1 ? (
              <div className="text-sm text-blue-800 space-y-0.5">
                <p className="font-medium text-blue-800">{order.name} · {order.phone}</p>
                <p>{order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}</p>
                <p>{order.city}, {order.state} — {order.pincode}</p>
              </div>
            ) : <p className="text-sm text-gray-400">No address</p>}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 text-sm mb-3">Payment</h2>
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-medium">{order.payment_method || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span>
                <Badge color={order.payment_status === 'paid' ? 'green' : 'yellow'}>{order.payment_status}</Badge>
              </div>
              {order.razorpay_payment_id && (
                <div className="flex justify-between"><span className="text-gray-500">Razorpay ID</span><span className="text-xs font-mono">{order.razorpay_payment_id}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
