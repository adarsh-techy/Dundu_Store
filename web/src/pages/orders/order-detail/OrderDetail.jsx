import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle, ChevronLeft, MapPin, CreditCard, Truck, Copy, RotateCcw } from 'lucide-react';
import { orderApi, settingsApi } from '../../../api';
import { loadRazorpay, openRazorpayCheckout } from '../../../utils/razorpay';
import useAuthStore from '../../../store/auth.store';
import { formatPrice, formatDate } from '../../../utils/format';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';
import useNow from '../../../hooks/useNow';

const STATUS_STYLE = {
  pending:   { bg: '#2d2000', color: '#facc15' },
  packed:    { bg: '#0a1e3d', color: '#60a5fa' },
  shipped:   { bg: '#0a1e3d', color: '#818cf8' },
  delivered: { bg: '#052e16', color: '#4ade80' },
  cancelled: { bg: '#2d1515', color: '#f87171' },
  returned:  { bg: '#1a1a1a', color: '#9ca3af' },
};

const STATUS_STEPS = [
  { key: 'pending',   label: 'Ordered',   icon: '🛒' },
  { key: 'packed',    label: 'Packed',    icon: '📦' },
  { key: 'shipped',   label: 'Shipped',   icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const now = useNow();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['order', id], queryFn: () => orderApi.getOne(id) });
  const order = data?.data?.order;

  const { data: paymentSettings } = useQuery({ queryKey: ['payment-settings'], queryFn: settingsApi.getPayment });
  const deliveryEstimateText = paymentSettings?.data?.delivery_estimate_text;

  const { data: restrictionsData } = useQuery({
    queryKey: ['order-restrictions'],
    queryFn: orderApi.getRestrictions,
  });
  const returnBlocked = restrictionsData?.data?.return_blocked || false;

  const { user } = useAuthStore();
  const [paying, setPaying] = useState(false);
  const payNow = async () => {
    setPaying(true);
    try {
      const res = await orderApi.retryPayment(id);
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Failed to load payment gateway'); return; }
      openRazorpayCheckout({
        order: res.data.razorpay,
        user,
        onSuccess: async (paymentData) => {
          try {
            await orderApi.verifyPayment({ ...paymentData, order_id: id });
            toast.success('Payment received');
          } catch (err) { toast.error(err?.message || 'Payment could not be verified'); }
          refetch();
        },
        onError: () => toast.error('Payment failed. Please try again.'),
        onDismiss: () => toast('Payment not completed', { icon: '⏳' }),
      });
    } catch (e) {
      toast.error(e?.message || 'Could not start payment');
    } finally { setPaying(false); }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await orderApi.cancel(id);
      setShowCancelConfirm(false);
      toast.success('Order cancelled');
      refetch();
      qc.invalidateQueries({ queryKey: ['orders'] });
    } catch (e) {
      toast.error(e.message || 'Cannot cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) return <Spinner />;
  if (!order) return <div className="text-center py-20" style={{ color: '#555' }}>Order not found</div>;

  const stepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const st = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
  const withinCancelWindow = now - new Date(order.created_at).getTime() < 10 * 60 * 1000;
  const canCancel = ['pending', 'packed'].includes(order.status) && withinCancelWindow;

  const deliveredAt = order.status === 'delivered' ? new Date(order.updated_at) : null;
  const returnWindowMs = 24 * 60 * 60 * 1000;
  const canReturn = deliveredAt && (now - deliveredAt.getTime()) < returnWindowMs;
  const returnMsLeft = deliveredAt ? Math.max(0, deliveredAt.getTime() + returnWindowMs - now) : 0;
  const returnHrsLeft = Math.floor(returnMsLeft / (1000 * 60 * 60));
  const returnMinsLeft = Math.floor((returnMsLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="max-w-2xl mx-auto px-3 py-5 md:px-4 md:py-8 space-y-4">

      {/* Success banner */}
      {isSuccess && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ backgroundColor: '#0a2e1a', border: '1px solid #166534' }}>
          <CheckCircle className="h-5 w-5 shrink-0" style={{ color: '#4ade80' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Order Placed Successfully!</p>
            <p className="text-xs" style={{ color: '#86efac' }}>You'll receive a WhatsApp confirmation shortly.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/orders" className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
          <ChevronLeft className="h-5 w-5" style={{ color: '#888' }} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold" style={{ color: '#f5f5f5' }}>Order #{order.order_number}</p>
          <p className="text-xs" style={{ color: '#555' }}>{formatDate(order.created_at)}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
          style={{ backgroundColor: st.bg, color: st.color }}>
          {order.status}
        </span>
      </div>

      {/* Unpaid online order — let the customer finish paying */}
      {order.payment_status === 'pending' && ['online', 'upi', 'card'].includes(order.payment_method) && order.status !== 'cancelled' && (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3 border-warning/40">
          <div>
            <p className="text-sm font-semibold text-warning">Payment pending</p>
            <p className="text-xs text-muted">Complete the payment to get this order packed. Amount due: {formatPrice(order.total - (order.wallet_amount || 0))}</p>
          </div>
          <Button size="sm" pill loading={paying} onClick={payNow}>Pay now</Button>
        </div>
      )}

      {/* Delivery estimate — only relevant before the order has actually arrived */}
      {deliveryEstimateText && ['pending', 'packed', 'shipped'].includes(order.status) && (
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl"
          style={{ backgroundColor: '#0f2e1a', color: '#4ade80' }}>
          <Truck className="h-3.5 w-3.5 shrink-0" />
          Estimated delivery in {deliveryEstimateText}
        </div>
      )}

      {/* Progress stepper */}
      {stepIdx >= 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
          <div className="flex items-start justify-between">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= stepIdx;
              const last = i === STATUS_STEPS.length - 1;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {!last && (
                    <div className="absolute top-4 left-1/2 w-full h-0.5"
                      style={{ backgroundColor: i < stepIdx ? '#e91e8c' : '#2e2e2e' }} />
                  )}
                  {/* Circle */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 shrink-0"
                    style={{
                      backgroundColor: done ? '#e91e8c' : '#222',
                      border: `2px solid ${done ? '#e91e8c' : '#2e2e2e'}`,
                    }}>
                    {done ? <span style={{ fontSize: 14 }}>{step.icon}</span>
                      : <span className="text-xs font-bold" style={{ color: '#555' }}>{i + 1}</span>}
                  </div>
                  {/* Label */}
                  <p className="text-[10px] mt-1.5 font-medium text-center"
                    style={{ color: done ? '#e91e8c' : '#555' }}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracking Info — shown when shipped/delivered and tracking number exists */}
      {(order.status === 'shipped' || order.status === 'delivered') && order.courier_tracking_number && (
        <section className="rounded-2xl p-4 space-y-3" style={{ border: '1px solid #3b3b6e', backgroundColor: '#0d0d2e' }}>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0" style={{ color: '#818cf8' }} />
            <p className="text-sm font-bold" style={{ color: '#a5b4fc' }}>Tracking Info</p>
          </div>
          {order.courier_name && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#666' }}>Courier</span>
              <span style={{ color: '#ddd', fontWeight: 600 }}>{order.courier_name}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span style={{ color: '#666' }}>Tracking No.</span>
            <div className="flex items-center gap-2">
              <span style={{ color: '#818cf8', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                {order.courier_tracking_number}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(order.courier_tracking_number); toast.success('Tracking ID copied!'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 11, color: '#818cf8',
                  background: 'rgba(129,140,248,0.12)',
                  border: '1px solid rgba(129,140,248,0.3)',
                  borderRadius: 6, padding: '2px 8px', cursor: 'pointer',
                }}
              >
                <Copy size={10} /> Copy
              </button>
            </div>
          </div>
          {order.courier_phone && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#666' }}>Helpline</span>
              <span style={{ color: '#ddd' }}>{order.courier_phone}</span>
            </div>
          )}
          <p style={{ fontSize: 11, color: '#555' }}>
            Use this tracking ID on the courier's website or app to track your shipment.
          </p>
        </section>
      )}

      {/* Items */}
      <section className="card rounded-2xl overflow-hidden">
        <p className="px-4 py-3 text-sm font-semibold" style={{ color: '#ddd', borderBottom: '1px solid #222' }}>
          Items ({order.items?.length})
        </p>
        <div className="divide-y" style={{ borderColor: '#222' }}>
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-12 h-14 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: '#2a2a2a' }}>
                {item.image
                  ? <img src={item.image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👗</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#ddd' }}>{item.product_name}</p>
                {(item.size || item.color) && (
                  <p className="text-xs mt-0.5" style={{ color: '#666' }}>
                    {[item.size, item.color].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs mt-0.5" style={{ color: '#666' }}>Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold shrink-0" style={{ color: '#f5f5f5' }}>
                {formatPrice(item.unit_price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div className="px-4 py-3 space-y-1.5" style={{ borderTop: '1px solid #222' }}>
          <div className="flex justify-between text-sm" style={{ color: '#777' }}>
            <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#4ade80' }}>
              <span>{{ coupon: 'Coupon discount', referral: 'Referral discount', birthday: 'Birthday discount' }[order.discount_type] || 'Discount'}</span><span>−{formatPrice(order.discount)}</span>
            </div>
          )}
          {order.loyalty_discount > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#4ade80' }}>
              <span>Loyalty points{order.loyalty_points_redeemed ? ` (${order.loyalty_points_redeemed} pts)` : ''}</span><span>−{formatPrice(order.loyalty_discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm" style={{ color: '#777' }}>
            <span>Shipping</span>
            {Number(order.delivery_charge) > 0 ? <span>{formatPrice(order.delivery_charge)}</span> : <span style={{ color: '#4ade80' }}>Free</span>}
          </div>
          <div className="flex justify-between font-bold text-base pt-1" style={{ borderTop: '1px solid #222', color: '#f5f5f5' }}>
            <span>Total</span><span style={{ color: '#e91e8c' }}>{formatPrice(order.total)}</span>
          </div>
          {order.wallet_amount > 0 && (
            <>
              <div className="flex justify-between text-sm" style={{ color: '#4ade80' }}>
                <span>Paid from Wallet</span><span>−{formatPrice(order.wallet_amount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-sm" style={{ color: '#ccc' }}>
                <span>Payable (COD / online)</span><span>{formatPrice(order.total - order.wallet_amount)}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Delivery address */}
      {order.address_line1 && (
        <section className="card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 shrink-0" style={{ color: '#e91e8c' }} />
            <p className="text-sm font-semibold" style={{ color: '#ddd' }}>Delivery Address</p>
          </div>
          <p className="text-sm" style={{ color: '#888' }}>{order.name} · {order.phone}</p>
          <p className="text-sm" style={{ color: '#888' }}>
            {order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ''}
          </p>
          <p className="text-sm" style={{ color: '#888' }}>{order.city}, {order.state} — {order.pincode}</p>
        </section>
      )}

      {/* Payment method */}
      {order.payment_method && (
        <section className="card rounded-2xl p-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 shrink-0" style={{ color: '#e91e8c' }} />
          <p className="text-sm" style={{ color: '#888' }}>
            Paid via <span style={{ color: '#ddd', fontWeight: 600 }}>
              {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
            </span>
          </p>
        </section>
      )}

      {/* Actions */}
      <div className="space-y-3 pb-4">
        {canCancel && (
          <Button onClick={() => setShowCancelConfirm(true)} fullWidth variant="outline"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            Cancel Order
          </Button>
        )}
        {['pending', 'packed'].includes(order.status) && !withinCancelWindow && (
          <p className="text-xs text-center" style={{ color: '#555' }}>
            Cancellation window has expired (10 min from order time)
          </p>
        )}

        {/* Return Policy Banner — shown for delivered orders */}
        {order.status === 'delivered' && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-2.5"
            style={{ backgroundColor: '#0d1f0d', border: '1px solid #166534' }}>
            <RotateCcw className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#4ade80' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>48-Hour Return Policy</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#86efac' }}>
                Returns accepted within 48 hours of delivery. Return request must be submitted within 24 hours.
              </p>
            </div>
          </div>
        )}

        {canReturn && returnBlocked && (
          <p className="text-xs text-center px-3 py-2 rounded-lg" style={{ color: '#fb923c', backgroundColor: '#2a1a0a', border: '1px solid #7c3700' }}>
            🚫 Returns are unavailable on your account due to a history of returns. Please contact support.
          </p>
        )}
        {canReturn && !returnBlocked && (
          <Button onClick={() => setShowReturnConfirm(true)} fullWidth variant="outline"
            style={{ borderColor: '#e91e8c', color: '#e91e8c' }}>
            <RotateCcw className="h-4 w-4" />
            Request Return
            <span className="ml-1 text-[10px] font-normal opacity-70">
              ({returnHrsLeft}h {returnMinsLeft}m left)
            </span>
          </Button>
        )}
        {order.status === 'delivered' && !canReturn && (
          <p className="text-xs text-center" style={{ color: '#555' }}>
            Return request window has expired (24 hours from delivery)
          </p>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => !cancelling && setShowCancelConfirm(false)}
        >
          <div
            className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#141414', border: '1px solid #2e2e2e' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #2a0a0a', backgroundColor: '#1c0808' }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 20 }}>⚠️</span>
                <p className="text-base font-bold" style={{ color: '#f87171' }}>Cancel Order?</p>
              </div>
              <p className="text-xs" style={{ color: '#9a6060' }}>
                Order <span style={{ color: '#fca5a5', fontWeight: 600 }}>#{order.order_number}</span> will be permanently cancelled.
              </p>
            </div>

            {/* Rules */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#555' }}>Before you cancel, please note:</p>

              <div className="space-y-2">
                {[
                  { icon: '🔁', text: 'Cancellation cannot be undone once confirmed.' },
                  { icon: '💰', text: 'If paid online, refund will be initiated within 5–7 business days.' },
                  { icon: '⏱️', text: 'Cancellation is only allowed within 10 minutes of placing the order.' },
                  { icon: '📦', text: 'Once packed or shipped, orders cannot be cancelled — request a return instead.' },
                  { icon: '🚫', text: 'Repeated cancellations may affect your account.' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: '#1e1010', border: '1px solid #3a1515' }}>
                    <span className="text-sm shrink-0 mt-0.5">{icon}</span>
                    <p className="text-xs leading-snug" style={{ color: '#c08080' }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-6 flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                style={{ border: '1px solid #2e2e2e', color: '#888', backgroundColor: 'transparent' }}
              >
                Keep Order
              </button>
              <button
                onClick={cancel}
                disabled={cancelling}
                className="flex-1 py-3 rounded-2xl text-sm font-bold"
                style={{ backgroundColor: cancelling ? '#4a1010' : '#dc2626', color: '#fff', border: 'none', opacity: cancelling ? 0.7 : 1 }}
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {showReturnConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowReturnConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 shrink-0" style={{ color: '#e91e8c' }} />
              <p className="text-base font-bold" style={{ color: '#f5f5f5' }}>Request a Return?</p>
            </div>

            <p className="text-sm" style={{ color: '#888' }}>
              You are about to request a return for order <span style={{ color: '#ddd', fontWeight: 600 }}>#{order.order_number}</span>.
            </p>

            <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: '#111', border: '1px solid #222' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#555' }}>Return Policy</p>
              <p className="text-xs" style={{ color: '#888' }}>• Returns accepted within 48 hours of delivery</p>
              <p className="text-xs" style={{ color: '#888' }}>• Request must be submitted within 24 hours</p>
              <p className="text-xs" style={{ color: '#888' }}>• Item must be unused and in original condition</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowReturnConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid #2e2e2e', color: '#888', backgroundColor: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowReturnConfirm(false); navigate(`/orders/${id}/return`); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: '#e91e8c', color: '#fff', border: 'none' }}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
