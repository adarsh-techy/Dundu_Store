import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ShoppingCart, Heart, ShoppingBag, ChevronRight, Ban, X,
  Trash2, Store, Activity, MapPin, User, Mail, Phone, Calendar,
  ShieldCheck, ShieldAlert, CheckCircle2, Package, Tag,
} from 'lucide-react';
import { userApi, orderApi } from '../../../api';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate, formatDateTime } from '../../../utils/format';
import toast from 'react-hot-toast';

const STATUS_FLOW = ['pending', 'packed', 'shipped', 'delivered'];
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  packed:    { label: 'Packed',    pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  shipped:   { label: 'In Transit',pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  delivered: { label: 'Delivered', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', pill: 'bg-rose-50 text-rose-700 border-rose-200' },
  returned:  { label: 'Returned',  pill: 'bg-slate-100 text-slate-700 border-slate-200' },
};
const nextStatus = (s) => {
  const i = STATUS_FLOW.indexOf(s);
  return i !== -1 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
};

/* ── Confirmation modal ─────────────────────────────── */
function ConfirmModal({ title, message, confirmLabel, danger, onClose, onConfirm }) {
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
          <Button variant={danger ? 'danger' : 'primary'} size="sm" loading={loading} onClick={handle}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Product item row (shared by cart & wishlist) ───── */
function ProductRow({ image, name, subtitle, price, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {image ? (
        <img src={image} alt="" className="w-11 h-13 rounded-xl object-cover shrink-0 border border-slate-200/80 bg-slate-50 shadow-sm" />
      ) : (
        <div className="w-11 h-13 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-400">
          <Package className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        {price !== undefined && (
          <p className="text-xs font-black text-slate-900 mt-1">{formatPrice(price)}</p>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          title="Remove Item"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ── Tab: Orders ────────────────────────────────────── */
function OrdersTab({ orders, userId }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [advanceTarget, setAdvanceTarget] = useState(null);

  const doCancel = async () => {
    await orderApi.updateStatus(cancelTarget.id, { status: 'cancelled' });
    qc.invalidateQueries({ queryKey: ['admin-user', userId] });
    toast.success('Order cancelled and inventory restored');
    setCancelTarget(null);
  };

  const doAdvance = async () => {
    const next = nextStatus(advanceTarget.status);
    await orderApi.updateStatus(advanceTarget.id, { status: next });
    qc.invalidateQueries({ queryKey: ['admin-user', userId] });
    toast.success(`Marked as ${next}`);
    setAdvanceTarget(null);
  };

  return (
    <>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          No orders placed by this customer yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Placed Date</th>
                <th className="px-4 py-3 text-right">Order Total</th>
                <th className="px-4 py-3 text-center">Fulfillment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const next = nextStatus(o.status);
                const st = STATUS_CONFIG[o.status] || { label: o.status, pill: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/orders/${o.id}`)}
                        className="font-mono font-bold text-slate-900 hover:text-emerald-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs transition-colors"
                      >
                        #{o.order_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 font-black text-slate-900 text-right">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${st.pill}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {next && (
                          <button
                            onClick={() => setAdvanceTarget(o)}
                            className="flex items-center gap-0.5 text-xs font-bold text-indigo-600 hover:underline"
                          >
                            Mark {next.toUpperCase()} <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                        {(o.status === 'pending' || o.status === 'packed') && (
                          <button
                            onClick={() => setCancelTarget(o)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cancelTarget && (
        <ConfirmModal
          title="Cancel Order"
          message={`Cancel order #${cancelTarget.order_number}? Warehouse stock will be restored.`}
          confirmLabel="Cancel Order"
          danger
          onClose={() => setCancelTarget(null)}
          onConfirm={doCancel}
        />
      )}
      {advanceTarget && (
        <ConfirmModal
          title="Advance Order Status"
          message={`Advance order #${advanceTarget.order_number} to "${nextStatus(advanceTarget.status)}"?`}
          confirmLabel={`Mark as ${nextStatus(advanceTarget.status)}`}
          onClose={() => setAdvanceTarget(null)}
          onConfirm={doAdvance}
        />
      )}
    </>
  );
}

/* ── Tab: Cart ──────────────────────────────────────── */
function CartTab({ userId }) {
  const qc = useQueryClient();
  const [clearConfirm, setClearConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-cart', userId],
    queryFn: () => userApi.getCart(userId),
  });
  const cart = data?.data?.cart || [];

  const removeItem = async (itemId) => {
    try {
      await userApi.removeCartItem(userId, itemId);
      qc.invalidateQueries({ queryKey: ['admin-user-cart', userId] });
      toast.success('Item removed from cart');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const doClear = async () => {
    await userApi.clearCart(userId);
    qc.invalidateQueries({ queryKey: ['admin-user-cart', userId] });
    toast.success('Customer cart cleared');
    setClearConfirm(false);
  };

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <>
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Basket Contents ({cart.length})
        </span>
        {cart.length > 0 && (
          <button
            onClick={() => setClearConfirm(true)}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline"
          >
            <Trash2 className="h-3 w-3" /> Clear Cart
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          Customer shopping basket is empty
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {cart.map((item) => (
              <ProductRow
                key={item.id}
                image={item.image_url}
                name={item.product_name}
                subtitle={`${[item.size, item.color].filter(Boolean).join(' · ')} × ${item.quantity}`}
                price={(item.offer_price || item.price) * item.quantity}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Cart Total</span>
            <span className="font-black text-slate-900 text-sm">
              {formatPrice(cart.reduce((s, i) => s + (i.offer_price || i.price) * i.quantity, 0))}
            </span>
          </div>
        </>
      )}

      {clearConfirm && (
        <ConfirmModal
          title="Clear Customer Cart"
          message={`Remove all ${cart.length} items from this customer's active shopping cart?`}
          confirmLabel="Clear Cart"
          danger
          onClose={() => setClearConfirm(false)}
          onConfirm={doClear}
        />
      )}
    </>
  );
}

/* ── Tab: Wishlist ──────────────────────────────────── */
function WishlistTab({ userId }) {
  const qc = useQueryClient();
  const [clearConfirm, setClearConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-wishlist', userId],
    queryFn: () => userApi.getWishlist(userId),
  });
  const wishlist = data?.data?.wishlist || [];

  const removeItem = async (itemId) => {
    try {
      await userApi.removeWishlistItem(userId, itemId);
      qc.invalidateQueries({ queryKey: ['admin-user-wishlist', userId] });
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const doClear = async () => {
    await userApi.clearWishlist(userId);
    qc.invalidateQueries({ queryKey: ['admin-user-wishlist', userId] });
    toast.success('Wishlist cleared');
    setClearConfirm(false);
  };

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <>
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Saved Wishlist ({wishlist.length})
        </span>
        {wishlist.length > 0 && (
          <button
            onClick={() => setClearConfirm(true)}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline"
          >
            <Trash2 className="h-3 w-3" /> Clear Wishlist
          </button>
        )}
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          <Heart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          Customer has no wishlisted items
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {wishlist.map((item) => (
            <ProductRow
              key={item.id}
              image={item.image_url}
              name={item.product_name}
              subtitle={
                item.offer_price
                  ? `${formatPrice(item.offer_price)} (was ${formatPrice(item.price)})`
                  : formatPrice(item.price)
              }
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      {clearConfirm && (
        <ConfirmModal
          title="Clear Customer Wishlist"
          message="Remove all bookmarked items from this customer's wishlist?"
          confirmLabel="Clear Wishlist"
          danger
          onClose={() => setClearConfirm(false)}
          onConfirm={doClear}
        />
      )}
    </>
  );
}

/* ── Tab: Activity ──────────────────────────────────── */
function ActivityTab({ userId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-activity', userId],
    queryFn: () => userApi.getActivity(userId),
  });
  const loginHistory = data?.data?.login_history || [];
  const productViews = data?.data?.product_views || [];

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-slate-500" /> Login Log ({loginHistory.length})
        </h3>
        {loginHistory.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No logins recorded yet</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
            {loginHistory.map((l, i) => (
              <div key={i} className="pt-1.5 first:pt-0 text-xs text-slate-600 flex justify-between">
                <span>Session Login</span>
                <span className="font-mono text-slate-400">{formatDateTime(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-slate-500" /> Products Browsed ({productViews.length})
        </h3>
        {productViews.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No catalog interactions recorded yet</p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {productViews.map((p) => (
              <ProductRow
                key={p.product_id}
                image={p.image_url}
                name={p.product_name}
                subtitle={`${p.view_count} interaction${p.view_count !== 1 ? 's' : ''} · ${formatDateTime(p.last_viewed_at)}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────── */
const TABS = [
  { key: 'orders',   label: 'Orders',   Icon: ShoppingBag },
  { key: 'cart',     label: 'Shopping Cart', Icon: ShoppingCart },
  { key: 'wishlist', label: 'Wishlist', Icon: Heart },
  { key: 'activity', label: 'Session Activity', Icon: Activity },
];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('orders');
  const [codLoading, setCodLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => userApi.getOne(id),
  });

  const handleToggleCod = async () => {
    setCodLoading(true);
    try {
      const res = await userApi.toggleCodBlock(id);
      const isBlocked = res.data?.data?.is_cod_blocked ?? res.data?.is_cod_blocked;
      toast.success(isBlocked ? 'COD payment restricted for this user' : 'COD payment enabled for this user');
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
    } catch {
      toast.error('Failed to update COD permission');
    } finally {
      setCodLoading(false);
    }
  };

  const handleToggleBlock = async (currentBlocked) => {
    setBlockLoading(true);
    try {
      await userApi.toggleBlock(id);
      toast.success(currentBlocked ? 'User unblocked successfully' : 'User account blocked');
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setBlockLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-500">Loading customer profile...</p>
      </div>
    );
  }

  const { user, orders = [], addresses = [], referred_users = [] } = data?.data || {};
  if (!user) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center gap-3">
        <User className="h-8 w-8 text-slate-400" />
        <p className="text-sm font-bold text-slate-800">Customer account not found</p>
        <Button variant="outline" onClick={() => navigate('/users')} className="mt-2">
          Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── 1. Top Executive Profile Header ──────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/users')}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 border border-slate-200 shrink-0"
            title="Back to Customer Directory"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{user.name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  user.is_blocked
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${user.is_blocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                {user.is_blocked ? 'Blocked' : 'Active Account'}
              </span>

              {user.is_cod_blocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <ShieldAlert className="h-3 w-3" /> COD Restricted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> COD Allowed
                </span>
              )}

              {user.is_offline && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Store className="h-3 w-3" /> In-Store Customer
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Customer ID: {user.id}</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleToggleCod}
            disabled={codLoading}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              user.is_cod_blocked
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {user.is_cod_blocked ? 'Enable COD' : 'Restrict COD'}
          </button>

          <button
            onClick={() => handleToggleBlock(user.is_blocked)}
            disabled={blockLoading}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              user.is_blocked
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {user.is_blocked ? 'Unblock User' : 'Block User'}
          </button>
        </div>
      </div>

      {/* ── 2. Main Two-Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 Col): Profile Info, Addresses, Referrals */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="h-4 w-4 text-slate-400" /> Account Information
            </h2>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Phone</span>
                <span className="font-mono font-bold text-slate-900">{user.phone || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-700 font-medium truncate max-w-[160px]">{user.email || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Joined</span>
                <span className="text-slate-700">{formatDate(user.created_at)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-slate-500">Referral Code</span>
                <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {user.referral_code || '—'}
                </span>
              </div>
              {user.referred_by_name && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Referred By</span>
                  <span className="font-bold text-indigo-600">{user.referred_by_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Addresses Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin className="h-4 w-4 text-slate-400" /> Saved Addresses ({addresses.length})
            </h2>
            {addresses.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No addresses registered yet</p>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100">
                {addresses.map((a) => (
                  <div key={a.id} className="pt-2.5 first:pt-0 text-xs text-slate-700 space-y-0.5">
                    <p className="font-bold text-slate-900">{a.name} · <span className="font-mono font-normal">{a.phone}</span></p>
                    <p className="text-slate-600">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ''}</p>
                    <p className="text-slate-500">{a.city}, {a.state} — <span className="font-mono">{a.pincode}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Referred Users Card */}
          {referred_users.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <Tag className="h-4 w-4 text-slate-400" /> Referred Users ({referred_users.length})
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100">
                {referred_users.map((r) => (
                  <div key={r.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{r.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{r.phone || r.email || ''}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{formatDate(r.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (2 Cols): Tabbed Studio */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden self-start">
          {/* Studio Tab bar */}
          <div className="flex border-b border-slate-200/80 bg-slate-50/80 overflow-x-auto">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  tab === key
                    ? 'border-slate-900 text-slate-900 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {key === 'orders' && orders.length > 0 && (
                  <span className="ml-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 border border-slate-200">
                    {orders.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {tab === 'orders'   && <OrdersTab orders={orders} userId={id} />}
            {tab === 'cart'     && <CartTab userId={id} />}
            {tab === 'wishlist' && <WishlistTab userId={id} />}
            {tab === 'activity' && <ActivityTab userId={id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
