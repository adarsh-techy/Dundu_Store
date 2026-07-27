import React, { useState, useEffect, Fragment } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { orderApi } from '../api/index';
import AppHeader from '../components/ui/AppHeader';
import { COLORS, UPLOADS_URL } from '../config';
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '../utils/format';
import useAuthStore from '../store/auth.store';
import useLoginPromptStore from '../store/loginPrompt.store';

export default function OrdersScreen() {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showPrompt = useLoginPromptStore((s) => s.show);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      showPrompt('Login to view your order history');
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }
    fetchOrders();
  }, [isAuthenticated]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await orderApi.list();
      setOrders(res.orders || res || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }

  function renderOrder({ item }) {
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);
    const items = item.items || [];
    const itemCount = items.length || item.item_count || 0;
    const previewImgs = items.slice(0, 3);
    const extraCount = itemCount - previewImgs.length;
    const isReturnCard = item.status === 'return_requested' || item.status === 'returned';

    return (
      <TouchableOpacity
        style={[styles.orderCard, isReturnCard && styles.orderCardReturn]}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        activeOpacity={0.85}
      >
        <View style={styles.orderTop}>
          <View>
            <Text style={styles.orderNumber}>#{item.order_number || item.id}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, isReturnCard
            ? { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' }
            : { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: isReturnCard ? '#fff' : statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Product image thumbnails */}
        {previewImgs.length > 0 && (
          <View style={styles.thumbRow}>
            {previewImgs.map((p, i) => {
              const raw = p.image || p.product_image || '';
              const uri = raw
                ? raw.startsWith('http') ? raw : UPLOADS_URL + (raw.startsWith('/') ? raw : '/' + raw)
                : null;
              return (
                <View key={i} style={[styles.thumbWrap, i > 0 && styles.thumbOverlap]}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbPlaceholderIcon}>👗</Text>
                    </View>
                  )}
                </View>
              );
            })}
            {extraCount > 0 && (
              <View style={[styles.thumbWrap, styles.thumbOverlap, styles.thumbExtra]}>
                <Text style={styles.thumbExtraText}>+{extraCount}</Text>
              </View>
            )}
            <Text style={styles.thumbItemLabel}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        )}

        {/* Mini status stepper */}
        <MiniStatusLine status={item.status} />

        <View style={styles.orderBottom}>
          <Text style={styles.orderTotal}>{formatPrice(item.total_amount || item.total)}</Text>
        </View>

        <View style={styles.orderArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="My Orders" showBack />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchOrders}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

// ── Mini Status Line (shown inside each order card) ──────────────────────────

const MINI_STEPS = [
  { key: 'pending',   label: 'Ordered' },
  { key: 'packed',    label: 'Packed'  },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];
const MINI_IDX = { pending: 0, packed: 1, shipped: 2, delivered: 3 };

function MiniStatusLine({ status }) {
  const s = (status || '').toLowerCase();

  if (s === 'cancelled') {
    return (
      <View style={ms.cancelRow}>
        <Text style={ms.cancelDot}>✕</Text>
        <Text style={ms.cancelText}>Order Cancelled</Text>
      </View>
    );
  }

  const isReturn = s === 'return_requested' || s === 'returned';
  const activeIdx = isReturn ? 3 : (MINI_IDX[s] ?? 0);

  return (
    <View style={ms.wrapper}>
      <View style={ms.row}>
        {MINI_STEPS.map((step, i) => {
          const done   = i < activeIdx || isReturn;
          const active = i === activeIdx && !isReturn;
          return (
            <Fragment key={step.key}>
              <View style={ms.stepCol}>
                <View style={[
                  ms.dot,
                  done   && ms.dotDone,
                  active && ms.dotActive,
                ]}>
                  {done ? (
                    <Text style={ms.checkText}>✓</Text>
                  ) : active ? (
                    <View style={ms.innerActive} />
                  ) : null}
                </View>
                <Text style={[
                  ms.label,
                  done   && ms.labelDone,
                  active && ms.labelActive,
                  !done && !active && ms.labelFuture,
                ]}>
                  {step.label}
                </Text>
              </View>
              {i < MINI_STEPS.length - 1 && (
                <View style={[ms.line, (i < activeIdx || isReturn) && ms.lineDone]} />
              )}
            </Fragment>
          );
        })}
      </View>

      {isReturn && (
        <Text style={[ms.returnTag, s === 'returned' && ms.returnTagApproved]}>
          {s === 'return_requested' ? '↩ Return Requested' : '↩ Return Approved'}
        </Text>
      )}
    </View>
  );
}

const ms = StyleSheet.create({
  wrapper: { marginVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCol: { alignItems: 'center', width: 56 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotDone:   { backgroundColor: COLORS.success, borderColor: COLORS.success },
  dotActive: { backgroundColor: COLORS.white,   borderColor: COLORS.primary, borderWidth: 2 },
  checkText:   { fontSize: 9, color: COLORS.white, fontWeight: '900' },
  innerActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  label:       { fontSize: 9,  fontWeight: '500', color: COLORS.textSecondary, textAlign: 'center' },
  labelDone:   { color: COLORS.success, fontWeight: '600' },
  labelActive: { color: COLORS.primary, fontWeight: '700' },
  labelFuture: { color: COLORS.border },
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.border,
    marginBottom: 14,
    marginHorizontal: -4,
  },
  lineDone: { backgroundColor: COLORS.success },

  // Cancelled
  cancelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 10 },
  cancelDot:  { fontSize: 11, color: COLORS.error, fontWeight: '800' },
  cancelText: { fontSize: 11, color: COLORS.error, fontWeight: '600' },

  // Return tag
  returnTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9A3412',
    textAlign: 'center',
    marginTop: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  returnTagApproved: {
    color: '#166534',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
});

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  shopButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  orderCardReturn: {
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 2,
  },
  thumbWrap: {
    width: 52,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  thumbOverlap: { marginLeft: -10 },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderIcon: { fontSize: 20 },
  thumbExtra: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbExtraText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  thumbItemLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 10,
    fontWeight: '500',
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderArrow: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -10,
  },
  arrowText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
});
