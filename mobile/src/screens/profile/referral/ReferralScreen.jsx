import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { referralApi } from '../../../api/index';
import { COLORS } from '../../../config';
import AppHeader from '../../../components/ui/AppHeader';
import { formatDate } from '../../../utils/format';
import useAuthStore from '../../../store/auth.store';
import useLoginPromptStore from '../../../store/loginPrompt.store';

export default function ReferralScreen() {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showPrompt = useLoginPromptStore((s) => s.show);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      showPrompt('Login to access your referral program and earn rewards');
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }
    fetchReferral();
  }, [isAuthenticated]);

  async function fetchReferral() {
    setLoading(true);
    try {
      const res = await referralApi.getInfo();
      setData(res.data || res);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load referral info.');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Shop at Dundu and get exclusive discounts! Use my referral code: ${data.referral_code}\n\nDownload the Dundu app and enter my code at signup.`,
        title: 'Invite to Dundu',
      });
    } catch (err) {
      // user cancelled share
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <AppHeader title="Refer & Earn" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const pendingRewards = data?.pending_rewards || [];
  const usedRewards = data?.used_rewards || [];

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Refer & Earn" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>Invite Friends, Earn Rewards</Text>
          <Text style={styles.heroSubtitle}>
            Share your code and get a discount when your friend makes their first order.
          </Text>
        </View>

        {/* Referral code card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <Text style={styles.codeValue}>{data?.referral_code || '—'}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤  Share Code</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{data?.referred_count ?? 0}</Text>
            <Text style={styles.statLabel}>Friends Referred</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{pendingRewards.length}</Text>
            <Text style={styles.statLabel}>Rewards Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{usedRewards.length}</Text>
            <Text style={styles.statLabel}>Rewards Used</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.stepsList}>
            {[
              { icon: '📲', step: '1', text: 'Share your referral code with a friend.' },
              { icon: '🛍', step: '2', text: 'Friend signs up using your code.' },
              { icon: '✅', step: '3', text: 'Friend places their first order.' },
              { icon: '🎉', step: '4', text: 'You both get exclusive discounts!' },
            ].map((item) => (
              <View key={item.step} style={styles.stepRow}>
                <View style={styles.stepIconCircle}>
                  <Text style={styles.stepIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pending rewards */}
        {pendingRewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Rewards</Text>
            {pendingRewards.map((r) => (
              <View key={r.id} style={[styles.rewardCard, styles.rewardCardPending]}>
                <View style={styles.rewardLeft}>
                  <Text style={styles.rewardIcon}>🏷</Text>
                  <View>
                    <Text style={styles.rewardType}>{formatRewardType(r.reward_type)}</Text>
                    <Text style={styles.rewardDate}>Earned {formatDate(r.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardBadgeText}>{r.discount_percent}% OFF</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Used rewards */}
        {usedRewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Used Rewards</Text>
            {usedRewards.map((r) => (
              <View key={r.id} style={[styles.rewardCard, styles.rewardCardUsed]}>
                <View style={styles.rewardLeft}>
                  <Text style={styles.rewardIcon}>✅</Text>
                  <View>
                    <Text style={[styles.rewardType, styles.rewardTypeUsed]}>
                      {formatRewardType(r.reward_type)}
                    </Text>
                    <Text style={styles.rewardDate}>Used {formatDate(r.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.rewardBadgeUsed}>
                  <Text style={styles.rewardBadgeUsedText}>{r.discount_percent}% OFF</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {pendingRewards.length === 0 && usedRewards.length === 0 && (
          <View style={styles.emptyRewards}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={styles.emptyTitle}>No rewards yet</Text>
            <Text style={styles.emptySubtitle}>
              Start referring friends to earn your first reward!
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatRewardType(type) {
  if (!type) return 'Referral Reward';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    width: 70,
  },
  backText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    paddingBottom: 20,
  },
  heroBanner: {
    backgroundColor: COLORS.primary,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  codeCard: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
    marginBottom: 20,
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  shareBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  stepsList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepIcon: {
    fontSize: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  rewardCardPending: {
    backgroundColor: '#FFF5FB',
    borderColor: COLORS.primary + '40',
  },
  rewardCardUsed: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rewardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  rewardType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  rewardTypeUsed: {
    color: COLORS.textSecondary,
  },
  rewardDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rewardBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rewardBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  rewardBadgeUsed: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rewardBadgeUsedText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyRewards: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
