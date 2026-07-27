import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/ui/AppHeader';
import { COLORS } from '../config';

const LAST_UPDATED = 'May 2025';

const sections = [
  {
    title: '1. Return Eligibility',
    body: `You may return most items within 2 days of delivery, provided the following conditions are met:\n\n• The item is unused, unworn, unwashed, and undamaged.\n• Original tags and packaging are intact.\n• The item is in resalable condition.\n• The return request is raised within 2 days of the delivery date.`,
  },
  {
    title: '2. Non-Returnable Items',
    body: `The following items cannot be returned or exchanged:\n\n• Innerwear, lingerie, and swimwear (for hygiene reasons).\n• Items marked as "Final Sale", "Non-Returnable", or "Clearance".\n• Items that have been used, washed, altered, or damaged by the customer.\n• Gift cards and vouchers.\n• Items without original tags or packaging.\n\nIf you receive a defective or incorrect item, please refer to Section 5 below — those cases are handled differently and outside the standard return window.`,
  },
  {
    title: '3. How to Initiate a Return',
    body: `To raise a return request:\n\n1. Go to Profile → My Orders.\n2. Select the order and tap "Return / Exchange".\n3. Choose the item(s) and reason for return.\n4. Submit photos if the item is damaged or incorrect.\n5. Our team will review the request within 24–48 hours.\n\nOnce approved, a reverse pick-up will be scheduled. Please keep the item ready in its original packaging.`,
  },
  {
    title: '4. Refund Process',
    body: `Once we receive and inspect the returned item:\n\n• Inspection typically takes 1–2 business days after the item reaches our warehouse.\n• Approved refunds are processed within 2 business days of inspection.\n• The refund will appear in your original payment method within 5–7 business days depending on your bank or payment provider.\n\nRefund methods:\n• Online payments (card, UPI, net banking): refunded to the original payment source.\n• Cash on Delivery orders: refunded as store credit or bank transfer (NEFT) — bank details required.\n• Store credit: credited to your Dundu wallet within 24 hours of approval.`,
  },
  {
    title: '5. Defective or Wrong Items',
    body: `If you receive a defective, damaged, or incorrect item, contact us within 48 hours of delivery:\n\n• Email: returns@dundu.store\n• WhatsApp: available from Help & Support in the app\n\nPlease share your order number and clear photos of the issue. We will arrange a free reverse pick-up and offer a full refund or replacement at no additional cost. This applies even to non-returnable categories when the fault is ours.`,
  },
  {
    title: '6. Exchange Policy',
    body: `We currently offer exchanges for a different size or colour of the same product, subject to availability. To request an exchange:\n\n1. Raise a return request (as in Section 3) and select "Exchange" as the reason.\n2. Specify the desired size or colour.\n3. The replacement item will be dispatched after we receive your original item.\n\nIf the desired variant is out of stock, a full refund will be issued instead.`,
  },
  {
    title: '7. Shipping Charges for Returns',
    body: `• Returns due to a defective, damaged, or wrong item: free reverse pick-up.\n• Returns for other reasons (size, change of mind): a reverse pick-up fee of ₹99 will be deducted from the refund amount, OR you may self-ship the item to our warehouse address.\n• Orders with free shipping that are returned for non-defect reasons may have the original shipping cost deducted from the refund.`,
  },
  {
    title: '8. Contact Us',
    body: `For any return or refund queries:\n\nEmail: returns@dundu.store\nHelp & Support: available in-app\n\nWe aim to respond within 24 business hours.`,
  },
];

export default function ReturnRefundPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Return & Refund Policy" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            We want you to love every purchase. If something isn't right, our hassle-free return and refund
            process has you covered.
          </Text>
          <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        {/* Quick summary chips */}
        <View style={styles.chips}>
          {[
            { icon: '📅', label: '2-Day Returns' },
            { icon: '💰', label: 'Easy Refunds' },
            { icon: '🔄', label: 'Size Exchange' },
          ].map((c) => (
            <View key={c.label} style={styles.chip}>
              <Text style={styles.chipIcon}>{c.icon}</Text>
              <Text style={styles.chipLabel}>{c.label}</Text>
            </View>
          ))}
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
  chips: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  chip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  chipIcon: { fontSize: 22 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: COLORS.dark, textAlign: 'center' },
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
