import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuthStore from '../../store/auth.store';
import { settingsApi } from '../../api/index';
import { COLORS } from '../../config';
import { navigationRef } from '../../navigation/navigationRef';

const { width } = Dimensions.get('window');

function isBirthdayToday(dob) {
  if (!dob) return false;
  const d = new Date(dob);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function dismissKey() {
  const t = new Date();
  return `dundu_bday_dismissed_${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function BirthdayPopupModal() {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [discount, setDiscount] = useState(15);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user?.date_of_birth || !isBirthdayToday(user.date_of_birth)) return;

    async function init() {
      try {
        const res = await settingsApi.getPayment();
        const d = res.data?.data || res.data;
        if (!d?.birthday_popup_enabled) return;
        if (d?.birthday_discount) setDiscount(d.birthday_discount);

        const dismissed = await AsyncStorage.getItem(dismissKey());
        if (!dismissed) setVisible(true);

        intervalRef.current = setInterval(async () => {
          const isDismissed = await AsyncStorage.getItem(dismissKey());
          if (!isDismissed) setVisible(true);
        }, 2 * 60 * 1000);
      } catch (_) {}
    }

    init();
    return () => clearInterval(intervalRef.current);
  }, [user?.id, user?.date_of_birth]);

  async function handleDismiss() {
    await AsyncStorage.setItem(dismissKey(), '1').catch(() => {});
    setVisible(false);
  }

  function handleShopNow() {
    setVisible(false);
    navigationRef.current?.navigate('MainTabs', { screen: 'Shop' });
  }

  const firstName = user?.name?.split(' ')[0] || 'Dear Customer';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleDismiss}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={s.card}>
            {/* Decorative blob */}
            <View style={s.blob1} />
            <View style={s.blob2} />

            <Text style={s.emoji}>🎂</Text>
            <Text style={s.title}>Happy Birthday!</Text>
            <Text style={s.subtitle}>{firstName}, today is your special day 🎉</Text>

            <View style={s.discountBox}>
              <Text style={s.discountValue}>{discount}%</Text>
              <Text style={s.discountLabel}>Birthday Discount</Text>
              <Text style={s.discountNote}>Applied automatically at checkout — no code needed</Text>
            </View>

            <TouchableOpacity style={s.shopBtn} onPress={handleShopNow} activeOpacity={0.9}>
              <Text style={s.shopBtnText}>🛍️ Shop Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.noBtn} onPress={handleDismiss}>
              <Text style={s.noBtnText}>No, I don't want to purchase today</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const CARD_WIDTH = Math.min(width - 48, 340);

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blob2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  emoji: { fontSize: 64, marginBottom: 10, textAlign: 'center' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 22,
    textAlign: 'center',
  },
  discountBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 22,
  },
  discountValue: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 56,
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  discountNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    textAlign: 'center',
  },
  shopBtn: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  shopBtnText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  noBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  noBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
