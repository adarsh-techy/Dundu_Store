import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { deliveryApi } from '../../api/index';
import { COLORS } from '../../config';
import { formatPrice } from '../../utils/format';

export default function DeliveryOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [completing, setCompleting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => { fetchOrder(); }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    try {
      const res = await deliveryApi.myOrders();
      const orders = res.orders || res || [];
      const found = orders.find((o) => o.id === orderId);
      if (!found) {
        Alert.alert('Not found', 'This order is no longer in your active deliveries.');
        navigation.goBack();
        return;
      }
      setOrder(found);
    } catch (err) {
      Alert.alert('Error', 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (!otp.trim()) { Alert.alert('OTP required', 'Ask the customer for their delivery OTP.'); return; }
    setCompleting(true);
    try {
      await deliveryApi.complete(orderId, otp.trim());
      Alert.alert('Delivered', 'This order has been marked as delivered.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Invalid OTP', err.message || 'Could not verify the OTP.');
    } finally {
      setCompleting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await deliveryApi.resendOtp(orderId);
      Alert.alert('OTP Resent', 'A new OTP has been sent to the customer.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  }

  if (loading || !order) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={COLORS.primary} /></SafeAreaView>;
  }

  const address = [order.address_line1, order.address_line2, order.city, order.state, order.pincode].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>#{order.order_number}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{order.customer_name}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}>
            <Text style={styles.phone}>📞 {order.customer_phone}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Delivery Address</Text>
          <Text style={styles.value}>{address || '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Order Total</Text>
          <Text style={styles.total}>{formatPrice(order.total)}</Text>
        </View>

        <View style={[styles.card, styles.otpCard]}>
          <Text style={styles.otpTitle}>Complete Delivery</Text>
          <Text style={styles.otpHint}>Ask the customer for the OTP shown in their app and enter it below.</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter OTP"
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor={COLORS.textSecondary}
          />
          <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} disabled={completing}>
            {completing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.completeBtnText}>Mark as Delivered</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
            <Text style={styles.resendText}>{resending ? 'Resending…' : 'Resend OTP to customer'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  back: { fontSize: 15, color: COLORS.primary, fontWeight: '600', width: 40 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  value: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  phone: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  total: { fontSize: 18, color: COLORS.primary, fontWeight: '800' },
  otpCard: { backgroundColor: '#FDF2F8', borderWidth: 1, borderColor: '#FBCFE8' },
  otpTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  otpHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  otpInput: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 12, fontSize: 20, fontWeight: '700', letterSpacing: 4, textAlign: 'center', marginBottom: 14, color: COLORS.text },
  completeBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  completeBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  resendBtn: { marginTop: 12, alignItems: 'center' },
  resendText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
});
