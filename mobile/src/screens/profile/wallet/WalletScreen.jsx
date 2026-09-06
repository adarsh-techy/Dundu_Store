import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/ui/AppHeader';
import { walletApi } from '../../../api/index';
import { COLORS } from '../../../config';
import { formatPrice } from '../../../utils/format';

const REASON_LABELS = {
  order_payment: 'Paid at checkout',
  order_refund: 'Order cancelled — refund',
  return_refund: 'Return refund',
  admin_credit: 'Credit from Dundu',
  admin_debit: 'Adjustment',
};

export default function WalletScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    walletApi.getTransactions({ limit: 50 })
      .then((res) => {
        const data = res?.data || res;
        setBalance(data?.balance || 0);
        setTransactions(data?.transactions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="My Wallet" showBack />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>{formatPrice(balance)}</Text>
            <Text style={styles.balanceHint}>Choose "Pay with Wallet" at checkout to use it</Text>
          </View>

          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((t) => (
              <View key={t.id} style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txReason}>{REASON_LABELS[t.reason] || t.reason}</Text>
                  <Text style={styles.txDate}>
                    {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: t.type === 'credit' ? COLORS.success : COLORS.primary }]}>
                  {t.type === 'credit' ? '+' : '-'}{formatPrice(t.amount)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 90 },

  balanceCard: {
    borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 22,
    backgroundColor: '#1a0a12', borderWidth: 1, borderColor: '#3d1226',
  },
  balanceLabel: { fontSize: 11, letterSpacing: 1.5, color: '#999', textTransform: 'uppercase' },
  balanceValue: { fontSize: 34, fontWeight: '900', color: COLORS.primary, marginTop: 8 },
  balanceHint: { fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },

  txRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  txReason: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  txDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  txAmount: { fontSize: 14, fontWeight: '800', marginLeft: 8 },
});
