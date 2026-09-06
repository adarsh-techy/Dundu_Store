import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/ui/AppHeader';
import { COLORS } from '../../../config';

const LAST_UPDATED = 'May 2025';

const deliveryTable = [
  { zone: 'Metro Cities', days: '2–4 Business Days' },
  { zone: 'Tier 2 & Tier 3 Cities', days: '3–6 Business Days' },
  { zone: 'Rural & Remote Areas', days: '5–8 Business Days' },
  { zone: 'North East States', days: '5–10 Business Days' },
];

const sections = [
  {
    title: '1. Order Processing',
    body: `Orders are processed on business days (Monday to Saturday, excluding public holidays).\n\n• Orders placed before 2:00 PM are processed the same day.\n• Orders placed after 2:00 PM or on Sundays/holidays are processed the next business day.\n• You will receive an order confirmation via WhatsApp/email shortly after placing your order.\n• Once dispatched, a tracking link and courier details will be shared with you.`,
  },
  {
    title: '2. Shipping Charges',
    body: `• Orders above ₹499: FREE standard shipping.\n• Orders below ₹499: ₹49 flat shipping charge.\n• Express delivery (where available): ₹99 additional charge, 1–2 business days.\n• Cash on Delivery (COD): additional ₹30 handling charge.\n\nShipping charges are displayed clearly at checkout before payment.`,
  },
  {
    title: '3. Delivery Timeframes',
    body: `Estimated delivery times after dispatch:`,
    table: true,
  },
  {
    title: '4. Tracking Your Order',
    body: `Once your order is dispatched:\n\n1. You will receive a WhatsApp/SMS notification with the courier name and tracking number.\n2. Track your order in the app: Profile → My Orders → select order → Track Shipment.\n3. You can also track directly on the courier's website using the tracking number provided.`,
  },
  {
    title: '5. Delivery Attempts',
    body: `Our delivery partners will attempt delivery up to 3 times:\n\n• If you are unavailable on the first attempt, they will try again on the next 1–2 business days.\n• After 3 failed attempts, the package will be returned to our warehouse.\n• In case of a failed delivery, a full refund will be issued (excluding COD handling charges). You may re-order at your convenience.`,
  },
  {
    title: '6. Undeliverable Areas',
    body: `We currently ship to all serviceable pin codes across India. If your area is not serviceable, you will be notified at checkout before placing the order. We are continually expanding our delivery network — check back if your area is not currently covered.`,
  },
  {
    title: '7. Delayed Shipments',
    body: `While we strive to deliver within the stated timeframes, delays may occur due to:\n\n• Natural disasters, floods, or severe weather.\n• National strikes or public holidays.\n• Incorrect or incomplete shipping address.\n• Peak sale seasons with high order volumes.\n\nIn case of a significant delay, our team will proactively notify you. You may also reach us via Help & Support in the app.`,
  },
  {
    title: '8. Address Accuracy',
    body: `Please ensure your delivery address is complete and accurate, including:\n\n• Flat/House number, building name, street\n• Landmark (if any)\n• City, State, PIN code\n• Active phone number\n\nDundu is not liable for delivery failures or delays caused by an incorrect or incomplete address provided by the customer.`,
  },
  {
    title: '9. International Shipping',
    body: `Currently, we ship within India only. International shipping is not available at this time. We will update this policy if international delivery becomes available.`,
  },
  {
    title: '10. Contact Us',
    body: `For shipping-related queries:\n\nEmail: shipping@dundu.store\nHelp & Support: available in-app\n\nWe aim to respond within 24 business hours.`,
  },
];

export default function ShippingPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Shipping Policy" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            We partner with trusted courier services to deliver your Dundu orders safely and on time across India.
          </Text>
          <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        {/* Quick summary chips */}
        <View style={styles.chips}>
          {[
            { icon: '🚚', label: 'Free Shipping\nabove ₹499' },
            { icon: '📍', label: 'PAN India\nDelivery' },
            { icon: '📦', label: 'Order\nTracking' },
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
            {s.table ? (
              <>
                <Text style={[styles.sectionBody, { marginBottom: 12 }]}>{s.body}</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Zone</Text>
                    <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Estimated Delivery</Text>
                  </View>
                  {deliveryTable.map((row, i) => (
                    <View key={row.zone} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{row.zone}</Text>
                      <Text style={[styles.tableCell, styles.tableDays, { flex: 2 }]}>{row.days}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.sectionBody}>{s.body}</Text>
            )}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Delivery timelines are estimates and may vary based on location and courier partner availability.
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
  chipLabel: { fontSize: 11, fontWeight: '600', color: COLORS.dark, textAlign: 'center', lineHeight: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  sectionBody: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  table: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: { color: COLORS.white, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  tableRowAlt: { backgroundColor: COLORS.surface },
  tableCell: { fontSize: 13, color: COLORS.text },
  tableDays: { fontWeight: '600', color: COLORS.dark },
  footer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  footerText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, textAlign: 'center' },
});
