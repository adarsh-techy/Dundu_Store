import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Clipboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useSettingsStore from '../../store/settings.store';
import { navigationRef } from '../../navigation/navigationRef';

const { width } = Dimensions.get('window');

function dismissKey() {
  const t = new Date();
  return `dundu_festival_popup_dismissed_${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function FestivalPopupModal() {
  const festEnabled = useSettingsStore((s) => s.festivalEnabled);
  const popupEnabled = useSettingsStore((s) => s.festivalPopupEnabled);
  const emoji = useSettingsStore((s) => s.festivalEmoji) || '🎉';
  const badgeText = useSettingsStore((s) => s.festivalPopupBadgeText) || 'LIMITED TIME OFFER';
  const heading = useSettingsStore((s) => s.festivalPopupHeading) || 'Festival Sale is Live!';
  const subtext = useSettingsStore((s) => s.festivalPopupSubtext) || 'Get exclusive discounts on all orders today!';
  const coupon = useSettingsStore((s) => s.festivalPopupCoupon);
  const btnText = useSettingsStore((s) => s.festivalPopupBtnText) || 'Shop Now 🛍️';
  const btnColor = useSettingsStore((s) => s.festivalPopupBtnColor) || '#E91E8C';

  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!festEnabled || !popupEnabled) {
      setVisible(false);
      return;
    }

    async function checkDismissed() {
      try {
        const d = await AsyncStorage.getItem(dismissKey());
        if (!d) setVisible(true);
      } catch (_) {
        setVisible(true);
      }
    }

    checkDismissed();
  }, [festEnabled, popupEnabled]);

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(dismissKey(), '1');
    } catch (_) {}
    setVisible(false);
  };

  const handleCopyCoupon = () => {
    if (coupon) {
      Clipboard.setString(coupon);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShopNow = async () => {
    if (coupon) {
      Clipboard.setString(coupon);
    }
    await handleDismiss();
    navigationRef.current?.navigate('MainTabs', { screen: 'Shop' });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleDismiss}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={s.card}>
            {/* Top decorative gradient bar */}
            <View style={[s.ribbon, { backgroundColor: btnColor }]} />

            {/* Close button */}
            <TouchableOpacity style={s.closeBtn} onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={s.emoji}>{emoji}</Text>

            {badgeText ? (
              <View style={[s.badge, { backgroundColor: btnColor }]}>
                <Text style={s.badgeText}>{badgeText.toUpperCase()}</Text>
              </View>
            ) : null}

            <Text style={s.heading}>{heading}</Text>
            <Text style={s.subtext}>{subtext}</Text>

            {coupon ? (
              <TouchableOpacity style={s.couponBox} onPress={handleCopyCoupon} activeOpacity={0.8}>
                <Text style={s.couponCode}>{coupon}</Text>
                <Text style={s.copyHint}>{copied ? 'Copied! ✓' : 'Tap to copy'}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[s.btn, { backgroundColor: btnColor }]}
              onPress={handleShopNow}
              activeOpacity={0.9}
            >
              <Text style={s.btnText}>{btnText}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: Math.min(width - 48, 340),
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  emoji: {
    fontSize: 52,
    marginBottom: 10,
    marginTop: 6,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  couponBox: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  couponCode: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 3,
  },
  copyHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2,
  },
  btn: {
    width: '100%',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
