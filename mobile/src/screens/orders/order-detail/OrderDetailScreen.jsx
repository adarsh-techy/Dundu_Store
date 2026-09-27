import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { orderApi, settingsApi } from '../../../api/index';
import AppHeader from '../../../components/ui/AppHeader';
import useAuthStore from '../../../store/auth.store';
import { COLORS, UPLOADS_URL } from '../../../config';
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '../../../utils/format';

function getImageUri(imageStr) {
  if (!imageStr) return null;
  if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) return imageStr;
  return UPLOADS_URL + (imageStr.startsWith('/') ? imageStr : '/' + imageStr);
}

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDetail, setReturnDetail] = useState('');
  const [returnAgreed, setReturnAgreed] = useState(false);
  const [showReturnSuccess, setShowReturnSuccess] = useState(false);
  const [deliveryEstimateText, setDeliveryEstimateText] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const authUser = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchOrder();
    settingsApi.getPayment()
      .then((res) => {
        const d = res?.data || res;
        if (d?.delivery_estimate_text) setDeliveryEstimateText(d.delivery_estimate_text);
      })
      .catch(() => {});
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    try {
      const res = await orderApi.getOne(orderId);
      setOrder(res.order || res);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load order details.');
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Orders');
    } finally {
      setLoading(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: handleCancel,
        },
      ]
    );
  }

  async function handleCancel() {
    setCancelLoading(true);
    try {
      await orderApi.cancel(orderId);
      await fetchOrder();
      Alert.alert('Order Cancelled', 'Your order has been cancelled.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to cancel order.');
    } finally {
      setCancelLoading(false);
    }
  }

  async function handlePayNow() {
    setPayLoading(true);
    try {
      const res = await orderApi.retryPayment(orderId);
      const payOrder = res?.order || order;
      const razorpayOrder = res?.razorpay;
      if (!razorpayOrder?.id) throw new Error('Could not start the payment. Please try again.');
      navigation.navigate('Payment', { order: payOrder, razorpayOrder, user: authUser });
    } catch (err) {
      Alert.alert('Payment', err?.message || 'Could not start the payment. Please try again.');
      fetchOrder();
    } finally {
      setPayLoading(false);
    }
  }

  async function handleReturn() {
    const finalReason = 'Damaged Product';
    setReturnLoading(true);
    try {
      await orderApi.returnRequest(orderId, finalReason);
      setShowReturnModal(false);
      setReturnReason('');
      setReturnDetail('');
      setReturnAgreed(false);
      await fetchOrder();
      setShowReturnSuccess(true);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit return request.');
    } finally {
      setReturnLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const statusColor = getStatusColor(order.status);
  const statusLabel = getStatusLabel(order.status);
  // Server rule: customers may cancel while the order is pending or packed.
  const canCancel = ['pending', 'packed'].includes(order.status);
  const canReturn = order.status === 'delivered';
  const canPay = order.payment_status === 'pending' &&
    ['online', 'upi', 'card'].includes(String(order.payment_method || '').toLowerCase()) &&
    order.status !== 'cancelled';
  // GET /orders/:id flattens the address columns onto the order row.
  const address = order.address || order.shipping_address || (order.address_line1 ? {
    name: order.name,
    phone: order.phone,
    address_line1: order.address_line1,
    address_line2: order.address_line2,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
  } : null);
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const orderSubtotal = num(order.subtotal);
  const orderDiscount = num(order.discount);
  const orderLoyaltyDiscount = num(order.loyalty_discount);
  const orderShipping = num(order.delivery_charge);
  const orderTotal = num(order.total);
  const orderWallet = num(order.wallet_amount);
  const discountLabel = {
    coupon: 'Coupon Discount',
    birthday: 'Birthday Discount',
    referral: 'Referral Discount',
  }[order.discount_type] || 'Discount';

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader logo />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Order Header */}
        <View style={styles.section}>
          <View style={styles.orderHeaderRow}>
            <View>
              <Text style={styles.orderNumber}>#{order.order_number || order.id}</Text>
              <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          {!!deliveryEstimateText && ['pending', 'packed', 'shipped'].includes(order.status) && (
            <View style={styles.deliveryEstimateBadge}>
              <Text style={styles.deliveryEstimateText}>🚚 Estimated delivery in {deliveryEstimateText}</Text>
            </View>
          )}
        </View>

        {/* Order Status Line */}
        <OrderStatusLine status={order.status} />

        {/* Tracking Info */}
        {(order.status === 'shipped' || order.status === 'delivered') && order.courier_tracking_number ? (
          <View style={styles.trackingSection}>
            <View style={styles.trackingHeader}>
              <Text style={styles.trackingHeaderIcon}>🚚</Text>
              <Text style={styles.trackingHeaderText}>Tracking Info</Text>
            </View>
            {order.courier_name ? (
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Courier</Text>
                <Text style={styles.trackingValue}>{order.courier_name}</Text>
              </View>
            ) : null}
            <View style={styles.trackingRow}>
              <Text style={styles.trackingLabel}>Tracking No.</Text>
              <View style={styles.trackingIdRow}>
                <Text style={styles.trackingId}>{order.courier_tracking_number}</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => {
                    Clipboard.setString(order.courier_tracking_number);
                    Alert.alert('Copied!', 'Tracking ID copied to clipboard.');
                  }}
                >
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
            {order.courier_phone ? (
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Helpline</Text>
                <Text style={styles.trackingValue}>{order.courier_phone}</Text>
              </View>
            ) : null}
            <Text style={styles.trackingHint}>Use this ID on the courier's website or app to track your shipment.</Text>
          </View>
        ) : null}

        {/* Delivery OTP — Dundu Delivery agent has picked up the order and is en route */}
        {order.delivery_otp ? (
          <View style={styles.otpSection}>
            <Text style={styles.otpTitle}>🔐 Delivery OTP</Text>
            <Text style={styles.otpCode}>{order.delivery_otp}</Text>
            <Text style={styles.otpHint}>Share this code with the Dundu Delivery agent only when your order arrives at your doorstep.</Text>
          </View>
        ) : null}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {(order.items || []).map((item, index) => {
            const uri = getImageUri(item.image || item.product_image);
            const itemPrice = parseFloat(item.unit_price ?? item.price ?? item.offer_price ?? 0) || 0;
            return (
              <View key={item.id || index} style={styles.orderItem}>
                {uri ? (
                  <Image source={{ uri }} style={styles.itemImage} resizeMode="cover" />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Text style={styles.itemImagePlaceholderText}>👗</Text>
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product_name || item.name}
                  </Text>
                  {item.size && <Text style={styles.itemMeta}>Size: {item.size}</Text>}
                  {item.color && <Text style={styles.itemMeta}>Color: {item.color}</Text>}
                  <View style={styles.itemPriceRow}>
                    <Text style={styles.itemQty}>x{item.quantity}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(itemPrice * item.quantity)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Shipping Address */}
        {address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Text style={styles.addressName}>{address.name}</Text>
            <Text style={styles.addressText}>{address.address_line1}</Text>
            {address.address_line2 ? <Text style={styles.addressText}>{address.address_line2}</Text> : null}
            <Text style={styles.addressText}>
              {address.city}, {address.state} - {address.pincode}
            </Text>
            <Text style={styles.addressPhone}>{address.phone}</Text>
          </View>
        )}

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>{formatPrice(orderSubtotal)}</Text>
          </View>
          {orderDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{discountLabel}</Text>
              <Text style={[styles.priceValue, styles.discountValue]}>-{formatPrice(orderDiscount)}</Text>
            </View>
          )}
          {orderLoyaltyDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Loyalty Points Discount</Text>
              <Text style={[styles.priceValue, styles.discountValue]}>-{formatPrice(orderLoyaltyDiscount)}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping</Text>
            <Text style={[styles.priceValue, orderShipping === 0 && styles.freeText]}>
              {orderShipping === 0 ? 'FREE' : formatPrice(orderShipping)}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.totalPriceRow]}>
            <Text style={styles.totalPriceLabel}>Total</Text>
            <Text style={styles.totalPriceValue}>{formatPrice(orderTotal)}</Text>
          </View>
          {orderWallet > 0 && (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Paid from Wallet</Text>
                <Text style={[styles.priceValue, styles.discountValue]}>-{formatPrice(orderWallet)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Payable (COD / online)</Text>
                <Text style={styles.priceValue}>{formatPrice(Math.max(0, orderTotal - orderWallet))}</Text>
              </View>
            </>
          )}
          {order.payment_status && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Payment Status</Text>
              <Text style={styles.priceValue}>{String(order.payment_status).toUpperCase()}</Text>
            </View>
          )}
          {order.payment_method && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Payment</Text>
              <Text style={styles.priceValue}>{order.payment_method}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {(canPay || canCancel || canReturn) && (
          <View style={styles.actionsSection}>
            {canPay && (
              <TouchableOpacity
                style={[styles.actionButton, styles.returnButton, payLoading && styles.buttonDisabled]}
                onPress={handlePayNow}
                disabled={payLoading}
              >
                {payLoading ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Text style={styles.returnButtonText}>
                    Pay Now • {formatPrice(Math.max(0, orderTotal - orderWallet))}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton, cancelLoading && styles.buttonDisabled]}
                onPress={confirmCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator color={COLORS.error} size="small" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel Order</Text>
                )}
              </TouchableOpacity>
            )}
            {canReturn && (
              <TouchableOpacity
                style={[styles.actionButton, styles.returnButton]}
                onPress={() => setShowReturnModal(true)}
              >
                <Text style={styles.returnButtonText}>Request Return</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Return Modal */}
      <Modal visible={showReturnModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Return</Text>
            <TouchableOpacity onPress={() => { setShowReturnModal(false); setReturnReason(''); setReturnDetail(''); setReturnAgreed(false); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Return Policy Notice */}
            <View style={styles.returnPolicyCard}>
              <View style={styles.returnPolicyHeader}>
                <Text style={styles.returnPolicyIcon}>📋</Text>
                <Text style={styles.returnPolicyTitle}>Return Policy</Text>
              </View>
              <View style={styles.returnPolicyDeductRow}>
                <Text style={styles.returnPolicyDeductIcon}>💸</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.returnPolicyDeductText}>₹99 courier charge will be deducted</Text>
                  <Text style={styles.returnPolicyDeductSub}>This covers the reverse pickup & courier service fee.</Text>
                </View>
              </View>
              <View style={styles.returnPolicyRules}>
                {[
                  {
                    en: 'Items must be unused, unwashed & in original condition',
                    ml: 'ഉൽപ്പന്നം ഉപയോഗിക്കാത്തതും കഴുകാത്തതും യഥാർത്ഥ അവസ്ഥയിലുമായിരിക്കണം',
                  },
                  {
                    en: 'All original tags and packaging must be intact',
                    ml: 'എല്ലാ ഒറിജിനൽ ടാഗുകളും പാക്കേജിംഗും കേടുകൂടാതെ ഇരിക്കണം',
                  },
                  {
                    en: 'Continuous, uncut unboxing video starting from package opening is mandatory',
                    ml: 'പാക്കറ്റ് തുറക്കുന്നത് മുതലുള്ള തുടർച്ചയായ (കട്ട് ചെയ്യാത്ത) അൺബോക്സിങ് വീഡിയോ നിർബന്ധമാണ്',
                  },
                  {
                    en: 'Returns accepted within 48 hours of delivery',
                    ml: 'ഡെലിവറിക്ക് ശേഷം 48 മണിക്കൂറിനുള്ളിൽ മാത്രം റിട്ടേൺ സ്വീകരിക്കും',
                  },
                  {
                    en: 'Items on sale or marked final sale are not eligible',
                    ml: 'സെയിലിലുള്ള അല്ലെങ്കിൽ ফൈനൽ സെയിൽ ഉൽപ്പന്നങ്ങൾ റിട്ടേണിന് യോഗ്യമല്ല',
                  },
                  {
                    en: 'Refund will be processed within 5–7 business days after pickup',
                    ml: 'പിക്കപ്പിന് ശേഷം 5–7 ബിസിനസ് ദിവസങ്ങൾക്കുള്ളിൽ റീഫണ്ട് നൽകും',
                  },
                ].map((rule, i) => (
                  <View key={i} style={styles.returnPolicyRuleRow}>
                    <Text style={styles.returnPolicyBullet}>•</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.returnPolicyRuleText}>{rule.en}</Text>
                      <Text style={styles.returnPolicyRuleTextMl}>{rule.ml}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>


            {/* Refund calculation */}
            <View style={styles.refundCalcCard}>
              <Text style={styles.refundCalcTitle}>💰 Refund Estimate</Text>
              <View style={styles.refundCalcRow}>
                <Text style={styles.refundCalcLabel}>Order Amount</Text>
                <Text style={styles.refundCalcValue}>₹{orderTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.refundCalcRow}>
                <Text style={styles.refundCalcLabel}>Courier Deduction</Text>
                <Text style={styles.refundCalcDeduct}>− ₹99.00</Text>
              </View>
              <View style={styles.refundCalcDivider} />
              <View style={styles.refundCalcRow}>
                <Text style={styles.refundCalcTotalLabel}>Refund Amount</Text>
                <Text style={styles.refundCalcTotal}>
                  ₹{Math.max(0, orderTotal - 99).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Process notice */}
            <View style={styles.refundNoticeCard}>
              <Text style={styles.refundNoticeText}>
                📞 Our team will contact you to verify your return request. We will compare the product image taken before shipping with the image and continuous unboxing video you provide. After verification, if approved, the refund will be processed to your original payment method.
              </Text>
              <Text style={styles.refundNoticeTextMl}>
                📞 ഞങ്ങളുടെ ടീം നിങ്ങളെ ബന്ധപ്പെടും. ഷിപ്പിംഗിന് മുമ്പ് എടുത്ത ഉൽപ്പന്ന ചിത്രവും നിങ്ങൾ നൽകുന്ന ചിത്രവും തുടർച്ചയായ അൺബോക്സിങ് വീഡിയോയും താരതമ്യം ചെയ്യും. സ്ഥിരീകരണത്തിന് ശേഷം അംഗീകരിക്കപ്പെട്ടാൽ, തുക നിങ്ങളുടെ ഒറിജിനൽ പേയ്‌മെന്റ് മാർഗ്ഗത്തിലേക്ക് തിരിച്ചടക്കും.
              </Text>
            </View>

            {/* Agreement checkbox */}
            <TouchableOpacity
              style={styles.refundAgreeRow}
              onPress={() => setReturnAgreed((p) => !p)}
              activeOpacity={0.75}
            >
              <View style={[styles.refundCheckbox, returnAgreed && styles.refundCheckboxChecked]}>
                {returnAgreed && <Text style={styles.refundCheckmark}>✓</Text>}
              </View>
              <Text style={styles.refundAgreeText}>
                I understand the return process and agree to share product images and the continuous unboxing video with the Dundu team for verification.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitReturnButton, (!returnLoading && !returnAgreed) && styles.buttonDisabled]}
              onPress={handleReturn}
              disabled={returnLoading || !returnAgreed}
            >
              {returnLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitReturnText}>Submit Return Request</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Return Success Popup */}
      <Modal visible={showReturnSuccess} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Return Request Submitted!</Text>
            <Text style={styles.successTitleMl}>റിട്ടേൺ അഭ്യർത്ഥന സമർപ്പിച്ചു!</Text>

            <View style={styles.successDivider} />

            <View style={styles.successStepList}>
              {[
                { icon: '📞', en: 'Our team will contact you shortly', ml: 'ഞങ്ങളുടെ ടീം ഉടൻ നിങ്ങളെ ബന്ധപ്പെടും' },
                { icon: '🔍', en: 'We will verify your return reason, images & unboxing video', ml: 'കാരണം, ചിത്രങ്ങൾ, അൺബോക്സിങ് വീഡിയോ എന്നിവ പരിശോധിക്കും' },
                { icon: '📸', en: 'Pre-shipment photos will be compared', ml: 'ഷിപ്പിംഗ് മുൻ ചിത്രങ്ങൾ താരതമ്യം ചെയ്യും' },
                { icon: '💰', en: 'Refund processed after approval', ml: 'അംഗീകാരത്തിന് ശേഷം റീഫണ്ട് ലഭിക്കും' },
              ].map((step, i) => (
                <View key={i} style={styles.successStep}>
                  <Text style={styles.successStepIcon}>{step.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.successStepText}>{step.en}</Text>
                    <Text style={styles.successStepTextMl}>{step.ml}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setShowReturnSuccess(false)}
            >
              <Text style={styles.successBtnText}>Got it, Thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Order Status Line ────────────────────────────────────────────────────────

const STEPS = [
  { key: 'pending',   label: 'Ordered',   icon: '🛍' },
  { key: 'packed',    label: 'Packed',    icon: '📦' },
  { key: 'shipped',   label: 'Shipped',   icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

const STEP_INDEX = { pending: 0, packed: 1, shipped: 2, delivered: 3 };

function OrderStatusLine({ status }) {
  const s = (status || '').toLowerCase();

  if (s === 'cancelled') {
    return (
      <View style={sl.cancelCard}>
        <Text style={sl.cancelIcon}>✕</Text>
        <View>
          <Text style={sl.cancelTitle}>Order Cancelled</Text>
          <Text style={sl.cancelSub}>This order has been cancelled.</Text>
        </View>
      </View>
    );
  }

  const isReturnState = s === 'return_requested' || s === 'returned';
  const activeIdx = isReturnState ? 3 : (STEP_INDEX[s] ?? 0);

  return (
    <View style={sl.card}>
      <View style={sl.stepsRow}>
        {STEPS.map((step, i) => {
          const done    = i < activeIdx;
          const active  = i === activeIdx && !isReturnState;
          const future  = i > activeIdx;
          return (
            <React.Fragment key={step.key}>
              <View style={sl.stepCol}>
                {/* Circle */}
                <View style={[
                  sl.circle,
                  done   && sl.circleDone,
                  active && sl.circleActive,
                  future && sl.circleFuture,
                  isReturnState && sl.circleDone,
                ]}>
                  {(done || isReturnState) ? (
                    <Text style={sl.checkText}>✓</Text>
                  ) : active ? (
                    <View style={sl.activeDot} />
                  ) : (
                    <View style={sl.futureDot} />
                  )}
                </View>
                {/* Icon */}
                <Text style={[sl.stepIcon, future && !isReturnState && sl.stepIconFuture]}>
                  {step.icon}
                </Text>
                {/* Label */}
                <Text style={[
                  sl.stepLabel,
                  (done || isReturnState) && sl.stepLabelDone,
                  active && sl.stepLabelActive,
                  future && !isReturnState && sl.stepLabelFuture,
                ]}>
                  {step.label}
                </Text>
              </View>

              {/* Connector line — not after last step */}
              {i < STEPS.length - 1 && (
                <View style={[
                  sl.line,
                  (i < activeIdx || isReturnState) && sl.lineDone,
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Return state banner */}
      {isReturnState && (
        <View style={[sl.returnBanner, s === 'returned' && sl.returnBannerApproved]}>
          <Text style={sl.returnBannerText}>
            {s === 'return_requested' ? '↩  Return Requested — Under Review' : '↩  Return Approved'}
          </Text>
        </View>
      )}
    </View>
  );
}

const sl = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepCol: {
    alignItems: 'center',
    width: 64,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  circleDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  circleActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderWidth: 2.5,
  },
  circleFuture: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  checkText: { fontSize: 13, color: COLORS.white, fontWeight: '800' },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  futureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepIcon: { fontSize: 16, marginBottom: 4 },
  stepIconFuture: { opacity: 0.35 },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  stepLabelDone:   { color: COLORS.success },
  stepLabelActive: { color: COLORS.primary, fontWeight: '700' },
  stepLabelFuture: { color: COLORS.textSecondary },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginTop: 13,
    marginHorizontal: -4,
  },
  lineDone: { backgroundColor: COLORS.success },

  // Cancelled card
  cancelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelIcon: {
    fontSize: 20,
    color: COLORS.error,
    fontWeight: '800',
    width: 32,
    textAlign: 'center',
  },
  cancelTitle: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  cancelSub:   { fontSize: 12, color: '#EF4444', marginTop: 2 },

  // Return banner
  returnBanner: {
    marginTop: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },
  returnBannerApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  returnBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
});

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deliveryEstimateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f9ee',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  deliveryEstimateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  itemImage: {
    width: 70,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  itemImagePlaceholder: {
    width: 70,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImagePlaceholderText: {
    fontSize: 22,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
    lineHeight: 18,
  },
  itemMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemQty: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  priceValue: {
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
  totalPriceRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 6,
    paddingTop: 8,
  },
  totalPriceLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalPriceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  trackingSection: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  trackingHeaderIcon: { fontSize: 16 },
  trackingHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  trackingLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  trackingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e0e0ff',
  },
  trackingIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818cf8',
    fontFamily: 'monospace',
  },
  copyBtn: {
    backgroundColor: 'rgba(129,140,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#818cf8',
  },
  trackingHint: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 8,
  },
  otpSection: {
    backgroundColor: '#FDF2F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    alignItems: 'center',
  },
  otpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 8,
  },
  otpCode: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    color: COLORS.primary,
    marginBottom: 8,
  },
  otpHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButton: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '700',
  },
  returnButton: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5FB',
  },
  returnButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
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
    paddingBottom: 40,
  },

  /* Return policy card */
  returnPolicyCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    padding: 14,
    marginBottom: 18,
  },
  returnPolicyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  returnPolicyIcon: { fontSize: 16 },
  returnPolicyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.3,
  },
  returnPolicyDeductRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 10,
    marginBottom: 12,
  },
  returnPolicyDeductIcon: { fontSize: 18, marginTop: 1 },
  returnPolicyDeductText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
    marginBottom: 2,
  },
  returnPolicyDeductSub: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 15,
    opacity: 0.8,
  },
  returnPolicyRules: { gap: 6 },
  returnPolicyRuleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  returnPolicyBullet: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 1,
    fontWeight: '700',
  },
  returnPolicyRuleText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 17,
  },
  returnPolicyRuleTextMl: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 17,
    opacity: 0.8,
    marginTop: 1,
  },

  /* Return reason chips */
  returnChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  returnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#f9f9f9',
  },
  returnChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff0f6',
  },
  returnChipIcon: { fontSize: 14 },
  returnChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  returnChipTextSelected: {
    color: COLORS.primary,
  },

  /* Refund calculation card */
  refundCalcCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    padding: 14,
    marginTop: 16,
    marginBottom: 10,
  },
  refundCalcTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 10,
  },
  refundCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  refundCalcLabel: { fontSize: 13, color: '#4b5563' },
  refundCalcValue: { fontSize: 13, fontWeight: '600', color: '#111' },
  refundCalcDeduct: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  refundCalcDivider: {
    height: 1,
    backgroundColor: '#86efac',
    marginVertical: 8,
  },
  refundCalcTotalLabel: { fontSize: 14, fontWeight: '800', color: '#166534' },
  refundCalcTotal: { fontSize: 15, fontWeight: '900', color: '#16a34a' },

  /* Process notice */
  refundNoticeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    marginBottom: 14,
  },
  refundNoticeText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  refundNoticeTextMl: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 20,
    marginTop: 8,
    opacity: 0.85,
  },

  /* Agreement checkbox */
  refundAgreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  refundCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  refundCheckboxChecked: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  refundCheckmark: { fontSize: 13, color: '#fff', fontWeight: '900' },
  refundAgreeText: {
    fontSize: 12,
    color: '#555',
    flex: 1,
    lineHeight: 18,
  },

  /* Return success popup */
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  successIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#16a34a',
  },
  successIcon: { fontSize: 30, color: '#16a34a', fontWeight: '900' },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 2,
  },
  successTitleMl: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  successStepList: { width: '100%', gap: 12, marginBottom: 24 },
  successStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  successStepIcon: { fontSize: 20, marginTop: 2 },
  successStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    lineHeight: 18,
  },
  successStepTextMl: {
    fontSize: 11,
    color: '#777',
    lineHeight: 17,
    marginTop: 1,
  },
  successBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  successBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  returnReasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    minHeight: 100,
    marginBottom: 16,
  },
  submitReturnButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitReturnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
