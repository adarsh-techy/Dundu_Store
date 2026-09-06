import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { formatPrice } from '../../utils/format';

import FreeShippingModal from './FreeShippingModal';

const DEFAULT_THRESHOLD = 500;

export default function FreeShippingNudgeBanner({
  total = 0,
  threshold = DEFAULT_THRESHOLD,
  onShopMore,
  autoPopup = false,
  style,
}) {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = React.useState(false);
  const hasAutoPopped = React.useRef(false);
  const currentTotal = parseFloat(total) || 0;

  if (currentTotal <= 0) return null;

  const isUnlocked = currentTotal >= threshold;
  const neededAmount = Math.max(0, threshold - currentTotal);
  const percentage = Math.min(100, Math.round((currentTotal / threshold) * 100));

  React.useEffect(() => {
    if (autoPopup && !isUnlocked && currentTotal > 0 && !hasAutoPopped.current) {
      hasAutoPopped.current = true;
      const timer = setTimeout(() => setModalVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [autoPopup, isUnlocked, currentTotal]);

  const handleShopMore = () => {
    if (onShopMore) {
      onShopMore();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, isUnlocked ? styles.unlockedContainer : styles.lockedContainer, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        {/* Top Text Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.iconText}>{isUnlocked ? '🎉' : '🚚'}</Text>
            <Text style={[styles.titleText, isUnlocked && styles.unlockedTitleText]}>
              {isUnlocked ? (
                'You unlocked FREE Delivery!'
              ) : (
                <>
                  Add <Text style={styles.highlightText}>{formatPrice(neededAmount)}</Text> more for <Text style={styles.boldText}>FREE Delivery</Text>
                </>
              )}
            </Text>
          </View>

          {!isUnlocked && (
            <TouchableOpacity style={styles.shopMoreBtn} onPress={handleShopMore} activeOpacity={0.8}>
              <Text style={styles.shopMoreBtnText}>+ Add Items</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Animated Visual Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${percentage}%` }, isUnlocked && styles.unlockedProgressFill]} />
        </View>

        {/* Progress Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerSubText}>
            {isUnlocked ? 'FREE Delivery Applied to Order' : `Spent ${formatPrice(currentTotal)} of ${formatPrice(threshold)}`}
          </Text>
          <Text style={[styles.percentageBadge, isUnlocked && styles.unlockedPercentageBadge]}>
            {percentage}%
          </Text>
        </View>
      </TouchableOpacity>

      {/* Classic Professional Free Shipping Goal Popup Modal */}
      <FreeShippingModal
        visible={modalVisible}
        total={currentTotal}
        threshold={threshold}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  lockedContainer: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
    shadowColor: '#10b981',
  },
  unlockedContainer: {
    backgroundColor: '#dcfce7',
    borderColor: '#059669',
    shadowColor: '#059669',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  iconText: {
    fontSize: 18,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
    lineHeight: 18,
    flexShrink: 1,
  },
  unlockedTitleText: {
    fontWeight: '800',
    color: '#047857',
  },
  highlightText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#059669',
  },
  boldText: {
    fontWeight: '800',
    color: '#047857',
  },
  shopMoreBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  shopMoreBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
  },
  unlockedProgressFill: {
    backgroundColor: '#059669',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSubText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  percentageBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  unlockedPercentageBadge: {
    color: '#047857',
  },
});
