/**
 * LoginPromptModal — global bottom-sheet that appears when a guest
 * tries to perform an auth-required action.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { navigate as navNavigate } from '../../navigation/navigationRef';
import useLoginPromptStore from '../../store/loginPrompt.store';
import { COLORS } from '../../config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BENEFITS = [
  { icon: '🛒', text: 'Add items to cart & checkout' },
  { icon: '❤️', text: 'Save to wishlist' },
  { icon: '📦', text: 'Track your orders' },
  { icon: '🎁', text: 'Earn loyalty points & rewards' },
  { icon: '🤝', text: 'Refer friends & earn discounts' },
];

export default function LoginPromptModal() {
  const { visible, message, hide } = useLoginPromptStore();

  function goLogin() {
    hide();
    navNavigate('Login');
  }

  function goSignup() {
    hide();
    navNavigate('Signup');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={hide}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={hide}
      />

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={styles.title}>Sign in to continue</Text>
        <Text style={styles.subtitle}>
          {message || 'Create a free account or log in to unlock all features.'}
        </Text>

        {/* Benefits */}
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.icon} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <TouchableOpacity style={styles.loginBtn} onPress={goLogin}>
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signupBtn} onPress={goSignup}>
          <Text style={styles.signupBtnText}>Create Account — It's Free</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={hide}>
          <Text style={styles.skipBtnText}>Continue browsing</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderColor: COLORS.primary,
    // Max height so it doesn't overflow on small screens
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a0a1a',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 28 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f5f5f5',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  benefits: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIcon: { fontSize: 18, width: 28 },
  benefitText: { fontSize: 13, color: '#ccc', fontWeight: '500', flex: 1 },

  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  signupBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: 10,
  },
  signupBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: { color: '#555', fontSize: 13 },
});
