import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../../config';

export default function OrderSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, orderNumber } = route.params || {};

  // Animations
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Pop in the circle
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      // 2. Fade + slide up the text & buttons
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0,  duration: 320, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  function goTrack() {
    navigation.replace('OrderDetail', { orderId });
  }

  function goShop() {
    navigation.replace('MainTabs', { screen: 'Shop' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Animated checkmark circle */}
        <Animated.View style={[styles.circleWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.circleOuter}>
            <View style={styles.circleInner}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          </View>
          {/* Ripple rings */}
          <View style={[styles.ring, styles.ring1]} />
          <View style={[styles.ring, styles.ring2]} />
        </Animated.View>

        {/* Text content */}
        <Animated.View style={[
          styles.textBlock,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          <Text style={styles.title}>Order Placed!</Text>
          {orderNumber && (
            <Text style={styles.orderNum}>#{orderNumber}</Text>
          )}
          <Text style={styles.subtitle}>
            Your order is confirmed.{'\n'}We'll notify you when it's packed and shipped.
          </Text>

          {/* Delivery note */}
          <View style={styles.noteCard}>
            <Text style={styles.noteIcon}>🚚</Text>
            <Text style={styles.noteText}>
              Estimated delivery in{' '}
              <Text style={styles.noteBold}>3–7 business days</Text>
            </Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[
          styles.btnBlock,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          <TouchableOpacity style={styles.trackBtn} onPress={goTrack} activeOpacity={0.85}>
            <Text style={styles.trackBtnText}>Track My Order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shopBtn} onPress={goShop} activeOpacity={0.85}>
            <Text style={styles.shopBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.dark },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 32,
  },

  // Checkmark
  circleWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  circleOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  checkIcon: { fontSize: 38, color: COLORS.white, fontWeight: '900' },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  ring1: { width: 130, height: 130 },
  ring2: { width: 158, height: 158, borderColor: 'rgba(34,197,94,0.12)' },

  // Text
  textBlock: { alignItems: 'center', gap: 10, width: '100%' },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  orderNum: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 21,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    width: '100%',
  },
  noteIcon: { fontSize: 20 },
  noteText: { fontSize: 13, color: '#9ca3af', flex: 1 },
  noteBold: { color: COLORS.white, fontWeight: '700' },

  // Buttons
  btnBlock: { width: '100%', gap: 12 },
  trackBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  trackBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  shopBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2e2e2e',
  },
  shopBtnText: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
});
