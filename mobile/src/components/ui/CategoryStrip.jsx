import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS, UPLOADS_URL } from '../../config';
import useSettingsStore from '../../store/settings.store';

function getImageUri(src) {
  if (!src) return null;
  const str = typeof src === 'object' ? src.url : src;
  if (!str) return null;
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  return UPLOADS_URL + (str.startsWith('/') ? str : '/' + str);
}

// Active = blue ring matching the web mobile view
const ACTIVE_COLOR = '#3b82f6';

export default function CategoryStrip({
  categories = [],
  activeSlug = null,
  isOfferActive = false,
  onPressCategory,
  onPressOffers,
  filterCount = 0,
  onPressFilter,
  onPressCombo,
  themeColor,
}) {
  const festEnabled = useSettingsStore((s) => s.festivalEnabled);
  const festNavBg   = useSettingsStore((s) => s.festivalNavbarColor);
  const festNavText = useSettingsStore((s) => s.festivalNavbarTextColor);

  const activeColor = themeColor || (festEnabled ? festNavText : COLORS.primary);
  const bgColor     = festEnabled ? festNavBg : '#0d0d0d';

  return (
    <View style={[styles.wrapper, { backgroundColor: bgColor }, themeColor && { borderBottomColor: themeColor }, festEnabled && { borderBottomColor: festNavBg }]}>
      {/* Scrollable category circles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={{ flex: 1 }}
      >
        {/* ── Combo circle — always first ── */}
        {onPressCombo && (
          <TouchableOpacity
            style={styles.item}
            onPress={onPressCombo}
            activeOpacity={0.75}
          >
            <View style={[styles.comboCircle, { borderColor: activeColor }]}>
              <Text style={styles.comboCircleIcon}>🎀</Text>
            </View>
            <Text style={[styles.label, { color: '#fff' }]} numberOfLines={1}>Combos</Text>
          </TouchableOpacity>
        )}

        {/* Dynamic categories */}
        {categories.map((cat) => {
          const isActive = cat.slug === activeSlug;
          const uri = getImageUri(cat.image_url || cat.image);
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.item}
              onPress={() => onPressCategory(cat)}
              activeOpacity={0.75}
            >
              <View style={[styles.circle, isActive && { borderWidth: 2.5, borderColor: activeColor }]}>
                {uri
                  ? <Image source={{ uri }} style={styles.circleImage} resizeMode="cover" />
                  : <View style={styles.circleFallback}>
                      <Text style={[styles.circleLetter, { color: activeColor }]}>{cat.name?.[0]}</Text>
                    </View>
                }
              </View>
              <Text style={[styles.label, { color: '#d1cacaff' }, isActive && { color: activeColor, fontWeight: '800' }]} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Offers circle — last */}
        <TouchableOpacity style={styles.item} onPress={onPressOffers} activeOpacity={0.75}>
          <View style={[styles.offerCircle, { backgroundColor: activeColor }, isOfferActive && { borderColor: activeColor }]}>
            <Text style={styles.offerIcon}>🏷</Text>
          </View>
          <Text style={[styles.label, { color: '#ffffff' }, isOfferActive && { color: activeColor, fontWeight: '800' }]}>Offers</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky filter button on the right */}
      {onPressFilter && (
        <TouchableOpacity
          style={[styles.filterBtn, filterCount > 0 && styles.filterBtnActive]}
          onPress={onPressFilter}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterBtnIcon, filterCount > 0 && styles.filterBtnIconActive]}>
            {filterCount > 0 ? `⧩ ${filterCount}` : '⧩'}
          </Text>
          <Text style={[styles.filterBtnLabel, filterCount > 0 && styles.filterBtnLabelActive]}>
            Filter
          </Text>
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 10,
    backgroundColor: '#040d04',
    borderBottomWidth: 1,
    borderBottomColor: '#163016',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  item: {
    alignItems: 'center',
    marginRight: 14,
    width: 62,
  },

  /* Offers circle */
  offerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
  },
  offerIcon: { fontSize: 24 },

  /* Combo circle */
  comboCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a0a2a',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  comboCircleIcon: { fontSize: 26 },

  /* Category circle */
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#2e2e2e',
  },
  circleImage: { width: '100%', height: '100%' },
  circleFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a0a12',
  },
  circleLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },

  /* Active ring */
  activeRing: {
    borderWidth: 2.5,
    borderColor: ACTIVE_COLOR,
    shadowColor: ACTIVE_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },

  label: {
    fontSize: 11,
    color: '#ffffff',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },

  /* Filter button */
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginLeft: 4,
    flexShrink: 0,
    flexDirection: 'column',
    minWidth: 52,
  },
  filterBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#2a0a1a',
  },
  filterBtnIcon: {
    fontSize: 15,
    color: '#aaa',
    fontWeight: '700',
  },
  filterBtnIconActive: {
    color: COLORS.primary,
  },
  filterBtnLabel: {
    fontSize: 9,
    color: '#888',
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  filterBtnLabelActive: {
    color: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0d0d0d',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
