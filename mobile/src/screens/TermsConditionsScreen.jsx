import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/ui/AppHeader';
import { COLORS } from '../config';

const LAST_UPDATED = 'May 2025';
const CONTACT_EMAIL = 'support@dundu.store';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By downloading, installing, or using the Dundu mobile application ("App") or our website, you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, please do not use the App or our services.`,
  },
  {
    title: '2. Account Registration & Eligibility',
    body: `You must be at least 18 years old or possess legal parental or guardian consent to use our services.\n\nWhen registering an account, you agree to:\n• Provide accurate and current information.\n• Maintain the confidentiality of your account credentials (password/login).\n• Notify us immediately of any unauthorized use of your account.`,
  },
  {
    title: '3. Products & Pricing',
    body: `• We make every effort to display the colors, specifications, and details of our apparel products as accurately as possible. However, we cannot guarantee your screen will show them perfectly.\n• Pricing is shown in Indian Rupees (INR) and includes applicable GST unless stated otherwise.\n• We reserve the right to modify prices, descriptions, and availability of products without prior notice.`,
  },
  {
    title: '4. Orders & Payments',
    body: `• Placing an order represents an offer to purchase. We reserve the right to accept or decline any order at our sole discretion.\n• Payments must be completed online via our approved payment gateways or selected via Cash on Delivery (COD) if available.\n• If payment verification fails, we reserve the right to cancel the order.`,
  },
  {
    title: '5. Shipping & Delivery',
    body: `• Delivery timelines are estimates and not guaranteed. Standard delivery takes 3-5 business days.\n• Risk of loss and title for items purchased pass to you upon delivery of the items to the shipping address. Please refer to our Shipping Policy for details.`,
  },
  {
    title: '6. Returns, Refunds & Cancellations',
    body: `• Cancellations are accepted only prior to order dispatch.\n• Returns must be raised within 48 hours of delivery. A continuous package opening (unboxing) video is strictly mandatory for return approval.\n• For full terms, please review our Return & Refund Policy and Cancellation Policy.`,
  },
  {
    title: '7. Loyalty Program & Promotions',
    body: `• Dundu offers loyalty points and promotional coupons at its sole discretion.\n• Points and discounts are non-transferable, cannot be redeemed for cash, and may expire. Dundu reserves the right to terminate or alter the terms of these programs at any time.`,
  },
  {
    title: '8. Prohibited Conduct',
    body: `You agree not to:\n• Use the App or services for any fraudulent or unlawful purposes.\n• Attempt to bypass security checks, modify codebase, reverse-engineer the app, or inject malicious code.\n• Make false claims, upload abusive reviews, or harass our support staff.`,
  },
  {
    title: '9. Intellectual Property',
    body: `All content on Dundu, including text, graphics, logos, images, UI design, and code, is the property of Dundu Fashion Pvt. Ltd. and is protected by Indian copyright and trademark laws. You may not copy, reuse, or distribute any content without explicit permission.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `• Dundu services are provided "as is" without warranties of any kind.\n• In no event shall Dundu Fashion Pvt. Ltd. be liable for any indirect, incidental, or consequential damages resulting from your use of, or inability to use, our services.`,
  },
  {
    title: '11. Governing Law & Jurisdiction',
    body: `These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or use of the services shall be subject to the exclusive jurisdiction of the courts of our registered headquarters.`,
  },
  {
    title: '12. Contact Information',
    body: `For any questions or support regarding these Terms:\n\nDundu Fashion Pvt. Ltd.\nEmail: ${CONTACT_EMAIL}`,
  },
];

export default function TermsConditionsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Terms & Conditions" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Welcome to Dundu. Please read these Terms & Conditions carefully before using our mobile application or purchasing our fashion products.
          </Text>
          <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using this App, you confirm that you accept these Terms & Conditions.
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
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  introText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  lastUpdated: { marginTop: 8, fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
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
