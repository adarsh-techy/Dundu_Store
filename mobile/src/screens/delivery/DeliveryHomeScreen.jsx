import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { deliveryApi } from '../../api/index';
import { COLORS } from '../../config';
import { formatPrice } from '../../utils/format';
import useAuthStore from '../../store/auth.store';

const TABS = [
  { key: 'my', label: 'My Deliveries' },
  { key: 'available', label: 'Available at Hub' },
];

export default function DeliveryHomeScreen() {
  const navigation = useNavigation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState('my');
  const [myOrders, setMyOrders] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [mine, avail] = await Promise.all([deliveryApi.myOrders(), deliveryApi.available()]);
      setMyOrders(mine.orders || mine || []);
      setAvailable(avail.orders || avail || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll();
    }, [fetchAll])
  );

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const data = tab === 'my' ? myOrders : available;

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          if (tab === 'my') navigation.navigate('DeliveryOrder', { orderId: item.id });
        }}
      >
        <View style={styles.cardTop}>
          <Text style={styles.orderNumber}>#{item.order_number}</Text>
          <Text style={styles.total}>{formatPrice(item.total)}</Text>
        </View>
        <Text style={styles.customer}>{item.customer_name} · {item.customer_phone}</Text>
        <Text style={styles.address} numberOfLines={2}>
          {[item.address_line1, item.address_line2, item.city, item.state, item.pincode].filter(Boolean).join(', ')}
        </Text>
        {tab === 'available' && (
          <Text style={styles.hint}>Scan its pickup QR at the hub to add it here</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Delivery</Text>
          <Text style={styles.subtitle}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('DeliveryScan')} activeOpacity={0.85}>
        <Text style={styles.scanBtnText}>📷 Scan Hub Pickup QR</Text>
      </TouchableOpacity>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label} ({t.key === 'my' ? myOrders.length : available.length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={<Text style={styles.empty}>{tab === 'my' ? 'No active deliveries' : 'Nothing waiting at the hub'}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  logoutText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  scanBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  scanBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 18, backgroundColor: COLORS.surface, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  listContent: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderNumber: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  total: { fontWeight: '700', color: COLORS.primary, fontSize: 14 },
  customer: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  address: { fontSize: 12, color: COLORS.textSecondary },
  hint: { fontSize: 11, color: COLORS.primary, marginTop: 8, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 13 },
});
