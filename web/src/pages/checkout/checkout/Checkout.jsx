import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderApi, userApi, couponApi, loyaltyApi, settingsApi, spinWheelApi, walletApi } from '../../../api';
import useCartStore from '../../../store/cart.store';
import useAuthStore from '../../../store/auth.store';
import { formatPrice } from '../../../utils/format';
import { loadRazorpay, openRazorpayCheckout } from '../../../utils/razorpay';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import toast from 'react-hot-toast';

const getImageUrl = (img) => {
  if (!img) return '/placeholder.svg';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return img.startsWith('/') ? img : '/' + img;
};

const PAYMENT_METHODS_ALL = [
  { id: 'online', label: 'Online Payment (Razorpay)' },
  { id: 'cod', label: 'Cash on Delivery' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const buyNow = location.state?.buyNow || null;
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', address_line1: '', city: '', state: '', pincode: '' });
  const [loyaltyCard, setLoyaltyCard] = useState(null);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
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
          if (reward.prize_type === 'coupon' && reward.coupon_code) {
            setCoupon(reward.coupon_code);
            couponApi.validate(reward.coupon_code, 100)
              .then((cRes) => setAppliedCoupon(cRes.data?.coupon || cRes.data || cRes))
              .catch(() => {});
          }
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
  useEffect(() => {
    const card = loyaltyData?.data?.card;
    setLoyaltyCard(card || null);
    if (!card || card.points < 200) setUseLoyaltyPoints(false);
  }, [loyaltyData]);

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
    const list = data?.data?.addresses || [];
    if (list.length === 0) {
      navigate('/profile', { state: { addAddress: true, next: '/checkout' } });
    } else if (!selectedAddress) {
      setSelectedAddress(list[0].id);
    }
  }, [data]);

  const displayItems = buyNow
    ? [{ id: buyNow.product_id, ...buyNow }]
    : items;
  const subtotal = buyNow
    ? (buyNow.offer_price || buyNow.price) * (buyNow.quantity || 1)
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

  // Server picks best discount — mirror same logic for preview
  const discount = Math.max(couponDiscountAmt, birthdayDiscountAmt);
  const discountIsBirthday = birthdayDiscountAmt > 0 && birthdayDiscountAmt >= couponDiscountAmt;

  const loyaltyDiscount = useLoyaltyPoints ? 200 : 0;
  const pointsToEarn = Math.floor(Math.max(0, subtotal - discount - loyaltyDiscount) / 500) * 20;

  const shipping = (spinReward?.prize_type === 'free_shipping' || (subtotal - discount) >= freeDeliveryThreshold) ? 0 : deliveryCharge;
  const grandTotal = Math.max(0, subtotal - discount - loyaltyDiscount + shipping);
  const walletAmount = useWallet ? Math.min(walletBalance, grandTotal) : 0;
  const payableTotal = Math.max(0, grandTotal - walletAmount);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await couponApi.validate(coupon, subtotal);
      setAppliedCoupon(res.data.coupon);
      toast.success(`Coupon applied! You save ${formatPrice(discount || 0)}`);
    } catch (e) {
      setAppliedCoupon(null);
      toast.error(e.response?.data?.message || 'Invalid coupon');
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
        openRazorpayCheckout({
          order: res.data.razorpay,
          user,
          onSuccess: async (paymentData) => {
            await orderApi.verifyPayment({ ...paymentData, order_id: order.id });
            if (!buyNow) clearCart();
            navigate(`/orders/${order.id}?success=true`);
          },
          onError: () => toast.error('Payment failed. Please try again.'),
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
    <div className="max-w-md mx-auto text-center py-20">
      <p className="mb-4" style={{ color: '#666' }}>Your cart is empty</p>
      <Button onClick={() => navigate('/products')}>Shop Now</Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#f5f5f5' }}>Checkout</h1>
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left */}
        <div className="md:col-span-2 space-y-6">
          {/* Delivery Address */}
          <section className="rounded-2xl p-5" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: '#ddd' }}>Delivery Address</h2>
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
                    {/* Phone — +91 prefix, 10 digits */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#aaa' }}>Phone</label>
                      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #2e2e2e' }}>
                        <span className="flex items-center px-2 text-xs font-bold" style={{ backgroundColor: '#252525', color: '#f5f5f5', borderRight: '1px solid #2e2e2e', whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                        <input type="tel"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                          placeholder="10-digit number"
                          maxLength={10}
                          className="flex-1 px-2 py-2 text-sm focus:outline-none"
                          style={{ backgroundColor: '#1a1a1a', color: '#f5f5f5' }} />
                      </div>
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
          <section className="rounded-2xl p-5" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#ddd' }}>Payment Method</h2>
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
                  <span className="text-sm font-medium" style={{ color: '#ddd' }}>{m.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <aside className="space-y-4">
          <div className="rounded-2xl p-5 space-y-4 sticky top-24" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
            <h2 className="font-semibold" style={{ color: '#ddd' }}>Order Summary</h2>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {displayItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img src={getImageUrl(item.image)} alt={item.name}
                    className="w-12 h-14 object-cover rounded-lg shrink-0" style={{ backgroundColor: '#222' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium line-clamp-2" style={{ color: '#ddd' }}>{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#666' }}>Qty: {item.quantity}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#f5f5f5' }}>{formatPrice((item.offer_price || item.price) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Spin Wheel Reward Banner */}
            {spinReward && (
              <div className="rounded-xl p-3 border text-xs font-semibold" style={{ backgroundColor: '#142918', borderColor: '#16a34a', color: '#4ade80' }}>
                {spinReward.prize_type === 'free_shipping'
                  ? '🎁 Lucky Spin Wheel Gift: Free Delivery Auto-Applied!'
                  : `🎁 Lucky Spin Wheel Gift: Coupon "${spinReward.coupon_code}" Auto-Applied!`}
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
                  {loyaltyCard.points >= 200 ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs" style={{ color: '#aaa' }}>Use 200 pts (−₹200)</span>
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
                    <p className="text-xs" style={{ color: '#555' }}>{200 - loyaltyCard.points} pts to redeem</p>
                  )}
                </div>
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
                  <span>Loyalty Points (200 pts)</span><span>−{formatPrice(loyaltyDiscount)}</span>
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
              {paymentMethod === 'online' && payableTotal > 0 ? 'Proceed to Pay' : 'Place Order'}
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
                      {formatPrice((item.offer_price || item.price) * item.quantity)}
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
