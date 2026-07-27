import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS, UPLOADS_URL } from '../../config';

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
  themeColor,
}) {
  const activeColor = themeColor || COLORS.primary;
  return (
    <View style={[styles.wrapper, themeColor && { borderBottomColor: themeColor }]}>
      {/* Scrollable category circles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={{ flex: 1 }}
      >
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
              <Text style={[styles.label, isActive && { color: activeColor, fontWeight: '700' }]} numberOfLines={1}>
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
          <Text style={[styles.label, isOfferActive && { color: activeColor, fontWeight: '700' }]}>Offers</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  scroll: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  item: {
    alignItems: 'center',
    width: 68,
    marginRight: 4,
  },

  /* Offers circle */
  offerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  offerIcon: { fontSize: 24 },

  /* Category circle */
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 10,
    color: '#ddd',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
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
