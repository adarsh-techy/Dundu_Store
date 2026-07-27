import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, UPLOADS_URL } from '../../config';
import { formatPrice } from '../../utils/format';
import { userApi } from '../../api/index';
import useAuthStore from '../../store/auth.store';
import useLoginPromptStore from '../../store/loginPrompt.store';
import useSettingsStore from '../../store/settings.store';

function getImageUri(src) {
  if (!src) return null;
  const str = typeof src === 'object' ? src.url : src;
  if (!str) return null;
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  return UPLOADS_URL + (str.startsWith('/') ? str : '/' + str);
}

export default function ProductCard({ product, onPress, style, onWishlistRemove }) {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const showPrompt = useLoginPromptStore((s) => s.show);
  const [wishlisted, setWishlisted] = useState(product?.is_wishlisted || false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const offerBadgeColor = useSettingsStore((s) => s.offerBadgeColor);
  const offerBadgeTextColor = useSettingsStore((s) => s.offerBadgeTextColor);

  if (!product) return null;

  const imageUri = getImageUri(product.primary_image || product.image || product.images?.[0]);
  const hasOffer = product.offer_price && parseFloat(product.offer_price) < parseFloat(product.price);

  function handlePress() {
    if (onPress) {
      onPress(product);
    } else {
      navigation.navigate('ProductDetail', { productId: product.id });
    }
  }

  async function handleWishlist() {
    if (onWishlistRemove) {
      onWishlistRemove(product);
      return;
    }
    if (!isAuthenticated) {
      showPrompt('Login to save products to your wishlist');
      return;
    }
    setWishlistLoading(true);
    try {
      await userApi.toggleWishlist(product.id);
      setWishlisted((prev) => !prev);
    } catch (err) {
      Alert.alert('Error', 'Could not update wishlist.');
    } finally {
      setWishlistLoading(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>👗</Text>
          </View>
        )}
        {hasOffer && (
          <View style={[
            styles.offerBadge,
            product.is_offer_product ? styles.offerBadgeSpecial : { backgroundColor: offerBadgeColor },
          ]}>
            <Text style={[
              styles.offerBadgeText,
              product.is_offer_product ? styles.offerBadgeTextSpecial : { color: offerBadgeTextColor },
            ]}>
              ⚡ {Math.round(((product.price - product.offer_price) / product.price) * 100)}% OFF
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={handleWishlist}
          disabled={wishlistLoading}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.wishlistIcon}>{wishlisted ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {(product.brand_name || product.brand) && (
          <Text style={styles.brand} numberOfLines={1}>
            {product.brand_name || product.brand}
          </Text>
        )}
        <View style={styles.priceRow}>
          <View style={styles.priceGroup}>
            {hasOffer ? (
              <>
                <Text style={styles.offerPrice}>{formatPrice(product.offer_price)}</Text>
                <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>
              </>
            ) : (
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
            )}
          </View>
          <Text style={styles.ratingNum}>
            {(parseFloat(product.avg_rating) > 0
              ? parseFloat(product.avg_rating)
              : parseFloat(product.default_rating) > 0
                ? parseFloat(product.default_rating)
                : 4.5
            ).toFixed(1)} ★
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    margin: 6,
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 0.8,
    backgroundColor: COLORS.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  imagePlaceholderText: {
    fontSize: 36,
  },
  offerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  offerBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  offerBadgeSpecial: {
    backgroundColor: '#000',
    shadowColor: '#00e676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  offerBadgeTextSpecial: {
    color: '#00e676',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  wishlistIcon: {
    fontSize: 16,
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 2,
  },
  brand: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F6A800',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  offerPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
});
