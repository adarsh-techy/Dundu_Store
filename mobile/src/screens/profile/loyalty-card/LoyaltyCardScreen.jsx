import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/ui/AppHeader';
import { loyaltyApi } from '../../../api/index';
import { COLORS } from '../../../config';

const SCREEN_WIDTH = Dimensions.get('window').width;

const HOW_TO_EARN = [
  { icon: '🛍️', title: 'Shop Online', desc: 'Earn 20 pts on every ₹500 spent via the app.' },
  { icon: '🏪', title: 'In-Store Purchase', desc: 'Earn 20 pts on every ₹500 spent at our store.' },
  { icon: '🎁', title: 'Redeem Reward', desc: 'Every 200 pts = ₹200 off on your next purchase.' },
  { icon: '♾️', title: 'No Expiry', desc: 'Your points never expire. Keep earning!' },
];

export default function LoyaltyCardScreen() {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loyaltyApi.myCard()
      .then((res) => setCard(res?.card || res?.data?.card || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <AppHeader title="My Loyalty Card" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <AppHeader title="My Loyalty Card" showBack />
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🃏</Text>
          <Text style={styles.emptyTitle}>No Loyalty Card Yet</Text>
          <Text style={styles.emptySub}>Make a purchase to get your loyalty card!</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pointsAfterRedeem = card.points % 200;
  const redeemableCount = Math.floor(card.points / 200);
  const progress = Math.min(100, Math.round((pointsAfterRedeem / 200) * 100));
  const memberYear = card.created_at
    ? new Date(card.created_at).getFullYear()
    : new Date().getFullYear();
  const bgColor = '#0a1628';

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="My Loyalty Card" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── ATM Card ── */}
        <View style={styles.cardWrap}>
          <View style={styles.lcCard}>
            {/* Gradient layers */}
            <View style={styles.lcGradBase} />
            <View style={styles.lcGradMid} />
            <View style={styles.lcGradTop} />
            <View style={styles.lcShine} />
            <View style={styles.lcGlowTR} />
            <View style={styles.lcGlowBL} />

            {/* Row 1 */}
            <View style={styles.lcRow1}>
              <Text style={styles.lcBrand}>DUNDU</Text>
              <Text style={styles.lcContactless}>📶</Text>
            </View>

            {/* Row 2: Chip + Points */}
            <View style={styles.lcRow2}>
              <View style={styles.lcChip}>
                <View style={styles.lcChipInner}>
                  <View style={styles.lcChipQ1} />
                  <View style={styles.lcChipQ2} />
                  <View style={styles.lcChipQ3} />
                  <View style={styles.lcChipQ4} />
                </View>
              </View>
              <View style={styles.lcPointsBox}>
                <Text style={styles.lcPointsLabel}>Points Balance</Text>
                <Text style={styles.lcPointsValue}>
                  <Text style={styles.lcStar}>★ </Text>
                  {card.points}
                </Text>
              </View>
            </View>

            {/* Row 3: Name + Since */}
            <View style={styles.lcRow3}>
              <View>
                <Text style={styles.lcMemberLabel}>MEMBER</Text>
                <Text style={styles.lcMemberName}>
                  {(card.name || 'DUNDU MEMBER').slice(0, 20).toUpperCase()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.lcMemberLabel}>SINCE</Text>
                <Text style={styles.lcMemberName}>{memberYear}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Redeemable banner */}
        {redeemableCount > 0 && (
          <View style={styles.redeemBanner}>
            <Text style={styles.redeemIcon}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.redeemTitle}>₹{redeemableCount * 200} Redeemable Now!</Text>
              <Text style={styles.redeemSub}>Show this card at billing counter to redeem</Text>
            </View>
          </View>
        )}

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLeft}>
              {pointsAfterRedeem} / 200 pts toward next reward
            </Text>
            <Text style={styles.progressRight}>{200 - pointsAfterRedeem} more</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressHint}>Earn 20 pts every ₹500 spent · 200 pts = ₹200 off</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>⭐ {card.points}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statValue}>🎁 {redeemableCount}</Text>
            <Text style={styles.statLabel}>Rewards Ready</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>💰 ₹{redeemableCount * 200}</Text>
            <Text style={styles.statLabel}>Redeemable</Text>
          </View>
        </View>

        {/* How to earn */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        {HOW_TO_EARN.map((item, i) => (
          <View key={i} style={styles.howCard}>
            <Text style={styles.howIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.howTitle}>{item.title}</Text>
              <Text style={styles.howDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 90 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  /* Card wrap */
  cardWrap: { marginTop: 16, marginBottom: 14 },
  lcCard: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 200,
    padding: 22,
    shadowColor: '#1565c0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  lcGradBase: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a1628' },
  lcGradMid:  { ...StyleSheet.absoluteFillObject, backgroundColor: '#1565c0', opacity: 0.55 },
  lcGradTop:  { ...StyleSheet.absoluteFillObject, backgroundColor: '#42a5f5', opacity: 0.25 },
  lcShine:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)' },
  lcGlowTR: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(224,244,255,0.22)',
  },
  lcGlowBL: {
    position: 'absolute', bottom: -60, left: -30,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(13,45,94,0.55)',
  },

  lcRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  lcBrand: {
    fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 5,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  lcContactless: { fontSize: 20, opacity: 0.7, transform: [{ rotate: '90deg' }] },

  lcRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  lcChip: {
    width: 52, height: 40, borderRadius: 8, backgroundColor: '#f5c518',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 6, elevation: 6,
  },
  lcChipInner: {
    width: 36, height: 26, borderWidth: 1.5,
    borderColor: 'rgba(160,100,0,0.55)', borderRadius: 4,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  lcChipQ1: { width: '50%', height: '50%', borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(160,100,0,0.4)' },
  lcChipQ2: { width: '50%', height: '50%', borderBottomWidth: 1, borderColor: 'rgba(160,100,0,0.4)' },
  lcChipQ3: { width: '50%', height: '50%', borderRightWidth: 1, borderColor: 'rgba(160,100,0,0.4)' },
  lcChipQ4: { width: '50%', height: '50%' },

  lcPointsBox: { alignItems: 'flex-end' },
  lcPointsLabel: { fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  lcPointsValue: { fontSize: 38, fontWeight: '900', color: '#ffd700', lineHeight: 42 },
  lcStar: { fontSize: 20, color: '#ffd700' },

  lcRow3: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  lcMemberLabel: { fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 },
  lcMemberName: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 1.5 },

  /* Redeemable */
  redeemBanner: {
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#052e16', borderWidth: 1, borderColor: '#166534', marginBottom: 12,
  },
  redeemIcon: { fontSize: 22 },
  redeemTitle: { fontSize: 14, fontWeight: '700', color: '#86efac' },
  redeemSub: { fontSize: 11, color: '#4ade80', marginTop: 2 },

  /* Progress */
  progressCard: {
    borderRadius: 14, padding: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLeft: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  progressRight: { fontSize: 12, color: COLORS.textSecondary },
  progressBg: { height: 10, borderRadius: 5, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 8 },
  progressFill: {
    height: '100%', borderRadius: 5, backgroundColor: '#42a5f5',
    shadowColor: '#42a5f5', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6,
  },
  progressHint: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  /* Stats */
  statsRow: {
    flexDirection: 'row', borderRadius: 14, overflow: 'hidden',
    marginBottom: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  /* How to earn */
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  howCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  howIcon: { fontSize: 26 },
  howTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  howDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
