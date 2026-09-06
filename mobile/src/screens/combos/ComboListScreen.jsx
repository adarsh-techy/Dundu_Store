import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { comboApi } from '../../api/index';
import { COLORS, UPLOADS_URL } from '../../config';
import { formatPrice } from '../../utils/format';
import AppHeader from '../../components/ui/AppHeader';

function getImageUri(src) {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return UPLOADS_URL + (src.startsWith('/') ? src : '/' + src);
}

function ComboCard({ combo, onPress }) {
  const uri = getImageUri(combo.image_url);
  const hasOffer = combo.offer_price && parseFloat(combo.offer_price) > 0;
  const slotCount = combo.slots?.length || 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image */}
      <View style={styles.cardImageWrap}>
        {uri
          ? <Image source={{ uri }} style={styles.cardImage} resizeMode="cover" />
          : (
            <View style={styles.cardImageFallback}>
              <Text style={styles.cardImageFallbackText}>🎀</Text>
            </View>
          )
        }
        {hasOffer && (
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>
              {Math.round(((parseFloat(combo.price) - parseFloat(combo.offer_price)) / parseFloat(combo.price)) * 100)}% OFF
            </Text>
          </View>
        )}
        <View style={styles.comboBadge}>
          <Text style={styles.comboBadgeText}>COMBO</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{combo.name}</Text>

        {/* Slot pills */}
        <View style={styles.slotRow}>
          {(combo.slots || []).slice(0, 3).map((slot, i) => (
            <View key={i} style={styles.slotPill}>
              <Text style={styles.slotPillText} numberOfLines={1}>{slot.slot_label}</Text>
            </View>
          ))}
          {slotCount > 3 && (
            <View style={[styles.slotPill, styles.slotPillMore]}>
              <Text style={styles.slotPillText}>+{slotCount - 3}</Text>
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          {hasOffer ? (
            <>
              <Text style={styles.offerPrice}>{formatPrice(combo.offer_price)}</Text>
              <Text style={styles.mrpPrice}>{formatPrice(combo.price)}</Text>
            </>
          ) : (
            <Text style={styles.offerPrice}>{formatPrice(combo.price)}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.buyBtn} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.buyBtnText}>View Combo →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ComboListScreen() {
  const navigation = useNavigation();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCombos = async () => {
    try {
      const res = await comboApi.list();
      setCombos(res.data?.combos || []);
    } catch (e) {
      console.warn('ComboList fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCombos(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Combo Deals 🎀" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : combos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎀</Text>
          <Text style={styles.emptyTitle}>No Combos Yet</Text>
          <Text style={styles.emptySubtitle}>Check back soon for amazing combo deals!</Text>
        </View>
      ) : (
        <FlatList
          data={combos}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchCombos(); }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerInfo}>
              <Text style={styles.headerInfoText}>
                {combos.length} combo{combos.length !== 1 ? 's' : ''} available
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ComboCard
              combo={item}
              onPress={() => navigation.navigate('ComboDetail', { comboId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff0f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },

  list: { padding: 14, paddingBottom: 100 },

  headerInfo: { marginBottom: 10 },
  headerInfoText: { fontSize: 12, color: '#999', fontWeight: '600' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#f0d6e8',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardImageWrap: { height: 200, width: '100%', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImageFallback: {
    width: '100%', height: '100%',
    backgroundColor: '#fce4f4',
    alignItems: 'center', justifyContent: 'center',
  },
  cardImageFallbackText: { fontSize: 60 },

  saveBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: '#e91e8c',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10,
  },
  saveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  comboBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10,
  },
  comboBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  cardBody: { padding: 14 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, lineHeight: 22 },

  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  slotPill: {
    backgroundColor: '#fce4f4', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#f0b8d8',
  },
  slotPillMore: { backgroundColor: '#f5f5f5', borderColor: '#ddd' },
  slotPillText: { fontSize: 11, fontWeight: '700', color: '#C2167A', maxWidth: 90 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  offerPrice: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  mrpPrice: { fontSize: 15, color: '#aaa', textDecorationLine: 'line-through', fontWeight: '500' },

  buyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 11,
    alignItems: 'center',
  },
  buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 30 },
});
