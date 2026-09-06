import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/ui/AppHeader';
import { COLORS } from '../../../config';

const LAST_UPDATED = 'May 2025';

const sections = [
  {
    title: '1. Before Dispatch — Full Cancellation',
    body: `You can cancel your order at any time before it is dispatched (packed and handed to the courier).\n\nHow to cancel:\n1. Go to Profile → My Orders.\n2. Open the order you wish to cancel.\n3. Tap "Cancel Order" and select a reason.\n4. Confirm the cancellation.\n\nYou will receive a confirmation via WhatsApp/email. If payment was made online, a full refund will be initiated immediately — see Section 3 for refund timelines.`,
  },
  {
    title: '2. After Dispatch — No Cancellation',
    body: `Once your order has been dispatched (status: "Shipped"), it can no longer be cancelled. The package is already in transit with our courier partner.\n\nIf you no longer wish to keep the order:\n• Do not refuse the delivery — please accept the package.\n• After delivery, raise a Return Request within 7 days (see our Return & Refund Policy).\n\nRefusing delivery does not guarantee an automatic refund and may delay the process.`,
  },
  {
    title: '3. Refund After Cancellation',
    body: `For orders cancelled before dispatch:\n\n• Online payments (card, UPI, net banking, wallets): full refund to the original payment method within 5–7 business days.\n• Cash on Delivery (COD): since payment hasn't been made, no refund is needed — the order is simply cancelled.\n• Store credit / Dundu wallet payments: credited back to your wallet within 24 hours.\n\nRefund processing times depend on your bank or payment provider and are outside our control once initiated.`,
  },
  {
    title: '4. Partial Cancellation',
    body: `If your order contains multiple items, you may cancel individual items before dispatch:\n\n1. Open the order in Profile → My Orders.\n2. Tap "Cancel Item" next to the item you wish to remove.\n3. Confirm the cancellation.\n\nThe refund for the cancelled item(s) will be processed as per Section 3. Items that remain in the order will be dispatched as usual.`,
  },
  {
    title: '5. Cancellation by Dundu',
    body: `In rare cases, we may cancel your order or specific items if:\n\n• The item is out of stock and cannot be restocked in time.\n• Payment verification fails.\n• The delivery address is in an unserviceable area.\n• Fraudulent activity is detected.\n\nIf we cancel your order, you will be notified immediately via WhatsApp/email and a full refund will be issued.`,
  },
  {
    title: '6. Flash Sale & Limited-Time Offer Orders',
    body: `Orders placed during flash sales or limited-time promotions follow the same cancellation policy. However, once cancelled, we cannot guarantee that the same offer price will be available if you wish to re-order.`,
  },
  {
    title: '7. Contact Us',
    body: `If you have trouble cancelling through the app or need assistance:\n\nEmail: orders@dundu.store\nHelp & Support: available in-app\n\nWe aim to respond within 24 business hours.`,
  },
];

export default function CancellationPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Cancellation Policy" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Changed your mind? No problem. Here is everything you need to know about cancelling a Dundu order.
          </Text>
          <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        {/* Status flow */}
        <View style={styles.flowCard}>
          <Text style={styles.flowTitle}>Order Status & Cancellation</Text>
          <View style={styles.flow}>
            {[
              { status: 'Pending', canCancel: true },
              { status: 'Packed', canCancel: true },
              { status: 'Shipped', canCancel: false },
              { status: 'Delivered', canCancel: false },
            ].map((step, i) => (
              <View key={step.status} style={styles.flowStep}>
                <View style={[styles.flowDot, step.canCancel ? styles.flowDotGreen : styles.flowDotRed]} />
                <Text style={styles.flowStatus}>{step.status}</Text>
                <Text style={[styles.flowTag, step.canCancel ? styles.flowTagGreen : styles.flowTagRed]}>
                  {step.canCancel ? 'Cancellable' : 'No Cancel'}
                </Text>
                {i < 3 && <View style={styles.flowLine} />}
              </View>
            ))}
          </View>
        </View>

        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This policy is in accordance with the Consumer Protection Act, 2019 (India).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 20, paddingBottom: 40 },
  intro: {
    backgroundColor: '#fdf0f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  introText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  lastUpdated: { marginTop: 8, fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  flowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  flowTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 16, textAlign: 'center' },
  flow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  flowStep: { flex: 1, alignItems: 'center', position: 'relative' },
  flowDot: { width: 14, height: 14, borderRadius: 7, marginBottom: 6 },
  flowDotGreen: { backgroundColor: '#22C55E' },
  flowDotRed: { backgroundColor: COLORS.error },
  flowStatus: { fontSize: 11, fontWeight: '600', color: COLORS.dark, textAlign: 'center', marginBottom: 4 },
  flowTag: { fontSize: 9, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  flowTagGreen: { backgroundColor: '#dcfce7', color: '#16a34a' },
  flowTagRed: { backgroundColor: '#fee2e2', color: '#dc2626' },
  flowLine: {
    position: 'absolute',
    top: 6,
    right: -8,
    width: 16,
    height: 2,
    backgroundColor: COLORS.border,
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  sectionBody: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  footer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  footerText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, textAlign: 'center' },
});
