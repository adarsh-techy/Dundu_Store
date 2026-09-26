import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderApi, userApi, couponApi, loyaltyApi, settingsApi, spinWheelApi, walletApi } from '../../../api';
import useCartStore, { cartItemPrice, cartItemName, cartItemImage } from '../../../store/cart.store';
import PageHeader from '../../../components/ui/PageHeader';
import EmptyState from '../../../components/ui/EmptyState';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import { PhoneInput } from '../../auth/AuthShell';
import useAuthStore from '../../../store/auth.store';
import { formatPrice } from '../../../utils/format';
import { loadRazorpay, openRazorpayCheckout } from '../../../utils/razorpay';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import toast from 'react-hot-toast';

import { imageUrl as getImageUrl } from '../../../utils/image';

const PAYMENT_METHODS_ALL = [
  { id: 'online', label: 'Pay online', hint: 'UPI · Cards · Net banking via Razorpay' },
  { id: 'cod', label: 'Cash on delivery', hint: 'Pay when your order arrives' },
];

export default function Checkout() {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const buyNow = location.state?.buyNow || null;
  const [chosenAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', address_line1: '', city: '', state: '', pincode: '' });
  const [wantLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [codEnabled, setCodEnabled] = useState(true);
  const [codBlockedForUser, setCodBlockedForUser] = useState(false);
  const [couponFieldEnabled, setCouponFieldEnabled] = useState(true);
  const [deliveryCharge, setDeliveryCharge] = useState(50);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(500);
  const [birthdayDiscountPct, setBirthdayDiscountPct] = useState(0);
  const [deliveryEstimateText, setDeliveryEstimateText] = useState('');
  const [spinReward, setSpinReward] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletRules, setWalletRules] = useState({ enabled: true, min_order_amount: 0, max_usage_percent: 100, max_discount_cap: 0 });
  const [loyaltyRule, setLoyaltyRule] = useState({ points: 200, discount: 200 });

  useEffect(() => {
    if (!user) return;
    walletApi.get().then((res) => setWalletBalance(res?.data?.wallet?.balance || 0)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    spinWheelApi.getActiveReward({ phone: user.phone || '', user_id: user.id || '' })
      .then((res) => {
        const reward = res?.data?.active_reward || res?.active_reward;
        if (reward) {
          setSpinReward(reward);
          if (reward.prize_type === 'coupon' && reward.coupon_code) setCoupon(reward.coupon_code);
        }
      })
      .catch(() => {});
  }, [user]);

  const { data, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: userApi.getAddresses,
  });
  const addresses = data?.data?.addresses || [];

  const { data: loyaltyData } = useQuery({
    queryKey: ['my-loyalty-card'],
    queryFn: loyaltyApi.getMyCard,
    enabled: !!user,
  });
  const loyaltyCard = loyaltyData?.data?.card || null;
  const useLoyaltyPoints = wantLoyaltyPoints && !!loyaltyCard && loyaltyCard.points >= loyaltyRule.points;

  useEffect(() => {
    settingsApi.getPayment()
      .then((res) => {
        const d = res?.data;
        const enabled = d?.cod_enabled !== false;
        setCodEnabled(enabled);
        if (!enabled && paymentMethod === 'cod') setPaymentMethod('online');
        if (d?.delivery_charge !== undefined) setDeliveryCharge(d.delivery_charge);
        if (d?.free_delivery_threshold !== undefined) setFreeDeliveryThreshold(d.free_delivery_threshold);
        if (d?.coupon_field_enabled !== undefined) setCouponFieldEnabled(d.coupon_field_enabled !== false);
        if (d?.birthday_discount) setBirthdayDiscountPct(d.birthday_discount);
        if (d?.delivery_estimate_text) setDeliveryEstimateText(d.delivery_estimate_text);
        if (d?.wallet) setWalletRules(d.wallet);
        if (d?.loyalty_redeem_points) setLoyaltyRule({ points: d.loyalty_redeem_points, discount: d.loyalty_redeem_discount || d.loyalty_redeem_points });
      })
      .catch(() => { });

    orderApi.getRestrictions()
      .then((res) => {
        if (res?.data?.cod_blocked) {
          setCodBlockedForUser(true);
          setPaymentMethod((m) => (m === 'cod' ? 'online' : m));
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!data) return;
    if ((data?.data?.addresses || []).length === 0) {
      navigate('/profile', { state: { addAddress: true, next: '/checkout', nextState: location.state || null } });
    }
  }, [data, navigate]);
  const selectedAddress = chosenAddress ?? (addresses.find((a) => a.is_default)?.id || addresses[0]?.id || null);

  const displayItems = buyNow
    ? [{ id: buyNow.product_id, ...buyNow, quantity: buyNow.quantity || 1, unit: Number(buyNow.offer_price || buyNow.price) }]
    : items.map((i) => ({ ...i, name: cartItemName(i), image: cartItemImage(i), unit: cartItemPrice(i) }));
  const subtotal = buyNow
    ? (Number(buyNow.offer_price || buyNow.price)) * (buyNow.quantity || 1)
    : totalPrice();

  const isBirthday = (() => {
    if (!birthdayDiscountPct || !user?.date_of_birth) return false;
    const dob = new Date(user.date_of_birth);
    const now = new Date();
    return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
  })();

  const birthdayDiscountAmt = isBirthday ? Math.round(subtotal * birthdayDiscountPct / 100) : 0;

  const couponDiscountAmt = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Math.min((subtotal * appliedCoupon.discount_value) / 100, appliedCoupon.max_discount || Infinity)
      : appliedCoupon.discount_value
    : 0;

  // The server applies exactly ONE discount — the largest of coupon / birthday / loyalty
  // (a referral reward, if any, is also in that race but only the server knows about it).
  const loyaltyCandidate = useLoyaltyPoints ? Math.min(subtotal, loyaltyRule.discount) : 0;
  const best = [
    { type: 'coupon', amount: Math.min(subtotal, couponDiscountAmt) },
    { type: 'birthday', amount: Math.min(subtotal, birthdayDiscountAmt) },
    { type: 'loyalty', amount: loyaltyCandidate },
  ].reduce((a, b) => (b.amount > a.amount ? b : a));
  const discountType = best.amount > 0 ? best.type : null;
  const discount = discountType && discountType !== 'loyalty' ? best.amount : 0;
  const loyaltyDiscount = discountType === 'loyalty' ? best.amount : 0;
  const discountIsBirthday = discountType === 'birthday';
  const pointsToEarn = Math.floor(Math.max(0, subtotal - discount - loyaltyDiscount) / 500) * 20;

  const afterDiscounts = Math.max(0, subtotal - discount - loyaltyDiscount);
  const shipping = (spinReward?.prize_type === 'free_shipping' || afterDiscounts >= freeDeliveryThreshold) ? 0 : deliveryCharge;
  const grandTotal = Math.round(Math.max(0, afterDiscounts + shipping) * 100) / 100;

  // Wallet: same caps the server enforces (enabled, min order, % of total, absolute cap).
  let walletAllowed = 0;
  if (useWallet && walletRules.enabled !== false && grandTotal >= (Number(walletRules.min_order_amount) || 0)) {
    walletAllowed = (grandTotal * (Number(walletRules.max_usage_percent) || 100)) / 100;
    if (Number(walletRules.max_discount_cap) > 0) walletAllowed = Math.min(walletAllowed, Number(walletRules.max_discount_cap));
  }
  const walletAmount = useWallet ? Math.round(Math.max(0, Math.min(walletBalance, grandTotal, walletAllowed)) * 100) / 100 : 0;
  const payableTotal = Math.max(0, Math.round((grandTotal - walletAmount) * 100) / 100);

  // Auto-apply a won spin/scratch coupon against the real subtotal (once per code).
  const autoTriedRef = useRef('');
  useEffect(() => {
    const code = spinReward?.coupon_code;
    if (!code || coupon !== code || appliedCoupon || !(subtotal > 0) || autoTriedRef.current === code) return;
    autoTriedRef.current = code;
    couponApi.validate(code, subtotal)
      .then((cRes) => setAppliedCoupon(cRes.data?.coupon || null))
      .catch((e) => toast(e?.message || 'Prize coupon could not be applied', { icon: '🎟️' }));
  }, [spinReward, coupon, appliedCoupon, subtotal]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await couponApi.validate(coupon, subtotal);
      setAppliedCoupon(res.data.coupon);
      toast.success(`Coupon applied! You save ${formatPrice(discount || 0)}`);
    } catch (e) {
      setAppliedCoupon(null);
      toast.error(e?.message || 'Invalid coupon');
    } finally { setApplyingCoupon(false); }
  };

  const saveAddress = async () => {
    try {
      const res = await userApi.addAddress({ ...newAddress, is_default: addresses.length === 0 });
      setSelectedAddress(res.data.address.id);
      setAddingAddress(false);
      refetch();
      toast.success('Address saved');
    } catch (e) {
      toast.error(e.message || 'Failed to save address');
    }
  };

  const placeOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    setLoading(true);
    try {
      const res = await orderApi.place({
        address_id: selectedAddress,
        coupon_code: appliedCoupon ? coupon : undefined,
        payment_method: paymentMethod,
        use_loyalty_points: useLoyaltyPoints,
        use_wallet: useWallet,
        ...(buyNow ? { buy_now_item: { product_id: buyNow.product_id, variant_id: buyNow.variant_id, quantity: buyNow.quantity || 1 } } : {}),
      });
      const order = res.data.order;

      if (paymentMethod === 'online' && res.data.razorpay) {
        const loaded = await loadRazorpay();
        if (!loaded) { toast.error('Failed to load payment gateway'); setLoading(false); return; }
        if (!buyNow) clearCart(); // the server already emptied the cart when it created the order
        const goToOrder = (msg) => { if (msg) toast(msg, { icon: '⏳' }); navigate(`/orders/${order.id}`); };
        openRazorpayCheckout({
          order: res.data.razorpay,
          user,
          onSuccess: async (paymentData) => {
            try {
              await orderApi.verifyPayment({ ...paymentData, order_id: order.id });
              navigate(`/orders/${order.id}?success=true`);
            } catch (err) {
              goToOrder(err?.message || 'We could not confirm the payment yet. Check the order page.');
            }
          },
          onError: () => goToOrder('Payment failed. You can retry from the order page.'),
          onDismiss: () => goToOrder('Payment not completed. Your order is saved — pay anytime from the order page.'),
        });
        setLoading(false);
        return;
      }

      if (!buyNow) clearCart();
      navigate(`/orders/${order.id}?success=true`);
    } catch (e) {
      toast.error(e.message || 'Failed to place order');
      setLoading(false);
    }
  };

  if (!buyNow && items.length === 0) return (
    <div className="container-x">
      <EmptyState emoji="🛍️" title="Your bag is empty" description="Add something you love and come back to check out." action="Shop now" to="/products" />
    </div>
  );

  return (
    <div className="container-x max-w-6xl py-6 md:py-10">
      <PageHeader title="Checkout" subtitle="Almost there — confirm your address and payment." crumbs={[{ label: 'Checkout' }]} />
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Delivery Address */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-ink">Delivery address</h2>
              {deliveryEstimateText && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#0f2e1a', color: '#4ade80' }}>
                  🚚 Delivery in {deliveryEstimateText}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {addresses.map((a) => (
                <label key={a.id}
                  className="flex gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  style={selectedAddress === a.id
                    ? { border: '1.5px solid #e91e8c', backgroundColor: '#1a0a12' }
                    : { border: '1px solid #2e2e2e', backgroundColor: '#222' }}>
                  <input type="radio" name="address" value={a.id} checked={selectedAddress === a.id}
                    onChange={() => setSelectedAddress(a.id)}
                    style={{ accentColor: '#e91e8c', marginTop: '2px' }} />
                  <div className="text-sm">
                    <p className="font-medium" style={{ color: '#ddd' }}>{a.name} · {a.phone}</p>
                    <p style={{ color: '#777' }}>{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ''}</p>
                    <p style={{ color: '#777' }}>{a.city}, {a.state} — {a.pincode}</p>
                  </div>
                </label>
              ))}
              {!addingAddress ? (
                <button onClick={() => setAddingAddress(true)} className="text-sm font-medium hover:underline" style={{ color: '#e91e8c' }}>+ Add new address</button>
              ) : (
                <div className="rounded-xl p-4 space-y-3" style={{ border: '1px solid #2e2e2e', backgroundColor: '#222' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Full Name" value={newAddress.name} onChange={(e) => setNewAddress(p => ({ ...p, name: e.target.value }))} />
                    <div>
                      <label className="block text-xs font-semibold tracking-wide text-muted mb-1.5">Phone</label>
                      <PhoneInput value={newAddress.phone} onChange={(v) => setNewAddress((p) => ({ ...p, phone: v }))} />
                    </div>
                  </div>
                  <Input label="Address" value={newAddress.address_line1} onChange={(e) => setNewAddress(p => ({ ...p, address_line1: e.target.value }))} />
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="City" value={newAddress.city} onChange={(e) => setNewAddress(p => ({ ...p, city: e.target.value }))} />
                    <Input label="State" value={newAddress.state} onChange={(e) => setNewAddress(p => ({ ...p, state: e.target.value }))} />
                    <Input label="Pincode" value={newAddress.pincode} onChange={(e) => setNewAddress(p => ({ ...p, pincode: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveAddress} size="sm">Save</Button>
                    <Button onClick={() => setAddingAddress(false)} variant="ghost" size="sm">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Birthday banner */}
          {(() => {
            if (!user?.date_of_birth || !birthdayDiscountPct) return null;
            const dob = new Date(user.date_of_birth);
            const now = new Date();
            if (dob.getMonth() !== now.getMonth() || dob.getDate() !== now.getDate()) return null;
            return (
              <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)' }}>
                <span className="text-3xl shrink-0">🎂</span>
                <div>
                  <p className="font-bold text-white text-sm">Happy Birthday! 🎉</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.88)' }}>
                    Your special {birthdayDiscountPct}% birthday discount is automatically applied to this order!
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Payment */}
          <section className="card p-5">
            <h2 className="font-display text-lg text-ink mb-4">Payment method</h2>
            {!codEnabled && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: '#2a1a0a', border: '1px solid #7c3700', color: '#fb923c' }}>
                🚫 Cash on Delivery is currently unavailable. Please pay online.
              </div>
            )}
            {codEnabled && codBlockedForUser && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: '#2a1a0a', border: '1px solid #7c3700', color: '#fb923c' }}>
                🚫 Cash on Delivery is unavailable on your account due to a history of returns. Please pay online.
              </div>
            )}
            <div className="space-y-2">
              {PAYMENT_METHODS_ALL.filter((m) => m.id !== 'cod' || (codEnabled && !codBlockedForUser)).map((m) => (
                <label key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  style={paymentMethod === m.id
                    ? { border: '1.5px solid #e91e8c', backgroundColor: '#1a0a12' }
                    : { border: '1px solid #2e2e2e', backgroundColor: '#222' }}>
                  <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)} style={{ accentColor: '#e91e8c' }} />
                  <span>
                    <span className="block text-sm font-medium" style={{ color: '#ddd' }}>{m.label}</span>
                    <span className="block text-xs mt-0.5" style={{ color: '#777' }}>{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-4 lg:sticky lg:top-32 min-w-0">
            <h2 className="font-display text-lg text-ink">Order summary</h2>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {displayItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img src={getImageUrl(item.image)} alt={item.name}
                    className="w-12 h-14 object-cover rounded-lg shrink-0" style={{ backgroundColor: '#222' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium line-clamp-2" style={{ color: '#ddd' }}>{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#666' }}>Qty: {item.quantity}{item.size || item.color ? ` · ${[item.size, item.color].filter(Boolean).join(' / ')}` : ''}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#f5f5f5' }}>{formatPrice(item.unit * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Spin Wheel Reward Banner */}
            {spinReward && (spinReward.prize_type === 'free_shipping' || (appliedCoupon && coupon === spinReward.coupon_code)) && (
              <div className="rounded-xl p-3 border text-xs font-semibold" style={{ backgroundColor: '#142918', borderColor: '#16a34a', color: '#4ade80' }}>
                {spinReward.prize_type === 'free_shipping'
                  ? '🎁 Lucky Spin Wheel Gift: Free Delivery Auto-Applied!'
                  : `🎁 Lucky Spin Wheel Gift: Coupon "${spinReward.coupon_code}" applied!`}
              </div>
            )}

            {/* Coupon */}
            {couponFieldEnabled && (
              <div className="flex gap-2">
                <input value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setAppliedCoupon(null); }}
                  placeholder="Coupon code"
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ backgroundColor: '#2a2a2a', border: '1px solid #2e2e2e', color: '#f5f5f5' }}
                  onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2e2e2e'; }}
                />
                <Button size="sm" variant="outline" onClick={applyCoupon} loading={applyingCoupon}>Apply</Button>
              </div>
            )}

            {/* Loyalty Points */}
            {loyaltyCard && (
              <div className="rounded-xl p-3 space-y-2" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1e1018' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#e91e8c' }}>Loyalty Points</p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>You have <span style={{ color: '#f5f5f5', fontWeight: 600 }}>{loyaltyCard.points} pts</span></p>
                  </div>
                  {loyaltyCard.points >= loyaltyRule.points ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs" style={{ color: '#aaa' }}>Use {loyaltyRule.points} pts (−₹{loyaltyRule.discount})</span>
                      <div
                        onClick={() => setUseLoyaltyPoints((v) => !v)}
                        className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
                        style={{ backgroundColor: useLoyaltyPoints ? '#e91e8c' : '#333' }}>
                        <span
                          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ transform: useLoyaltyPoints ? 'translateX(16px)' : 'none' }} />
                      </div>
                    </label>
                  ) : (
                    <p className="text-xs" style={{ color: '#555' }}>{loyaltyRule.points - loyaltyCard.points} pts to redeem</p>
                  )}
                </div>
                {useLoyaltyPoints && discountType !== 'loyalty' && (
                  <p className="text-xs" style={{ color: '#fbbf24' }}>Your {discountIsBirthday ? 'birthday' : 'coupon'} discount is larger, so points will not be used on this order.</p>
                )}
                {pointsToEarn > 0 && (
                  <p className="text-xs" style={{ color: '#888' }}>
                    You'll earn <span style={{ color: '#4ade80', fontWeight: 600 }}>+{pointsToEarn} pts</span> on this order
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 space-y-1.5 text-sm" style={{ borderTop: '1px solid #2e2e2e' }}>
              <div className="flex justify-between" style={{ color: '#888' }}>
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between" style={{ color: '#4ade80' }}>
                  <span>
                    {discountIsBirthday
                      ? `🎂 Birthday Discount (${birthdayDiscountPct}%)`
                      : `Discount (${appliedCoupon?.code})`}
                  </span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between" style={{ color: '#4ade80' }}>
                  <span>Loyalty Points ({loyaltyRule.points} pts)</span><span>−{formatPrice(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between" style={shipping === 0 ? { color: '#888', textDecoration: 'line-through' } : { color: '#888' }}>
                <span>Shipping</span>
                <span>{shipping === 0 ? formatPrice(deliveryCharge) : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1" style={{ borderTop: '1px solid #2e2e2e', color: '#f5f5f5' }}>
                <span>Total</span>
                <span className="flex items-center gap-2">
                  {shipping === 0 && (
                    <span style={{ color: '#888', textDecoration: 'line-through red', fontWeight: 'normal', fontSize: '14px' }}>
                      {formatPrice(grandTotal + deliveryCharge)}
                    </span>
                  )}
                  <span style={{ color: '#e91e8c' }}>{formatPrice(grandTotal)}</span>
                </span>
              </div>
            </div>

            {/* Wallet */}
            {user && walletBalance > 0 && (
              <div className="rounded-xl p-3 space-y-2" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1e1018' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#e91e8c' }}>Pay with Wallet</p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>Balance: <span style={{ color: '#f5f5f5', fontWeight: 600 }}>{formatPrice(walletBalance)}</span></p>
                  </div>
                  <div
                    onClick={() => setUseWallet((v) => !v)}
                    className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
                    style={{ backgroundColor: useWallet ? '#e91e8c' : '#333' }}>
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: useWallet ? 'translateX(16px)' : 'none' }} />
                  </div>
                </div>
                {useWallet && walletAmount > 0 && (
                  <p className="text-xs" style={{ color: '#4ade80' }}>−{formatPrice(walletAmount)} applied from your wallet</p>
                )}
              </div>
            )}

            {walletAmount > 0 && (
              <div className="flex justify-between font-bold text-base" style={{ color: '#f5f5f5' }}>
                <span>Amount Payable</span>
                <span style={{ color: '#e91e8c' }}>{formatPrice(payableTotal)}</span>
              </div>
            )}

            <Button
              onClick={() => {
                if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
                setShowConfirm(true);
              }}
              fullWidth size="lg">
              {paymentMethod === 'online' && payableTotal > 0 ? `Proceed to pay ${formatPrice(payableTotal)}` : 'Place order'}
            </Button>
          </div>
        </aside>
      </div>

      {/* Confirm Order Modal */}
      {showConfirm && (() => {
        const addr = addresses.find((a) => a.id === selectedAddress);
        return (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}>
            <div className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-6 space-y-5"
              style={{ backgroundColor: '#141414', border: '1px solid #2e2e2e' }}>

              {/* Header */}
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: '#f5f5f5' }}>Confirm Order</p>
                <p className="text-xs mt-1" style={{ color: '#666' }}>Please review before placing</p>
              </div>

              {/* Items */}
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {displayItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={getImageUrl(item.image)} alt={item.name}
                      className="w-10 h-12 object-cover rounded-lg shrink-0" style={{ backgroundColor: '#222' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1" style={{ color: '#ddd' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: '#666' }}>Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-semibold shrink-0" style={{ color: '#f5f5f5' }}>
                      {formatPrice(item.unit * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Address */}
              {addr && (
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#888' }}>Delivering to</p>
                  <p className="text-sm font-medium" style={{ color: '#ddd' }}>{addr.name} · {addr.phone}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#777' }}>
                    {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}, {addr.city}, {addr.state} — {addr.pincode}
                  </p>
                </div>
              )}

              {/* Price summary */}
              <div className="space-y-1.5 text-sm" style={{ borderTop: '1px solid #2a2a2a', paddingTop: '12px' }}>
                <div className="flex justify-between" style={{ color: '#888' }}>
                  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between" style={{ color: '#4ade80' }}>
                    <span>{discountIsBirthday ? `🎂 Birthday (${birthdayDiscountPct}%)` : 'Discount'}</span>
                    <span>−{formatPrice(discount)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between" style={{ color: '#4ade80' }}>
                    <span>Loyalty Points</span><span>−{formatPrice(loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={shipping === 0 ? { color: '#888', textDecoration: 'line-through' } : { color: '#888' }}>
                  <span>Shipping</span>
                  <span>{shipping === 0 ? formatPrice(deliveryCharge) : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1" style={{ borderTop: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                  <span>Total</span>
                  <span className="flex items-center gap-2">
                    {shipping === 0 && (
                      <span style={{ color: '#888', textDecoration: 'line-through red', fontWeight: 'normal', fontSize: '14px' }}>
                        {formatPrice(grandTotal + deliveryCharge)}
                      </span>
                    )}
                    <span style={{ color: '#e91e8c' }}>{formatPrice(grandTotal)}</span>
                  </span>
                </div>
                {walletAmount > 0 && (
                  <>
                    <div className="flex justify-between" style={{ color: '#4ade80' }}>
                      <span>Paid from Wallet</span><span>−{formatPrice(walletAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base" style={{ color: '#f5f5f5' }}>
                      <span>Amount Payable</span><span style={{ color: '#e91e8c' }}>{formatPrice(payableTotal)}</span>
                    </div>
                  </>
                )}
                <p className="text-xs text-center pt-1" style={{ color: '#555' }}>
                  via {payableTotal === 0 ? 'Wallet' : paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="ghost" fullWidth onClick={() => setShowConfirm(false)}>Go Back</Button>
                <Button fullWidth loading={loading} onClick={() => { setShowConfirm(false); placeOrder(); }}>
                  {paymentMethod === 'online' && payableTotal > 0 ? 'Pay Now' : 'Confirm Order'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
