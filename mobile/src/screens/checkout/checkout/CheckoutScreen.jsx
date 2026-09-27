import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { userApi, orderApi, couponApi, settingsApi, walletApi, loyaltyApi } from '../../../api/index';
import AppHeader from '../../../components/ui/AppHeader';
import PhoneInput from '../../../components/ui/PhoneInput';
import useCartStore, { lineUnitPrice, lineName, lineImage } from '../../../store/cart.store';
import useAuthStore from '../../../store/auth.store';
import { API_URL, COLORS, UPLOADS_URL } from '../../../config';

// Prize endpoints identify the customer from the JWT, so every call must carry it.
const authHeaders = async () => {
  const token = (await AsyncStorage.getItem('dundu_token')) || (await AsyncStorage.getItem('velora_token'));
  return token ? { Authorization: `Bearer ${token}` } : {};
};
import { formatPrice } from '../../../utils/format';
import useLoginPromptStore from '../../../store/loginPrompt.store';
import useFreeShippingStore from '../../../store/freeShipping.store';

const ONLINE_METHODS = ['ONLINE', 'UPI', 'CARD'];
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const toNum = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const ALL_PAYMENT_METHODS = [
  { label: 'Cash on Delivery', value: 'COD' },
  { label: 'Online', value: 'ONLINE' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'CARD' },
];


