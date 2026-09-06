import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { formatPrice } from '../../utils/format';

import useCartStore from '../../store/cart.store';
import useFreeShippingStore from '../../store/freeShipping.store';

const DEFAULT_THRESHOLD = 500;

export default function FreeShippingModal({
  visible,
  total: propTotal,
  threshold = DEFAULT_THRESHOLD,
  onClose,
}) {
  const navigation = useNavigation();
  const storeIsOpen = useFreeShippingStore((s) => s.isOpen);
  const storeCustomTotal = useFreeShippingStore((s) => s.customTotal);
  const storeCloseModal = useFreeShippingStore((s) => s.closeModal);
  const cartTotal = useCartStore((s) => s.total);
  const cartItems = useCartStore((s) => s.items);

  const calculatedTotalFromItems = React.useMemo(() => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) return 0;
    return cartItems.reduce((sum, item) => {
      const oPrice = item.offer_price ? parseFloat(item.offer_price) : 0;
      const rPrice = item.price ? parseFloat(item.price) : (item.product_price ? parseFloat(item.product_price) : 0);
      const validPrice = (oPrice > 0) ? oPrice : rPrice;
      const qty = parseInt(item.quantity || 1, 10);
      return sum + (validPrice * qty);
    }, 0);
  }, [cartItems]);

  const effectiveCartTotal = storeCustomTotal !== null && storeCustomTotal !== undefined
    ? parseFloat(storeCustomTotal) || 0
    : Math.max(parseFloat(cartTotal) || 0, calculatedTotalFromItems);

  const isVisible = visible !== undefined ? visible : storeIsOpen;
  const currentTotal = propTotal !== undefined ? parseFloat(propTotal) || 0 : effectiveCartTotal;

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isUnlocked = currentTotal >= threshold;
  const neededAmount = Math.max(0, threshold - currentTotal);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      storeCloseModal();
    }
  };

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleContinueShopping = () => {
    handleClose();
    navigation.navigate('MainTabs', { screen: 'ShopTab' });
  };

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Icon Badge */}
          <View style={[styles.iconCircle, isUnlocked && styles.iconCircleUnlocked]}>
            <Text style={styles.iconEmoji}>{isUnlocked ? '🎉' : '🚚'}</Text>
          </View>

          {/* Simple Title */}
          <Text style={styles.title}>
            {isUnlocked ? (
              '🎉 Free Delivery Unlocked!'
            ) : (
              <Text>
                Add <Text style={styles.highlightAmount}>{formatPrice(neededAmount)}</Text> for Free Delivery
              </Text>
            )}
          </Text>

          {/* Simple Subtitle */}
          <Text style={styles.subtitle}>
            {isUnlocked ? (
              'Your order qualifies for 100% free express delivery!'
            ) : (
              <Text>
                Add items worth <Text style={styles.highlightAmountSub}>{formatPrice(neededAmount)}</Text> more to skip the ₹50 delivery fee.
              </Text>
            )}
          </Text>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, isUnlocked && styles.primaryBtnUnlocked]}
            onPress={handleContinueShopping}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isUnlocked ? 'Continue to Checkout →' : `+ Add ${formatPrice(neededAmount)} More Items`}
            </Text>
          </TouchableOpacity>

          {/* Secondary Link */}
          {!isUnlocked && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Continue with ₹50 Delivery Fee</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircleUnlocked: {
    backgroundColor: '#d1fae5',
  },
  iconEmoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  highlightAmount: {
    color: '#059669',
    fontWeight: '900',
    fontSize: 19,
  },
  highlightAmountSub: {
    color: '#059669',
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnUnlocked: {
    backgroundColor: '#059669',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 4,
  },
  secondaryBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
});
