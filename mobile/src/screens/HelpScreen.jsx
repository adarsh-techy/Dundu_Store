import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/ui/AppHeader';
import { COLORS } from '../config';

// ── Change these to your actual business contact details ──
const WHATSAPP_NUMBER = '919846333075'; // country code + number, no +
const PHONE_NUMBER    = '+919846333075';
const EMAIL_ADDRESS   = 'support@dundu.store';
const BUSINESS_HOURS  = 'Mon – Sat, 10 AM – 7 PM';

async function openLink(url) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Not supported', 'This action cannot be performed on your device.');
    }
  } catch {
    Alert.alert('Error', 'Could not open the link.');
  }
}

const HELP_OPTIONS = [
  {
    id: 'whatsapp',
    icon: '💬',
    label: 'WhatsApp Chat',
    sublabel: 'Chat with us instantly',
    color: '#25D366',
    bg: '#e8faf0',
    onPress: () =>
      openLink(
        `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20help%20with%20my%20Dundu%20order.`
      ),
  },
  {
    id: 'call',
    icon: '📞',
    label: 'Call Us',
    sublabel: BUSINESS_HOURS,
    color: '#1565C0',
    bg: '#e8f0fe',
    onPress: () => openLink(`tel:${PHONE_NUMBER}`),
  },
  {
    id: 'email',
    icon: '✉️',
    label: 'Email Support',
    sublabel: EMAIL_ADDRESS,
    color: '#E91E8C',
    bg: '#fce4f0',
    onPress: () =>
      openLink(
        `mailto:${EMAIL_ADDRESS}?subject=Support%20Request%20–%20Dundu`
      ),
  },
];

const FAQ = [
  { q: 'How do I track my order?', a: 'Go to Profile → My Orders and tap on your order to see the current status.' },
  { q: 'Can I return or exchange an item?', a: 'Yes! We accept returns within 7 days of delivery. Open your order and tap "Return Request".' },
  { q: 'How long does delivery take?', a: 'Standard delivery takes 3–5 business days. Express delivery is 1–2 business days.' },
  { q: 'How do loyalty points work?', a: 'You earn 20 pts for every ₹500 spent. 200 pts = ₹200 discount on your next order.' },
];

export default function HelpScreen() {
  const [openFaq, setOpenFaq] = React.useState(null);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Help & Support" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🛎️</Text>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>We're here for you — reach us through any channel below.</Text>
        </View>

        {/* Contact options */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        {HELP_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionCard}
            onPress={opt.onPress}
            activeOpacity={0.75}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: opt.bg }]}>
              <Text style={styles.optionIcon}>{opt.icon}</Text>
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionLabel, { color: opt.color }]}>{opt.label}</Text>
              <Text style={styles.optionSub}>{opt.sublabel}</Text>
            </View>
            <Text style={[styles.optionArrow, { color: opt.color }]}>›</Text>
          </TouchableOpacity>
        ))}

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Frequently Asked Questions</Text>
        {FAQ.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqCard}
            onPress={() => setOpenFaq(openFaq === i ? null : i)}
            activeOpacity={0.8}
          >
            <View style={styles.faqRow}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Text style={[styles.faqChevron, openFaq === i && styles.faqChevronOpen]}>›</Text>
            </View>
            {openFaq === i && (
              <Text style={styles.faqA}>{item.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Dundu Support · {BUSINESS_HOURS}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 90 },

  /* Hero */
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  heroIcon: { fontSize: 52, marginBottom: 12 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Section title */
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  /* Contact option cards */
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionIcon: { fontSize: 24 },
  optionInfo: { flex: 1 },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  optionArrow: {
    fontSize: 24,
    fontWeight: '300',
  },

  /* FAQ */
  faqCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQ: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
    paddingRight: 8,
  },
  faqChevron: {
    fontSize: 22,
    color: COLORS.textSecondary,
    fontWeight: '300',
    transform: [{ rotate: '0deg' }],
  },
  faqChevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  faqA: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },

  footer: { alignItems: 'center', paddingTop: 24 },
  footerText: { fontSize: 12, color: COLORS.textSecondary },
});