export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const buyNow = route.params?.buyNow || null; // single-product direct buy

  const { items: cartItems, total: cartTotal, clearCart, resetCart } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const showPrompt = useLoginPromptStore((s) => s.show);

  // If buyNow mode — use only that product; otherwise use cart
  const items = buyNow ? [buyNow] : cartItems;
  const total = buyNow ? buyNow.price * buyNow.quantity : cartTotal;

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [codEnabled, setCodEnabled] = useState(true);
  const [couponFieldEnabled, setCouponFieldEnabled] = useState(true);
  const [deliveryCharge, setDeliveryCharge] = useState(50);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(500);
  const [birthdayDiscountPct, setBirthdayDiscountPct] = useState(0);
  const [deliveryEstimateText, setDeliveryEstimateText] = useState('');
  const [spinReward, setSpinReward] = useState(null);
  const [scratchReward, setScratchReward] = useState(null);
  const [hasPromptedFreeShippingOnCheckout, setHasPromptedFreeShippingOnCheckout] = useState(false);
  const openFreeShippingModal = useFreeShippingStore((s) => s.openModal);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  // Mirrors GET /settings/payment → wallet{...}
  const [walletSettings, setWalletSettings] = useState({
    enabled: true, min_order_amount: 0, max_usage_percent: 100, max_discount_cap: 0,
  });
  const [loyaltyRedeemPoints, setLoyaltyRedeemPoints] = useState(200);
  const [loyaltyRedeemDiscount, setLoyaltyRedeemDiscount] = useState(200);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const autoAppliedRewardRef = useRef('');

  useEffect(() => {
    if (!isAuthenticated) return;
    walletApi.get().then((res) => setWalletBalance(toNum((res?.data || res)?.wallet?.balance))).catch(() => {});
    loyaltyApi.myCard().then((res) => setLoyaltyPoints(toNum((res?.card || res?.data?.card)?.points))).catch(() => {});

    // Active Spin Wheel / Scratch Card rewards. Coupon-type prizes are auto-applied below;
    // free_shipping prizes are applied by the server when the order is placed.
    authHeaders().then((headers) => fetch(`${API_URL}/spin-wheel/active-reward`, { headers }))
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.data?.active_reward) setSpinReward(data.data.active_reward);
      })
      .catch(() => {});

    authHeaders().then((headers) => fetch(`${API_URL}/scratch-card/active-reward`, { headers }))
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.data?.active_reward) setScratchReward(data.data.active_reward);
      })
      .catch(() => {});
  }, [isAuthenticated, authUser]);

  // A won reward with a coupon code (any prize type except free_shipping) is auto-applied,
  // validated against the current subtotal.
  const autoRewardCode = [scratchReward, spinReward]
    .find((r) => r?.coupon_code && r.prize_type !== 'free_shipping')?.coupon_code || null;

  useEffect(() => {
    if (!autoRewardCode || !(total > 0)) return;
    const key = `${autoRewardCode}:${total}`;
    if (autoAppliedRewardRef.current === key) return;
    autoAppliedRewardRef.current = key;
    setCouponCode(autoRewardCode);
    couponApi.validate(autoRewardCode, total)
      .then((res) => {
        setCouponData(res?.coupon || res);
        setCouponError('');
      })
      .catch((err) => {
        setCouponData(null);
        setCouponError(err?.message || 'Your reward coupon could not be applied.');
      });
  }, [autoRewardCode, total]);

  // New address form
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      showPrompt('Login to place your order and checkout');
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }
    fetchAddresses();
    // Fetch COD availability
    settingsApi.getPayment()
      .then((res) => {
        const d = res?.data || res;
        const enabled = d?.cod_enabled !== false;
        setCodEnabled(enabled);
        if (!enabled) setPaymentMethod('ONLINE');
        if (d?.delivery_charge !== undefined) setDeliveryCharge(d.delivery_charge);
        if (d?.free_delivery_threshold !== undefined) setFreeDeliveryThreshold(d.free_delivery_threshold);
        if (d?.coupon_field_enabled !== undefined) setCouponFieldEnabled(d.coupon_field_enabled !== false);
        if (d?.birthday_discount) setBirthdayDiscountPct(d.birthday_discount);
        if (d?.delivery_estimate_text) setDeliveryEstimateText(d.delivery_estimate_text);
        if (d?.loyalty_redeem_points !== undefined) setLoyaltyRedeemPoints(toNum(d.loyalty_redeem_points, 200));
        if (d?.loyalty_redeem_discount !== undefined) setLoyaltyRedeemDiscount(toNum(d.loyalty_redeem_discount, 200));
        if (d?.wallet) {
          setWalletSettings({
            enabled: d.wallet.enabled !== false,
            min_order_amount: toNum(d.wallet.min_order_amount, 0),
            max_usage_percent: toNum(d.wallet.max_usage_percent, 100),
            max_discount_cap: toNum(d.wallet.max_discount_cap, 0),
          });
          if (d.wallet.enabled === false) setUseWallet(false);
        }
      })
      .catch(() => { });
  }, [isAuthenticated]);

  async function fetchAddresses() {
    setLoading(true);
    try {
      const res = await userApi.getAddresses();
      const addrs = res.addresses || res || [];
      setAddresses(addrs);
      if (addrs.length > 0) {
        const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
        setSelectedAddress(defaultAddr);
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await couponApi.validate(couponCode.trim(), total);
      setCouponData(res.coupon || res);
    } catch (err) {
      setCouponError(err?.message || 'Invalid or expired coupon.');
      setCouponData(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCouponData(null);
    setCouponCode('');
    setCouponError('');
  }

  async function handleAddAddress() {
    const { name, phone, address_line1, city, state, pincode } = newAddress;
    if (!name || !phone || !address_line1 || !city || !state || !pincode) {
      Alert.alert('Required Fields', 'Please fill all required address fields.');
      return;
    }
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      await userApi.addAddress({ ...newAddress, phone: '+91' + phone });
      await fetchAddresses();
      setShowAddAddress(false);
      setNewAddress({ name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '' });
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to add address.');
    }
  }

  function handlePlaceOrder() {
    if (!selectedAddress) {
      Alert.alert('No Address', 'Please select a delivery address.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }
    if (total > 0 && shipping > 0 && !hasPromptedFreeShippingOnCheckout) {
      setHasPromptedFreeShippingOnCheckout(true);
      openFreeShippingModal(total);
      return;
    }
    setShowConfirm(true);
  }

  async function doPlaceOrder() {
    setShowConfirm(false);
    setPlacing(true);

    try {
      const orderData = {
        address_id: selectedAddress.id,
        payment_method: String(paymentMethod || '').toLowerCase(),
        coupon_code: couponData ? couponCode.trim() : undefined,
        use_loyalty_points: useLoyalty && loyaltyAvailable,
        use_wallet: walletSettings.enabled && useWallet,
        ...(buyNow ? { buy_now_item: { product_id: buyNow.product_id, variant_id: buyNow.variant_id ?? null, quantity: buyNow.quantity || 1 } } : {}),
      };

      const res = await orderApi.place(orderData);
      const order = res?.order || res;
      const razorpayOrder = res?.razorpay || null;
      const walletInfo = res?.wallet || {};

      // The server is the source of truth for money — use its numbers from here on.
      const serverTotal = toNum(order?.total, finalTotal);
      const serverPayable = walletInfo.payable_amount !== undefined && walletInfo.payable_amount !== null
        ? toNum(walletInfo.payable_amount, payableTotal)
        : Math.max(0, round2(serverTotal - toNum(order?.wallet_amount)));

      // The order is placed at this point: a failed cart clear must not surface as an order failure.
      if (!buyNow) {
        try {
          await clearCart();
        } catch (_) {
          resetCart();
        }
      }

      const isOnline = ONLINE_METHODS.includes(String(paymentMethod || '').toUpperCase());
      const proceed = () => {
        if (isOnline && razorpayOrder) {
          navigation.replace('Payment', { order, razorpayOrder, user: authUser });
        } else if (isOnline && serverPayable > 0) {
          // Payment could not be started — the order is pending; the user can retry from order details.
          Alert.alert('Payment Not Started', 'Your order was created but the online payment could not be started. You can pay from the order details.');
          navigation.replace('OrderDetail', { orderId: order.id });
        } else {
          // COD, or the wallet covered the full payable amount
          navigation.replace('OrderSuccess', { orderId: order.id, orderNumber: order.order_number || order.id });
        }
      };

      const differs = Math.abs(serverTotal - finalTotal) >= 0.01 || Math.abs(serverPayable - payableTotal) >= 0.01;
      if (differs) {
        const lines = [
          `Order total: ${formatPrice(serverTotal)}`,
          toNum(order?.discount) > 0 ? `Discount: -${formatPrice(toNum(order.discount))}` : null,
          toNum(order?.loyalty_discount) > 0 ? `Loyalty discount: -${formatPrice(toNum(order.loyalty_discount))}` : null,
          `Shipping: ${toNum(order?.delivery_charge) > 0 ? formatPrice(toNum(order.delivery_charge)) : 'FREE'}`,
          toNum(walletInfo.amount_used) > 0 ? `Paid from wallet: -${formatPrice(toNum(walletInfo.amount_used))}` : null,
          `Amount payable: ${formatPrice(serverPayable)}`,
        ].filter(Boolean).join('\n');
        Alert.alert('Final Order Summary', `Your order was placed with these final amounts:\n\n${lines}`, [
          { text: 'Continue', onPress: proceed },
        ], { cancelable: false });
      } else {
        proceed();
      }
    } catch (err) {
      Alert.alert('Order Failed', err?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  // ── Money math — mirrors placeOrder on the server ─────────────────────────────
  // Exactly ONE best discount among coupon / birthday / loyalty (referral is server-only).
  const subtotal = round2(total);

  const couponDiscountAmt = (() => {
    if (!couponData) return 0;
    if (couponData.min_order_value && subtotal < toNum(couponData.min_order_value)) return 0;
    const value = toNum(couponData.discount_value);
    let d = couponData.discount_type === 'percentage'
      ? Math.min((subtotal * value) / 100, couponData.max_discount ? toNum(couponData.max_discount) : Infinity)
      : value;
    d = Math.min(Math.max(0, d), subtotal);
    return round2(d);
  })();

  // Birthday: DOB is today, DOB was set ≥30 days ago. (The "not used this year" check is server-side.)
  const isBirthday = (() => {
    if (!birthdayDiscountPct || !authUser?.date_of_birth) return false;
    const dob = new Date(authUser.date_of_birth);
    const now = new Date();
    const setAt = authUser.date_of_birth_set_at ? new Date(authUser.date_of_birth_set_at) : null;
    const settled = !setAt || (now - setAt) >= 30 * 24 * 60 * 60 * 1000;
    return settled && dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
  })();
  const birthdayDiscountAmt = isBirthday ? round2(Math.min(subtotal, (subtotal * birthdayDiscountPct) / 100)) : 0;

  const loyaltyAvailable = loyaltyRedeemPoints > 0 && loyaltyPoints >= loyaltyRedeemPoints;
  const loyaltyCandidateAmt = useLoyalty && loyaltyAvailable ? round2(Math.min(subtotal, loyaltyRedeemDiscount)) : 0;

  const bestDiscount = [
    { type: 'coupon', amount: couponDiscountAmt },
    { type: 'birthday', amount: birthdayDiscountAmt },
    { type: 'loyalty', amount: loyaltyCandidateAmt },
  ].reduce((a, b) => (b.amount > a.amount ? b : a));

  const discount = bestDiscount.amount > 0 && bestDiscount.type !== 'loyalty' ? bestDiscount.amount : 0;
  const loyaltyDiscount = bestDiscount.amount > 0 && bestDiscount.type === 'loyalty' ? bestDiscount.amount : 0;
  const discountIsBirthday = bestDiscount.type === 'birthday' && discount > 0;
  const loyaltyOutranked = useLoyalty && loyaltyAvailable && loyaltyDiscount === 0 && discount > 0;
  const couponOutranked = couponDiscountAmt > 0 && bestDiscount.type !== 'coupon';

  const isAutomatedRewardActive = Boolean(autoRewardCode && couponData);

  const hasFreeShippingReward = spinReward?.prize_type === 'free_shipping' || scratchReward?.prize_type === 'free_shipping';
  const afterDiscounts = round2(Math.max(0, subtotal - discount - loyaltyDiscount));
  const shipping = (deliveryCharge === 0 || afterDiscounts >= freeDeliveryThreshold || hasFreeShippingReward) ? 0 : deliveryCharge;
  const finalTotal = round2(afterDiscounts + shipping);

  const walletBelowMin = finalTotal < walletSettings.min_order_amount;
  const walletAmount = (() => {
    if (!useWallet || !walletSettings.enabled || walletBelowMin) return 0;
    let maxAllowed = (finalTotal * walletSettings.max_usage_percent) / 100;
    if (walletSettings.max_discount_cap > 0) maxAllowed = Math.min(maxAllowed, walletSettings.max_discount_cap);
    return round2(Math.max(0, Math.min(walletBalance, finalTotal, maxAllowed)));
  })();
  const payableTotal = round2(Math.max(0, finalTotal - walletAmount));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Checkout" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => setShowAddAddress(true)}>
              <Text style={styles.addLink}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          {!!deliveryEstimateText && (
            <View style={styles.deliveryEstimateBadge}>
              <Text style={styles.deliveryEstimateText}>🚚 Delivery in {deliveryEstimateText}</Text>
            </View>
          )}

          {addresses.length === 0 ? (
            <TouchableOpacity style={styles.addAddressCard} onPress={() => setShowAddAddress(true)}>
              <Text style={styles.addAddressIcon}>📍</Text>
              <Text style={styles.addAddressText}>Add a delivery address</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addressCard, selectedAddress?.id === addr.id && styles.addressCardSelected]}
                onPress={() => setSelectedAddress(addr)}
              >
                <View style={styles.addressRadio}>
                  <View style={[styles.radioOuter, selectedAddress?.id === addr.id && styles.radioOuterSelected]}>
                    {selectedAddress?.id === addr.id && <View style={styles.radioInner} />}
                  </View>
                </View>
                <View style={styles.addressDetails}>
                  <Text style={styles.addressName}>{addr.name}</Text>
                  <Text style={styles.addressText}>{addr.address_line1}</Text>
                  {addr.address_line2 ? <Text style={styles.addressText}>{addr.address_line2}</Text> : null}
                  <Text style={styles.addressText}>{addr.city}, {addr.state} - {addr.pincode}</Text>
                  <Text style={styles.addressPhone}>{addr.phone}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Spin Wheel Gift Banner */}
        {spinReward && (
          <View style={styles.spinGiftBanner}>
            <Text style={styles.spinGiftBannerTitle}>
              {spinReward.prize_type === 'free_shipping'
                ? '🎁 Lucky Spin Wheel Gift: Free Delivery Auto-Applied!'
                : `🎁 Lucky Spin Wheel Gift: Coupon "${spinReward.coupon_code}" Auto-Applied!`}
            </Text>
            <Text style={styles.spinGiftBannerSub}>
              {spinReward.prize_type === 'free_shipping'
                ? 'Your delivery fee has been waived for this order!'
                : `Enjoy your spin wheel discount on this order.`}
            </Text>
          </View>
        )}

        {/* Scratch Card Gift Banner */}
        {scratchReward && (
          <View style={styles.spinGiftBanner}>
            <Text style={styles.spinGiftBannerTitle}>
              {scratchReward.prize_type === 'free_shipping'
                ? '🎁 Scratch Card Gift: Free Delivery Auto-Applied!'
                : `🎁 Scratch Card Gift: "${scratchReward.prize_label || scratchReward.coupon_code}" Auto-Applied!`}
            </Text>
            <Text style={styles.spinGiftBannerSub}>
              {scratchReward.prize_type === 'free_shipping'
                ? 'Your delivery fee has been waived for this order!'
                : `Enjoy your scratch card reward discount on this order.`}
            </Text>
          </View>
        )}

        {/* Coupon — Golden Ticket (Hidden when any automated reward is active so only 1 discount applies) */}
        {couponFieldEnabled && !isAutomatedRewardActive && (
          <View style={styles.couponCard}>
          {/* Ticket notches */}
          <View style={styles.couponNotchLeft} />
          <View style={styles.couponNotchRight} />

          <View style={styles.couponInner}>
            <View style={styles.couponTitleRow}>
              <Text style={styles.couponIcon}>🎫</Text>
              <Text style={styles.couponTitle}>Coupon Code</Text>
            </View>

            {couponData ? (
              <View style={styles.couponApplied}>
                <View style={styles.couponAppliedLeft}>
                  <Text style={styles.couponAppliedCode}>"{couponCode}"</Text>
                  <Text style={styles.couponAppliedSaving}>
                    {couponOutranked
                      ? 'A bigger discount is already applied to this order'
                      : `You save ${formatPrice(couponDiscountAmt)}! 🎉`}
                  </Text>
                </View>
                <TouchableOpacity onPress={removeCoupon} style={styles.couponRemoveBtn}>
                  <Text style={styles.couponRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.couponRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter coupon code"
                    placeholderTextColor="rgba(255,215,0,0.45)"
                    value={couponCode}
                    onChangeText={setCouponCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[styles.couponButton, couponLoading && styles.buttonDisabled]}
                    onPress={handleApplyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? (
                      <ActivityIndicator size="small" color="#7a4f00" />
                    ) : (
                      <Text style={styles.couponButtonText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {couponError ? (
                  <Text style={styles.couponError}>⚠️ {couponError}</Text>
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

        {/* Birthday banner */}
        {isBirthday && (
            <View style={styles.birthdayBanner}>
              <Text style={styles.birthdayBannerEmoji}>🎂</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.birthdayBannerTitle}>Happy Birthday! 🎉</Text>
                <Text style={styles.birthdayBannerText}>
                  {discountIsBirthday
                    ? `Your special ${birthdayDiscountPct}% birthday discount is automatically applied to this order!`
                    : `Your ${birthdayDiscountPct}% birthday discount applies when it is your best available offer.`}
                </Text>
              </View>
            </View>
          )}

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {ALL_PAYMENT_METHODS.map((method) => {
            const isCodDisabled = method.value === 'COD' && !codEnabled;
            const isSelected = paymentMethod === method.value;
            return (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.paymentOption,
                  isSelected && !isCodDisabled && styles.paymentOptionActive,
                  isCodDisabled && styles.paymentOptionDisabled,
                ]}
                onPress={() => !isCodDisabled && setPaymentMethod(method.value)}
                activeOpacity={isCodDisabled ? 1 : 0.7}
              >
                <View style={[styles.radioOuter, isSelected && !isCodDisabled && styles.radioOuterSelected]}>
                  {isSelected && !isCodDisabled && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.paymentLabel,
                  isSelected && !isCodDisabled && styles.paymentLabelActive,
                  isCodDisabled && styles.paymentLabelDisabled,
                ]}>
                  {method.label}
                </Text>
                {isCodDisabled && (
                  <View style={styles.notAvailBadge}>
                    <Text style={styles.notAvailBadgeText}>Not Available</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary ({items.length} items)</Text>
          {items.map((item, index) => (
            <View key={item.id ?? item.product_id ?? index} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>
                {lineName(item)}
              </Text>
              <Text style={styles.orderItemQty}>x{item.quantity}</Text>
              <Text style={styles.orderItemPrice}>
                {formatPrice(lineUnitPrice(item) * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {discountIsBirthday ? `🎂 Birthday Discount (${birthdayDiscountPct}%)` : 'Coupon Discount'}
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-{formatPrice(discount)}</Text>
            </View>
          )}
          {loyaltyDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>⭐ Loyalty Points ({loyaltyRedeemPoints} pts)</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-{formatPrice(loyaltyDiscount)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, shipping === 0 && { textDecorationLine: 'line-through' }]}>Shipping</Text>
            <Text style={[styles.summaryValue, shipping === 0 && { textDecorationLine: 'line-through', color: '#197f09ff' }]}>
              {shipping === 0 ? formatPrice(deliveryCharge) : formatPrice(shipping)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {shipping === 0 && (
                <Text style={{
                  color: '#888',
                  textDecorationLine: 'line-through',
                  textDecorationColor: 'red',
                  marginRight: 8,
                  fontSize: 15,
                  fontWeight: 'normal'
                }}>
                  {formatPrice(finalTotal + deliveryCharge)}
                </Text>
              )}
              <Text style={styles.totalValue}>{formatPrice(finalTotal)}</Text>
            </View>
          </View>

          {loyaltyAvailable && (
            <View style={styles.walletBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.walletLabel}>Redeem Loyalty Points</Text>
                <Text style={styles.walletBalance}>
                  {loyaltyPoints} pts available · {loyaltyRedeemPoints} pts = {formatPrice(loyaltyRedeemDiscount)} off
                </Text>
                {loyaltyOutranked && (
                  <Text style={styles.walletBalance}>
                    A bigger discount is already applied, so your points won't be used on this order.
                  </Text>
                )}
              </View>
              <Switch
                value={useLoyalty}
                onValueChange={setUseLoyalty}
                trackColor={{ false: '#ccc', true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          )}

          {walletSettings.enabled && walletBalance > 0 && (
            <View style={styles.walletBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.walletLabel}>Pay with Wallet</Text>
                <Text style={styles.walletBalance}>Balance: {formatPrice(walletBalance)}</Text>
                {useWallet && walletBelowMin && (
                  <Text style={styles.walletBalance}>
                    Wallet can be used on orders of {formatPrice(walletSettings.min_order_amount)} or more.
                  </Text>
                )}
              </View>
              <Switch
                value={useWallet}
                onValueChange={setUseWallet}
                trackColor={{ false: '#ccc', true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          )}
          {walletAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountValue]}>Paid from Wallet</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-{formatPrice(walletAmount)}</Text>
            </View>
          )}
          {walletAmount > 0 && (
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Amount Payable</Text>
              <Text style={styles.totalValue}>{formatPrice(payableTotal)}</Text>
            </View>
          )}
        </View>

        {/* Place Order button */}
        <TouchableOpacity
          style={[styles.placeOrderButton, placing && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.placeOrderText}>Place Order • {formatPrice(payableTotal)}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ✅ Place Order Confirmation Modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.confirmBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowConfirm(false)} />

          <View style={styles.confirmSheet}>
            <View style={styles.confirmHandle} />
            <Text style={styles.confirmTitle}>Confirm Order</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.confirmScroll}>

              {/* Products — full detail with image */}
              <Text style={styles.confirmSectionLabel}>🛍  Items</Text>
              <View style={styles.confirmItemsBox}>
                {items.map((item, i) => {
                  const imgSrc = lineImage(item);
                  const uri = imgSrc
                    ? (imgSrc.startsWith('http') ? imgSrc : UPLOADS_URL + (imgSrc.startsWith('/') ? imgSrc : '/' + imgSrc))
                    : null;
                  return (
                    <View key={i} style={[styles.confirmProductRow, i < items.length - 1 && styles.confirmProductDivider]}>
                      <View style={styles.confirmProductImg}>
                        {uri
                          ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          : <Text style={{ fontSize: 22 }}>👗</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmProductName} numberOfLines={2}>
                          {lineName(item)}
                        </Text>
                        {(item.size || item.color) && (
                          <Text style={styles.confirmProductMeta}>
                            {[item.size, item.color].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={styles.confirmProductQty}>Qty: {item.quantity || 1}</Text>
                          <Text style={styles.confirmProductPrice}>
                            {formatPrice(lineUnitPrice(item) * (item.quantity || 1))}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Full Address */}
              {selectedAddress && (
                <>
                  <Text style={styles.confirmSectionLabel}>📍  Delivery Address</Text>
                  <View style={styles.confirmAddressBox}>
                    <Text style={styles.confirmAddrName}>{selectedAddress.name}  ·  {selectedAddress.phone}</Text>
                    <Text style={styles.confirmAddrLine}>{selectedAddress.address_line1}</Text>
                    {selectedAddress.address_line2 ? <Text style={styles.confirmAddrLine}>{selectedAddress.address_line2}</Text> : null}
                    <Text style={styles.confirmAddrLine}>
                      {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}
                    </Text>
                  </View>
                </>
              )}

              {/* Payment & Price summary */}
              <Text style={styles.confirmSectionLabel}>💳  Payment & Summary</Text>
              <View style={styles.confirmSummaryBox}>
                <View style={styles.confirmSummaryRow}>
                  <Text style={styles.confirmSummaryLabel}>Payment</Text>
                  <Text style={styles.confirmSummaryValue}>{paymentMethod}</Text>
                </View>
                <View style={styles.confirmSummaryRow}>
                  <Text style={styles.confirmSummaryLabel}>Subtotal</Text>
                  <Text style={styles.confirmSummaryValue}>{formatPrice(total)}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.confirmSummaryRow}>
                    <Text style={styles.confirmSummaryLabel}>{discountIsBirthday ? 'Birthday Discount' : 'Discount'}</Text>
                    <Text style={[styles.confirmSummaryValue, { color: '#4ade80' }]}>− {formatPrice(discount)}</Text>
                  </View>
                )}
                {loyaltyDiscount > 0 && (
                  <View style={styles.confirmSummaryRow}>
                    <Text style={styles.confirmSummaryLabel}>Loyalty Points</Text>
                    <Text style={[styles.confirmSummaryValue, { color: '#4ade80' }]}>− {formatPrice(loyaltyDiscount)}</Text>
                  </View>
                )}
                <View style={styles.confirmSummaryRow}>
                  <Text style={[styles.confirmSummaryLabel, shipping === 0 && { textDecorationLine: 'line-through' }]}>Shipping</Text>
                  <Text style={[styles.confirmSummaryValue, shipping === 0 && { textDecorationLine: 'line-through', color: '#888' }]}>
                    {shipping === 0 ? formatPrice(deliveryCharge) : formatPrice(shipping)}
                  </Text>
                </View>
                <View style={[styles.confirmSummaryRow, { borderTopWidth: 1, borderTopColor: '#fcd7eb', marginTop: 4, paddingTop: 10 }]}>
                  <Text style={styles.confirmTotalLabel}>Total</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {shipping === 0 && (
                      <Text style={{
                        color: '#888',
                        textDecorationLine: 'line-through',
                        textDecorationColor: 'red',
                        marginRight: 8,
                        fontSize: 14,
                        fontWeight: 'normal'
                      }}>
                        {formatPrice(finalTotal + deliveryCharge)}
                      </Text>
                    )}
                    <Text style={styles.confirmTotalValue}>{formatPrice(finalTotal)}</Text>
                  </View>
                </View>
                {walletAmount > 0 && (
                  <>
                    <View style={styles.confirmSummaryRow}>
                      <Text style={styles.confirmSummaryLabel}>Paid from Wallet</Text>
                      <Text style={[styles.confirmSummaryValue, { color: '#4ade80' }]}>− {formatPrice(walletAmount)}</Text>
                    </View>
                    <View style={[styles.confirmSummaryRow, { borderTopWidth: 1, borderTopColor: '#fcd7eb', marginTop: 4, paddingTop: 10 }]}>
                      <Text style={styles.confirmTotalLabel}>Amount Payable</Text>
                      <Text style={styles.confirmTotalValue}>{formatPrice(payableTotal)}</Text>
                    </View>
                  </>
                )}
              </View>

            </ScrollView>

            {/* Buttons */}
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setShowConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOkBtn} onPress={doPlaceOrder}>
                <Text style={styles.confirmOkText}>
                  {ONLINE_METHODS.includes(paymentMethod) && payableTotal > 0 ? '💳  Pay Now' : 'Confirm Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Address Modal */}
      <Modal visible={showAddAddress} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Address</Text>
            <TouchableOpacity onPress={() => setShowAddAddress(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'Recipient name' },
              { key: 'address_line1', label: 'Address Line 1 *', placeholder: 'House no, street' },
              { key: 'address_line2', label: 'Address Line 2', placeholder: 'Landmark (optional)' },
              { key: 'city', label: 'City *', placeholder: 'City' },
              { key: 'state', label: 'State *', placeholder: 'State' },
              { key: 'pincode', label: 'Pincode *', placeholder: '6-digit pincode', keyboardType: 'number-pad' },
            ].map((field) => (
              <View key={field.key}>
                <Text style={styles.modalLabel}>{field.label}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={field.placeholder}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType={field.keyboardType || 'default'}
                  value={newAddress[field.key]}
                  onChangeText={(val) => setNewAddress((prev) => ({ ...prev, [field.key]: val }))}
                />
              </View>
            ))}
            {/* Phone — special PhoneInput */}
            <PhoneInput
              label="Phone *"
              value={newAddress.phone}
              onChangeText={(val) => setNewAddress((prev) => ({ ...prev, phone: val }))}
              style={{ marginBottom: 4 }}
            />
            <TouchableOpacity style={styles.saveAddressButton} onPress={handleAddAddress}>
              <Text style={styles.saveAddressText}>Save Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Razorpay Coming Soon Modal */}
      <Modal visible={showRazorpayModal} transparent animationType="fade">
        <View style={styles.razorpayOverlay}>
          <View style={styles.razorpayModal}>
            <Text style={styles.razorpayIcon}>💳</Text>
            <Text style={styles.razorpayTitle}>Online Payment</Text>
            <Text style={styles.razorpayMessage}>
              Razorpay integration is coming soon! Please choose a different payment method.
            </Text>
            <TouchableOpacity
              style={styles.razorpayClose}
              onPress={() => {
                setShowRazorpayModal(false);
                setPaymentMethod('COD');
              }}
            >
              <Text style={styles.razorpayCloseText}>Switch to COD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
  },
  backText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  birthdayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  birthdayBannerEmoji: { fontSize: 28 },
  birthdayBannerTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 },
  birthdayBannerText: { fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 17 },
  spinGiftBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  spinGiftBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 2,
  },
  spinGiftBannerSub: {
    fontSize: 11.5,
    color: '#166534',
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  addLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  deliveryEstimateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f9ee',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
    marginTop: -4,
  },
  deliveryEstimateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  addAddressCard: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
  },
  addAddressIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  addAddressText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  addressCard: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  addressCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5FB',
  },
  addressRadio: {
    marginRight: 10,
    marginTop: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  addressDetails: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  addressPhone: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  // —— Coupon Card (warm ivory-gold) ——
  couponCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fffbf0',
    borderWidth: 1.5,
    borderColor: '#f0c040',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#d4a017',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  couponNotchLeft: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  couponNotchRight: {
    position: 'absolute',
    right: -10,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  couponInner: {
    padding: 16,
  },
  couponTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f0c040',
    borderStyle: 'dashed',
    paddingBottom: 10,
  },
  couponIcon: { fontSize: 20 },
  couponTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#a07000',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e0b030',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#7a5000',
    backgroundColor: '#fff9e6',
    letterSpacing: 1.5,
  },
  couponButton: {
    backgroundColor: '#f5a623',
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d4840a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  couponButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  couponError: {
    color: '#e05252',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#f0c040',
    borderStyle: 'dashed',
  },
  couponAppliedLeft: { flex: 1 },
  couponAppliedCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7a5000',
    letterSpacing: 1,
    marginBottom: 3,
  },
  couponAppliedSaving: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '700',
  },
  couponRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffe0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  couponRemoveText: {
    color: '#e05252',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 10,
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5FB',
  },
  paymentLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  paymentLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  paymentOptionDisabled: {
    opacity: 0.45,
    backgroundColor: '#f3f3f3',
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  paymentLabelDisabled: {
    color: '#aaa',
  },
  notAvailBadge: {
    marginLeft: 'auto',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notAvailBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderItemName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  orderItemQty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  discountValue: {
    color: COLORS.success,
  },
  freeText: {
    color: COLORS.success,
  },
  walletBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1018',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3d1226',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  walletBalance: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  placeOrderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  placeOrderText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 32,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  saveAddressButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveAddressText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  razorpayOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  razorpayModal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  razorpayIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  razorpayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  razorpayMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  razorpayClose: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  razorpayCloseText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  /* ── Place Order Confirmation Modal ── */
  confirmBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  confirmSheet: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    paddingBottom: 20,
    width: '100%',
    maxHeight: '88%',
    shadowColor: '#e91e8c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  confirmHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#f9c0df',
    alignSelf: 'center', marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18, fontWeight: '800', color: '#e91e8c',
    textAlign: 'center', marginBottom: 14,
  },
  confirmScroll: { flexGrow: 0, maxHeight: 420 },
  confirmSectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#e91e8c',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginTop: 4,
  },
  confirmItemsBox: {
    backgroundColor: '#fff5fa', borderRadius: 14,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#fcd7eb',
  },
  confirmProductRow: {
    flexDirection: 'row', gap: 12, paddingVertical: 8,
  },
  confirmProductDivider: {
    borderBottomWidth: 1, borderBottomColor: '#fce4f0',
  },
  confirmProductImg: {
    width: 72, height: 88, borderRadius: 12,
    backgroundColor: '#fce4f0', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmProductName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', lineHeight: 18 },
  confirmProductMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  confirmProductQty: { fontSize: 11, color: '#999' },
  confirmProductPrice: { fontSize: 13, fontWeight: '700', color: '#e91e8c' },
  confirmAddressBox: {
    backgroundColor: '#fff5fa', borderRadius: 14,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#fcd7eb',
  },
  confirmAddrName: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 4 },
  confirmAddrLine: { fontSize: 12, color: '#555', lineHeight: 18 },
  confirmSummaryBox: {
    backgroundColor: '#fff5fa', borderRadius: 14,
    padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#fcd7eb',
  },
  confirmSummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5,
  },
  confirmSummaryLabel: { fontSize: 12, color: '#999' },
  confirmSummaryValue: { fontSize: 12, color: '#333', fontWeight: '600' },
  confirmTotalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  confirmTotalValue: { fontSize: 17, fontWeight: '800', color: '#e91e8c' },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#fcd7eb', alignItems: 'center',
    backgroundColor: '#fff',
  },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#ccc' },
  confirmOkBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F86809', alignItems: 'center',
    shadowColor: '#F86809',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmOkText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  firstOrderBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  firstOrderBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  firstOrderBannerIcon: {
    fontSize: 18,
  },
  firstOrderBannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 1,
  },
  firstOrderBannerSub: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '600',
    lineHeight: 18,
  },
  firstOrderBannerHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
});
