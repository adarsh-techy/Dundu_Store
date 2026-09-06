import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/ui/AppHeader';
import { COLORS } from '../../../config';

const LAST_UPDATED = 'May 2025';
const CONTACT_EMAIL = 'privacy@dundu.store';

const sections = [
  {
    title: '1. Information We Collect',
    body: `We collect the following information when you use Dundu:\n\n• Personal details: name, email address, phone number, date of birth.\n• Delivery information: shipping addresses you save or enter at checkout.\n• Account credentials: hashed passwords or OAuth tokens (Google Sign-In).\n• Order & transaction data: items purchased, payment status, order history.\n• Device & usage data: device model, OS version, IP address, app interactions, and crash reports — collected to improve performance.\n• Communications: messages you send to our support team.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use the information we collect to:\n\n• Process and fulfil your orders, including sending shipping updates.\n• Verify your identity and keep your account secure.\n• Provide customer support and respond to inquiries.\n• Send transactional notifications (order confirmations, delivery alerts) via WhatsApp, SMS, or email.\n• Send promotional messages only if you have opted in. You can opt out at any time from the app settings.\n• Analyse usage patterns to improve our products and services.\n• Comply with legal obligations under applicable Indian law.`,
  },
  {
    title: '3. Payment Information',
    body: `Dundu does not store your card numbers, CVV, or banking credentials on our servers. All payments are processed by third-party payment gateways (Razorpay / Cashfree / PhonePe) which are PCI-DSS compliant. We only receive a payment confirmation token once a transaction is complete.`,
  },
  {
    title: '4. Sharing of Information',
    body: `We do not sell your personal data. We share it only in the following limited circumstances:\n\n• Logistics partners: to deliver your orders (name, phone, address).\n• Payment processors: to complete transactions.\n• Authentication providers: Google, for OAuth sign-in.\n• Messaging services: Twilio / WhatsApp Business API, to send OTPs and order updates.\n• Legal authorities: if required by law, court order, or to protect the rights and safety of Dundu and its users.\n\nAll third-party partners are bound by confidentiality agreements.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your personal data for as long as your account is active or as needed to provide our services. You may request deletion of your account and associated data at any time by writing to ${CONTACT_EMAIL}. We will delete your data within 30 days of the verified request, except where retention is required by law (e.g., financial records for 7 years under the Companies Act).`,
  },
  {
    title: '6. Data Security',
    body: `We employ industry-standard safeguards including HTTPS/TLS encryption in transit, hashed passwords (bcrypt), access controls, and regular security reviews. While we take all reasonable precautions, no system is completely immune to breaches. We will notify affected users promptly if a breach occurs.`,
  },
  {
    title: '7. Your Rights',
    body: `You have the right to:\n\n• Access: request a copy of the personal data we hold about you.\n• Correction: update inaccurate or incomplete data from your Profile screen.\n• Deletion: request erasure of your account and personal data.\n• Portability: receive your data in a structured, machine-readable format.\n• Opt-out: unsubscribe from marketing communications at any time.\n\nTo exercise any of these rights, email us at ${CONTACT_EMAIL}.`,
  },
  {
    title: '8. Cookies & Tracking',
    body: `The Dundu mobile app does not use browser cookies. We use anonymised analytics (crash reporting, session metrics) to understand how the app is used. This data cannot identify you personally and is aggregated for analysis only.`,
  },
  {
    title: '9. Children\'s Privacy',
    body: `Dundu is intended for users aged 18 and above. We do not knowingly collect personal information from children under 13. If we become aware that a child has provided personal data, we will delete it promptly. Parents or guardians who believe their child's data has been collected may contact us at ${CONTACT_EMAIL}.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes through in-app notifications or by email. Continued use of the app after the update constitutes acceptance of the revised policy.`,
  },
  {
    title: '11. Contact Us',
    body: `For any privacy-related queries or requests:\n\nDundu Fashion Pvt. Ltd.\nEmail: ${CONTACT_EMAIL}\n\nWe aim to respond within 5 business days.`,
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Privacy Policy" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Dundu ("we", "our", "us") is committed to protecting your privacy. This policy explains how we
            collect, use, and safeguard your personal information when you use our mobile app or website.
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
            This policy is governed by the laws of India, including the Information Technology Act 2000
            and the Digital Personal Data Protection Act 2023.
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
