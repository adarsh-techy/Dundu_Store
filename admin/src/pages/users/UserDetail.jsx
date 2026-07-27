import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Heart, ShoppingBag, ChevronRight, Ban, X, Trash2, Store, Activity } from 'lucide-react';
import { userApi, orderApi } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { formatPrice, formatDate, formatDateTime } from '../../utils/format';
import toast from 'react-hot-toast';

const STATUS_FLOW = ['pending', 'packed', 'shipped', 'delivered'];
const statusColor = { pending: 'yellow', packed: 'blue', shipped: 'blue', delivered: 'green', cancelled: 'red', returned: 'gray' };
const nextStatus = (s) => { const i = STATUS_FLOW.indexOf(s); return i !== -1 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null; };

/* ── Confirmation modal ─────────────────────────────── */
function ConfirmModal({ title, message, confirmLabel, danger, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" loading={loading} onClick={handle}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Product item row (shared by cart & wishlist) ───── */
function ProductRow({ image, name, subtitle, price, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {image
        ? <img src={image} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-100" />
        : <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        {price !== undefined && <p className="text-xs font-semibold text-pink-600 mt-0.5">{formatPrice(price)}</p>}
      </div>
      {onRemove && (
        <button onClick={onRemove} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Remove">
          <X className="h-3.5 w-3.5" />
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
    await orderApi.updateStatus(cancelTarget.id, 'cancelled');
    qc.invalidateQueries(['admin-user', userId]);
    toast.success('Order cancelled');
    setCancelTarget(null);
  };

  const doAdvance = async () => {
    const next = nextStatus(advanceTarget.status);
    await orderApi.updateStatus(advanceTarget.id, next);
    qc.invalidateQueries(['admin-user', userId]);
    toast.success(`Marked as ${next}`);
    setAdvanceTarget(null);
  };

  return (
    <>
      {orders.length === 0
        ? <p className="text-sm text-gray-400 py-6 text-center">No orders yet</p>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                {['Order #', 'Date', 'Total', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => {
                const next = nextStatus(o.status);
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/orders/${o.id}`)} className="font-medium text-indigo-600 hover:underline">
                        #{o.order_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[o.status] || 'gray'}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {next && (
                          <button onClick={() => setAdvanceTarget(o)} className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:underline">
                            <ChevronRight className="h-3 w-3" />{next.charAt(0).toUpperCase() + next.slice(1)}
                          </button>
                        )}
                        {(o.status === 'pending' || o.status === 'packed') && (
                          <button onClick={() => setCancelTarget(o)} className="flex items-center gap-0.5 text-xs font-medium text-red-500 hover:underline">
                            <Ban className="h-3 w-3" />Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

      {cancelTarget && (
        <ConfirmModal title="Cancel Order" message={`Cancel order #${cancelTarget.order_number}?`}
          confirmLabel="Cancel Order" danger onClose={() => setCancelTarget(null)} onConfirm={doCancel} />
      )}
      {advanceTarget && (
        <ConfirmModal title="Update Status"
          message={`Mark order #${advanceTarget.order_number} as "${nextStatus(advanceTarget.status)}"?`}
          confirmLabel={`Mark as ${nextStatus(advanceTarget.status)}`}
          onClose={() => setAdvanceTarget(null)} onConfirm={doAdvance} />
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
      qc.invalidateQueries(['admin-user-cart', userId]);
      toast.success('Removed from cart');
    } catch { toast.error('Failed'); }
  };

  const doClear = async () => {
    await userApi.clearCart(userId);
    qc.invalidateQueries(['admin-user-cart', userId]);
    toast.success('Cart cleared');
    setClearConfirm(false);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-500">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
        {cart.length > 0 && (
          <button onClick={() => setClearConfirm(true)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium hover:underline">
            <Trash2 className="h-3 w-3" />Clear all
          </button>
        )}
      </div>

      {cart.length === 0
        ? <p className="text-sm text-gray-400 py-6 text-center">Cart is empty</p>
        : (
          <>
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
            <div className="flex justify-between pt-3 mt-1 border-t border-gray-100 text-sm font-semibold">
              <span className="text-gray-600">Total</span>
              <span className="text-gray-900">{formatPrice(cart.reduce((s, i) => s + (i.offer_price || i.price) * i.quantity, 0))}</span>
            </div>
          </>
        )}

      {clearConfirm && (
        <ConfirmModal title="Clear Cart" message={`Remove all ${cart.length} items from this user's cart?`}
          confirmLabel="Clear Cart" danger onClose={() => setClearConfirm(false)} onConfirm={doClear} />
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
      qc.invalidateQueries(['admin-user-wishlist', userId]);
      toast.success('Removed from wishlist');
    } catch { toast.error('Failed'); }
  };

  const doClear = async () => {
    await userApi.clearWishlist(userId);
    qc.invalidateQueries(['admin-user-wishlist', userId]);
    toast.success('Wishlist cleared');
    setClearConfirm(false);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-500">{wishlist.length} item{wishlist.length !== 1 ? 's' : ''}</span>
        {wishlist.length > 0 && (
          <button onClick={() => setClearConfirm(true)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium hover:underline">
            <Trash2 className="h-3 w-3" />Clear all
          </button>
        )}
      </div>

      {wishlist.length === 0
        ? <p className="text-sm text-gray-400 py-6 text-center">Wishlist is empty</p>
        : wishlist.map((item) => (
          <ProductRow
            key={item.id}
            image={item.image_url}
            name={item.product_name}
            subtitle={item.offer_price ? `${formatPrice(item.offer_price)} (was ${formatPrice(item.price)})` : formatPrice(item.price)}
            onRemove={() => removeItem(item.id)}
          />
        ))}

      {clearConfirm && (
        <ConfirmModal title="Clear Wishlist" message="Remove all items from this user's wishlist?"
          confirmLabel="Clear Wishlist" danger onClose={() => setClearConfirm(false)} onConfirm={doClear} />
      )}
    </>
  );
}

/* ── Tab: Activity (login history + product views) ──── */
function ActivityTab({ userId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-activity', userId],
    queryFn: () => userApi.getActivity(userId),
  });
  const loginHistory = data?.data?.login_history || [];
  const productViews = data?.data?.product_views || [];

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Login History ({loginHistory.length})</h3>
        {loginHistory.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No logins recorded yet</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {loginHistory.map((l, i) => (
              <div key={i} className="py-2 border-b border-gray-50 last:border-0 text-sm text-gray-600">
                {formatDateTime(l.created_at)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Products Viewed ({productViews.length})</h3>
        {productViews.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No product views recorded yet</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {productViews.map((p) => (
              <ProductRow
                key={p.product_id}
                image={p.image_url}
                name={p.product_name}
                subtitle={`${p.view_count} view${p.view_count !== 1 ? 's' : ''} · last on ${formatDateTime(p.last_viewed_at)}`}
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
  { key: 'cart',     label: 'Cart',     Icon: ShoppingCart },
  { key: 'wishlist', label: 'Wishlist', Icon: Heart },
  { key: 'activity', label: 'Activity', Icon: Activity },
];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');

  const { data, isLoading } = useQuery({ queryKey: ['admin-user', id], queryFn: () => userApi.getOne(id) });

  if (isLoading) return <Spinner />;
  const { user, orders = [], addresses = [], referred_users = [] } = data?.data || {};
  if (!user) return <div className="text-center py-20 text-gray-400">User not found</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
        <Badge color={user.is_blocked ? 'red' : 'green'}>{user.is_blocked ? 'Blocked' : 'Active'}</Badge>
        {user.is_offline && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <Store className="h-3 w-3" /> In-Store Customer
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* ── Left: profile info ── */}
        <div className="space-y-4">

          <div className="bg-pink-50 rounded-2xl border border-pink-300 shadow-sm p-5">
            <h2 className="font-bold text-pink-600 text-lg mb-3">Details</h2>
            <div className="space-y-2 text-sm">
              {[['Email', user.email], ['Phone', user.phone], ['Joined', formatDate(user.created_at)]].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium">{v || '—'}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-50">
                <span className="text-gray-500">Referral Code</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100">
                  {user.referral_code || '—'}
                </span>
              </div>
              {user.referred_by_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Referred By</span>
                  <span className="font-medium text-indigo-600">{user.referred_by_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl border border-blue-300 shadow-sm p-5">
            <h2 className="font-bold text-blue-600 text-lg mb-3">Addresses</h2>
            {addresses.length === 0
              ? <p className="text-sm text-gray-400">No addresses saved</p>
              : addresses.map((a) => (
                <div key={a.id} className="text-sm text-gray-600 mb-3 last:mb-0">
                  <p className="font-medium">{a.name} · {a.phone}</p>
                  <p className="text-gray-500">{a.address_line1}, {a.city}, {a.state}</p>
                </div>
              ))}
          </div>

          {referred_users.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 text-sm mb-3">Referred Users ({referred_users.length})</h2>
              <div className="space-y-2">
                {referred_users.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.email || r.phone || ''}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: tabbed management ── */}
        <div className="md:col-span-2 bg-green-50 rounded-2xl border border-green-300 shadow-sm overflow-hidden self-start">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {key === 'orders' && orders.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{orders.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
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
