import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Animated,
  TextInput,
} from 'react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { productApi, userApi, categoryApi } from '../../../api/index';
import useCartStore from '../../../store/cart.store';
import useAuthStore from '../../../store/auth.store';
import useSettingsStore from '../../../store/settings.store';
import useRequireAuth from '../../../hooks/useRequireAuth';
import { COLORS, UPLOADS_URL } from '../../../config';
import { formatPrice } from '../../../utils/format';
import ProductCard from '../../../components/product/ProductCard';
import AppHeader from '../../../components/ui/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getImageUri(src) {
  if (!src) return null;
  // src can be a string URL or an image object {url, ...}
  const str = typeof src === 'object' ? src.url : src;
  if (!str) return null;
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  return UPLOADS_URL + (str.startsWith('/') ? str : '/' + str);
}

function StarRating({ rating }) {
  const n = Math.round(Number(rating) || 0);
  return <Text style={styles.stars}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</Text>;
}

function LightboxViewer({ uri, onClose }) {
  const scale     = React.useRef(new Animated.Value(1)).current;
  const scaleBase = React.useRef(1);

  const onPinchEvent = Animated.event([{ nativeEvent: { scale } }], { useNativeDriver: true });

  const onPinchStateChange = (e) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      scaleBase.current *= e.nativeEvent.scale;
      const next = Math.min(Math.max(scaleBase.current, 1), 5);
      scaleBase.current = next;
      scale.setValue(next);
    }
  };

  return (
    <View style={styles.lightboxBackdrop}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <PinchGestureHandler onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange}>
        <Animated.Image
          source={{ uri }}
          style={[styles.lightboxImage, { transform: [{ scale }] }]}
          resizeMode="contain"
        />
      </PinchGestureHandler>
      <TouchableOpacity style={styles.lightboxClose} onPress={onClose}>
        <Text style={styles.lightboxCloseText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = route.params;

  const addItem = useCartStore((s) => s.addItem);
  const offerBadgeColor = useSettingsStore((s) => s.offerBadgeColor);
  const { requireAuth } = useRequireAuth();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [lightbox, setLightbox] = useState(null); // uri string when open
  const [sizeChartUrl, setSizeChartUrl] = useState(null);
  const [sizeChartData, setSizeChartData] = useState(null); // table { headers, rows }
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewImage, setReviewImage] = useState(null);

  useEffect(() => {
    fetchData();
  }, [productId]);

  async function fetchData() {
    setLoading(true);
    setImgIndex(0);
    try {
      const [prodRes, relatedRes, reviewsRes] = await Promise.all([
        productApi.getOne(productId),
        productApi.getRelated(productId).catch(() => ({ products: [] })),
        productApi.getReviews(productId).catch(() => ({ reviews: [] })),
      ]);

      const prod = prodRes.product || prodRes;
      setProduct(prod);
      setWishlisted(prod.is_wishlisted || false);
      setRelated(relatedRes.products || []);
      setReviews(reviewsRes.reviews || []);

      // Fetch size chart for this product's category
      if (prod.category_id) {
        categoryApi.getSizeChart(prod.category_id)
          .then((r) => {
            setSizeChartUrl(r.size_chart_image || null);
            setSizeChartData(r.size_chart_data || null);
          })
          .catch(() => { setSizeChartUrl(null); setSizeChartData(null); });
      }

      // Auto-select first variant
      const variants = prod.variants || [];
      if (variants.length > 0) {
        setSelectedVariant(variants[0]);
        setSelectedSize(variants[0].size || null);
        setSelectedColor(variants[0].color || null);
      }
    } catch {
      Alert.alert('Error', 'Failed to load product details.');
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' });
    } finally {
      setLoading(false);
    }
  }

  // When size changes, pick first variant that matches size (keep color if possible)
  function onSizeSelect(size) {
    setSelectedSize(size);
    const variants = product?.variants || [];
    const match = variants.find((v) => v.size === size && v.color === selectedColor)
      || variants.find((v) => v.size === size);
    if (match) {
      setSelectedVariant(match);
      setSelectedColor(match.color);
    }
  }

  // When color changes, keep current size if it has stock in new color, else pick first in-stock
  function onColorSelect(color) {
    setSelectedColor(color);
    setImgIndex(0);
    const variants = product?.variants || [];
    const match = variants.find((v) => v.color === color && v.size === selectedSize && (v.stock ?? 0) > 0)
      || variants.find((v) => v.color === color && (v.stock ?? 0) > 0);
    if (match) {
      setSelectedVariant(match);
      setSelectedSize(match.size);
    } else {
      setSelectedVariant(null);
      setSelectedSize(null);
    }
  }

  async function handleAddToCart() {
    requireAuth(async () => {
      const variants = product?.variants || [];
      if (variants.length > 0 && !selectedVariant) {
        Alert.alert('Select Options', 'Please select size/colour.');
        return;
      }
      setCartLoading(true);
      try {
        await addItem({
          product_id: product.id,
          variant_id: selectedVariant?.id || null,
          quantity: 1,
        });
        // Show professional popup instead of Alert
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 2500);
      } catch (err) {
        Alert.alert('Error', err?.message || 'Failed to add to cart.');
      } finally {
        setCartLoading(false);
      }
    }, 'Login to add items to your cart');
  }

  function handleBuyNow() {
    requireAuth(() => {
      const variants = product?.variants || [];
      if (variants.length > 0 && !selectedVariant) {
        Alert.alert('Select Options', 'Please select size/colour.');
        return;
      }
      navigation.navigate('Checkout', {
        buyNow: {
          product_id: product.id,
          product_name: product.name,
          image: (typeof product.images?.[0] === 'object' ? product.images[0].url : product.images?.[0]) || product.primary_image || product.image || null,
          price: (() => {
            // offer 0 / "0.00" means no offer — fall through to the regular price
            const pick = (offer, price) => (Number(offer) > 0 ? Number(offer) : Number(price) || 0);
            return selectedVariant?.price ? pick(selectedVariant.offer_price, selectedVariant.price) : pick(product.offer_price, product.price);
          })(),
          variant_id: selectedVariant?.id || null,
          size: selectedSize,
          color: selectedColor,
          quantity: 1,
        },
      });
    }, 'Login to buy this product');
  }

  function handleWishlist() {
    requireAuth(async () => {
      try {
        await userApi.toggleWishlist(product.id);
        setWishlisted((p) => !p);
      } catch {
        Alert.alert('Error', 'Could not update wishlist.');
      }
    }, 'Login to save products to your wishlist');
  }

  function openReviewModal() {
    requireAuth(async () => {
      try {
        const res = await productApi.canReview(productId);
        if (!res.can_review) {
          Alert.alert(
            'Not Eligible',
            res.message || 'You can only review products you have purchased and received.',
          );
          return;
        }
        setReviewRating(5);
        setReviewText('');
        setReviewImage(null);
        setShowReviewModal(true);
      } catch {
        Alert.alert('Not Eligible', 'You can only review products you have purchased and received.');
      }
    }, 'Login to write a review');
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReviewImage(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  }

  async function submitReview() {
    if (reviewRating < 1) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    setReviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('rating', reviewRating);
      fd.append('review', reviewText.trim());
      if (reviewImage) {
        const uri = reviewImage.uri;
        const name = reviewImage.fileName || uri.substring(uri.lastIndexOf('/') + 1) || 'photo.jpg';
        const type = reviewImage.mimeType || 'image/jpeg';
        fd.append('image', { uri, name, type });
      }

      await productApi.addReview(productId, fd);
      setShowReviewModal(false);
      setReviewImage(null);
      // Refresh reviews
      const res = await productApi.getReviews(productId).catch(() => ({ reviews: [] }));
      setReviews(res.reviews || []);
      Alert.alert('Thank You!', 'Your review has been submitted.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) return null;

  /* ── Derived values ── */
  const allImages = (product.images?.length > 0)
    ? product.images
    : [product.primary_image || product.image].filter(Boolean);
  const colorImages = selectedColor
    ? allImages.filter((img) => img && img.color === selectedColor)
    : [];
  const images = colorImages.length > 0 ? colorImages : allImages;

  const variants = product.variants || [];
  const isWomens = product.gender === 'Female';
  const sizes = isWomens
    ? ['XS', 'S', 'M', 'L', 'XL']
    : [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  // Stock: if variant selected use its stock, else product-level stock
  const stockQty = selectedVariant ? (selectedVariant.stock ?? product.stock ?? 0) : (product.stock ?? 0);
  const inStock = stockQty > 0;

  const hasOffer = product.offer_price && parseFloat(product.offer_price) < parseFloat(product.price);
  const discountPct = hasOffer
    ? Math.round(((product.price - product.offer_price) / product.price) * 100)
    : 0;

  const brandName = product.brand_name || product.brand || '';

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader
        showBack
        title="Back"
        rightComponent={
          <Image
            source={require('../../../../assets/dundulogo.png')}
            style={{ height: 32, width: 110 }}
            resizeMode="contain"
          />
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── Image gallery ── */}
        <View style={styles.gallery}>
          <ScrollView
            key={selectedColor || 'all'}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
            }
          >
            {images.length > 0
              ? images.map((img, i) => {
                  const uri = getImageUri(img);
                  return (
                    <TouchableOpacity key={i} style={styles.imgSlide} activeOpacity={0.95}
                      onPress={() => uri && setLightbox(uri)}>
                      {uri
                        ? <Image source={{ uri }} style={styles.img} resizeMode="contain" />
                        : <View style={styles.imgPlaceholder}><Text style={{ fontSize: 60 }}>👗</Text></View>
                      }
                    </TouchableOpacity>
                  );
                })
              : (
                <View style={styles.imgSlide}>
                  <View style={styles.imgPlaceholder}><Text style={{ fontSize: 60 }}>👗</Text></View>
                </View>
              )
            }
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.dotsRow}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Product info ── */}
        <View style={styles.body}>

          {/* Brand + name */}
          {brandName ? <Text style={styles.brand}>{brandName}</Text> : null}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { flex: 1 }]}>{product.name}</Text>
            <Text style={styles.detailRating}>
              {(parseFloat(product.avg_rating) > 0 ? parseFloat(product.avg_rating) : parseFloat(product.default_rating) > 0 ? parseFloat(product.default_rating) : 4.5).toFixed(1)} ★
            </Text>
          </View>

          {/* Price row */}
          <View style={styles.priceRow}>
            {hasOffer ? (
              <>
                <Text style={styles.offerPrice}>{formatPrice(product.offer_price)}</Text>
                <Text style={styles.origPrice}>{formatPrice(product.price)}</Text>
                <View style={styles.discBadge}>
                  <Text style={[styles.discBadgeText, { color: offerBadgeColor }]}>{discountPct}% OFF</Text>
                </View>
              </>
            ) : (
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
            )}
          </View>

          {/* Stock */}
          <View style={[styles.stockBadge, !inStock && styles.stockBadgeOut]}>
            <Text style={[styles.stockText, !inStock && styles.stockTextOut]}>
              {inStock ? (stockQty <= 5 ? `Only ${stockQty} left!` : 'In Stock') : 'Out of Stock'}
            </Text>
          </View>

          {/* Size selector */}
          {sizes.length > 0 && (
            <View style={styles.selectorBlock}>
              {/* Size label row with Size Chart button */}
              <View style={styles.selectorLabelRow}>
                <Text style={styles.selectorLabel}>
                  Size{selectedSize ? `: ${selectedSize}` : ''}
                </Text>
                {(sizeChartData || sizeChartUrl) && (
                  <TouchableOpacity
                    style={styles.sizeChartBtn}
                    onPress={() => setShowSizeChart(true)}
                  >
                    <Text style={styles.sizeChartBtnText}>📐 Size Chart</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sizes.map((sz) => {
                  const hasStock = selectedColor
                    ? variants.some((v) => v.size === sz && v.color === selectedColor && (v.stock ?? 0) > 0)
                    : variants.some((v) => v.size === sz && (v.stock ?? 0) > 0);
                  const active = selectedSize === sz;
                  return (
                    <TouchableOpacity
                      key={sz}
                      style={[
                        styles.sizeChip,
                        active && styles.sizeChipActive,
                        !hasStock && styles.sizeChipOOS,
                      ]}
                      onPress={() => hasStock && onSizeSelect(sz)}
                    >
                      <Text style={[styles.sizeChipText, active && styles.sizeChipTextActive]}>
                        {sz}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Color selector */}
          {colors.length > 0 && (
            <View style={styles.selectorBlock}>
              <Text style={styles.selectorLabel}>
                Colour{selectedColor ? `: ${selectedColor}` : ''}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {colors.map((col) => {
                  const active = selectedColor === col;
                  const bgColor = col.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={col}
                      style={[
                        styles.colorDot,
                        { backgroundColor: bgColor },
                        active && styles.colorDotActive,
                        (bgColor === 'white' || bgColor === '#fff' || bgColor === '#ffffff') && styles.colorDotWhite,
                      ]}
                      onPress={() => onColorSelect(col)}
                    >
                      {active && <Text style={styles.colorCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Add to Cart + Buy Now */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.cartBtn, (!inStock || cartLoading) && styles.actionBtnDisabled]}
              onPress={handleAddToCart}
              disabled={!inStock || cartLoading}
            >
              {cartLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.cartBtnText}>{inStock ? '🛒  Add to Cart' : 'Out of Stock'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buyBtn, (!inStock || buyLoading) && styles.actionBtnDisabled]}
              onPress={handleBuyNow}
              disabled={!inStock || buyLoading}
            >
              {buyLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.buyBtnText}>{inStock ? '⚡  Buy Now' : 'Out of Stock'}</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </View>
          ) : null}

          {/* Details table */}
          {(product.material || product.type || product.gender || product.age_group || product.sku) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              {[
                ['Material', product.material],
                ['Type', product.type],
                ['Gender', product.gender],
                ['Age Group', product.age_group],
                ['SKU', product.sku],
                ['Category', product.category_name],
              ].filter(([, v]) => v).map(([k, v]) => (
                <View key={k} style={styles.detailRow}>
                  <Text style={styles.detailKey}>{k}</Text>
                  <Text style={styles.detailVal}>{v}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewHeader}>
              <Text style={styles.sectionTitle}>
                Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
                <Text style={{ color: '#facc15' }}>
                  {`  ★ ${(parseFloat(product.avg_rating) > 0 ? parseFloat(product.avg_rating) : parseFloat(product.default_rating) > 0 ? parseFloat(product.default_rating) : 4.5).toFixed(1)}`}
                </Text>
              </Text>
              <TouchableOpacity style={styles.writeReviewBtn} onPress={openReviewModal}>
                <Text style={styles.writeReviewBtnText}>✏️  Write a Review</Text>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 && (
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
            )}

            {reviews.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewName}>{r.user_name || 'Customer'}</Text>
                  <StarRating rating={r.rating} />
                </View>
                {r.review || r.comment
                  ? <Text style={styles.reviewText}>{r.review || r.comment}</Text>
                  : null
                }
                {r.image_url && (
                  <TouchableOpacity onPress={() => setLightbox(getImageUri(r.image_url))}>
                    <Image
                      source={{ uri: getImageUri(r.image_url) }}
                      style={styles.reviewImage}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={styles.ownerBox}>
              <Text style={styles.ownerText}>Return Policy: Returns are accepted within 48 hours of delivery. Items must be unused and in original condition. A continuous unboxing video from opening the package is mandatory for return approval.</Text>
              <Text style={styles.ownerTextMl}>റിട്ടേൺ പോളിസി: ഡെലിവറി കഴിഞ്ഞ് 48 മണിക്കൂറിനുള്ളിൽ റിട്ടേൺ സ്വീകരിക്കുന്നതാണ്. ഉൽപ്പന്നങ്ങൾ ഉപയോഗിക്കാത്തതും യഥാർത്ഥ അവസ്ഥയിലുമായിരിക്കണം. റിട്ടേൺ അംഗീകരിക്കുന്നതിനായി പാക്കേജ് തുറക്കുന്നതിന്റെ തുടർച്ചയായ അൺബോക്സിങ് വീഡിയോ നിർബന്ധമാണ്.</Text>
            </View>
            <View style={styles.trustBox}>
              <Text style={styles.trustTitle}>Dundu Quality Promise</Text>
              <Text style={styles.trustTitleMl}>ഡുണ്ടു ക്വാളിറ്റി പ്രോമിസ്</Text>
              <Text style={styles.trustBody}>Every product undergoes 5 rounds of quality checks before dispatch. We capture photos and videos of each item prior to packing — so you can shop with complete confidence. Dundu is a brand you can trust.</Text>
              <Text style={styles.trustBodyMl}>ഓരോ ഉൽപ്പന്നവും അയക്കുന്നതിന് മുമ്പ് 5 ഘട്ടങ്ങളിലൂടെ ഗുണനിലവാര പരിശോധനയ്ക്ക് വിധേയമാക്കുന്നു. ഓരോ ഉൽപ്പന്നത്തിന്റെയും ഫോട്ടോകളും വീഡിയോകളും പാക്ക് ചെയ്യുന്നതിന് മുമ്പ് എടുക്കുന്നു — അതിനാൽ നിങ്ങൾക്ക് പൂർണ്ണ വിശ്വാസത്തോടെ ഷോപ്പിംഗ് ചെയ്യാം. ഡുണ്ടു ഒരു വിശ്വസനീയ ബ്രാൻഡ് ആണ്.</Text>
            </View>
          </View>

          {/* Related products */}
          {related.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You may also like</Text>
              <FlatList
                data={related.slice(0, 8)}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
                renderItem={({ item }) => (
                  <ProductCard
                    product={{ ...item, image: item.primary_image || item.image }}
                    style={styles.relatedCard}
                    onPress={() => navigation.push('ProductDetail', { productId: item.id })}
                  />
                )}
              />
            </View>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ✅ Add-to-Cart Success Popup */}
      <Modal
        visible={cartSuccess}
        transparent
        animationType="slide"
        onRequestClose={() => setCartSuccess(false)}
      >
        <TouchableOpacity
          style={styles.successBackdrop}
          activeOpacity={1}
          onPress={() => setCartSuccess(false)}
        >
          <View style={styles.successSheet}>
            {/* Green check circle */}
            <View style={styles.successIconWrap}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Added to Cart!</Text>
            <Text style={styles.successProduct} numberOfLines={2}>
              {product?.name}
            </Text>
            {selectedVariant && (
              <Text style={styles.successMeta}>
                {[selectedSize, selectedColor].filter(Boolean).join(' · ')}
              </Text>
            )}
            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.successViewCart}
                onPress={() => { setCartSuccess(false); navigation.navigate('MainTabs', { screen: 'Cart' }); }}
              >
                <Text style={styles.successViewCartText}>🛒  View Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.successContinue}
                onPress={() => setCartSuccess(false)}
              >
                <Text style={styles.successContinueText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🔍 Lightbox with pinch-to-zoom */}
      {lightbox && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
          <LightboxViewer uri={lightbox} onClose={() => setLightbox(null)} />
        </Modal>
      )}

      {/* ✏️ Write a Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <SafeAreaView style={styles.rvModalSafe}>
          <View style={styles.rvModalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.rvCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.rvTitle}>Write a Review</Text>
            <TouchableOpacity onPress={submitReview} disabled={reviewLoading}>
              {reviewLoading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.rvSubmit}>Submit</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.rvBody} keyboardShouldPersistTaps="handled">
            {/* Product name */}
            <Text style={styles.rvProductName} numberOfLines={2}>{product?.name}</Text>

            {/* Star picker */}
            <Text style={styles.rvLabel}>Your Rating *</Text>
            <View style={styles.rvStarRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setReviewRating(n)} activeOpacity={0.7}>
                  <Text style={[styles.rvStar, n <= reviewRating && styles.rvStarActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.rvRatingLabel}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
            </Text>

            {/* Review text */}
            <Text style={styles.rvLabel}>Your Review (optional)</Text>
            <TextInput
              style={styles.rvInput}
              placeholder="Share your experience with this product..."
              placeholderTextColor={COLORS.textSecondary}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.rvCharCount}>{reviewText.length}/500</Text>

            {/* Image attachments */}
            <Text style={[styles.rvLabel, { marginTop: 20 }]}>Attach Photo (optional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
              <TouchableOpacity style={styles.rvAttachBtn} onPress={pickImage}>
                <Text style={styles.rvAttachBtnText}>📷 Pick Image</Text>
              </TouchableOpacity>
              {reviewImage && (
                <View style={styles.rvPreviewWrap}>
                  <Image source={{ uri: reviewImage.uri }} style={styles.rvPreviewImage} />
                  <TouchableOpacity style={styles.rvRemoveBtn} onPress={() => setReviewImage(null)}>
                    <Text style={styles.rvRemoveBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 📐 Size Chart Modal — centered card + blur backdrop */}
      <Modal
        visible={showSizeChart}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSizeChart(false)}
      >
        {/* Dark blurred backdrop — tap to close */}
        <TouchableOpacity
          style={styles.scBackdrop}
          activeOpacity={1}
          onPress={() => setShowSizeChart(false)}
        />

        {/* Centered card */}
        <View style={styles.scCardWrap} pointerEvents="box-none">
          <View style={styles.scCard}>
            {/* Header */}
            <View style={styles.scHeader}>
              <Text style={styles.scTitle}>📐 Size Chart</Text>
              <TouchableOpacity onPress={() => setShowSizeChart(false)} style={styles.scClose}>
                <Text style={styles.scCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {sizeChartData ? (
              // ── Auto-fit table (no scroll) ──
              <View style={styles.scTable}>
                {/* Header row */}
                <View style={[styles.scTableRow, styles.scHeaderRow]}>
                  {sizeChartData.headers.map((h, i) => (
                    <Text key={i} style={[styles.scHeaderText, i === 0 && styles.scFirstCol]} numberOfLines={1}>
                      {h}
                    </Text>
                  ))}
                </View>
                {/* Data rows */}
                {sizeChartData.rows.map((row, ri) => (
                  <View key={ri} style={[styles.scTableRow, ri % 2 === 1 && styles.scRowAlt]}>
                    {row.map((cell, ci) => (
                      <Text key={ci} style={[styles.scCellText, ci === 0 && styles.scCellBold, ci === 0 && styles.scFirstCol]} numberOfLines={1}>
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : sizeChartUrl ? (
              <Image
                source={{ uri: sizeChartUrl.startsWith('http') ? sizeChartUrl : `${UPLOADS_URL}${sizeChartUrl}` }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 10 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ color: '#999', textAlign: 'center', paddingVertical: 24 }}>No size chart available</Text>
            )}

            <Text style={styles.scHint}>All measurements in inches</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120 },

  // —— Size Chart Modal ——
  scBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  scCardWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  scCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 30,
  },
  scHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e8f4',
    backgroundColor: '#fdf4fc',
  },
  scTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  scClose: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scCloseText: { fontSize: 14, fontWeight: '800', color: '#555', lineHeight: 16 },

  // —— Auto-fit table ——
  scTable: { width: '100%' },
  scHeaderRow: { backgroundColor: '#f9e8f4' },
  scTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f5edf8',
  },
  scRowAlt: { backgroundColor: '#fdf7fd' },
  scHeaderText: {
    flex: 1, fontSize: 10, fontWeight: '700',
    color: COLORS.primary, textAlign: 'center',
    paddingVertical: 8, paddingHorizontal: 2,
  },
  scFirstCol: { flex: 0.7 },
  scCellText: {
    flex: 1, fontSize: 11, color: '#444',
    textAlign: 'center',
    paddingVertical: 7, paddingHorizontal: 2,
  },
  scCellBold: { fontWeight: '700', color: '#111' },
  scHint: {
    fontSize: 10, color: '#bbb', textAlign: 'center',
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#f5f0f8',
  },

  // —— Size selector row ——
  selectorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sizeChartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3f8',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sizeChartBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },

  // —— Cart Success Popup ——
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  successSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIcon: { fontSize: 32 },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 6,
  },
  successProduct: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  successMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  successActions: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  successViewCart: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  successViewCartText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  successContinue: {
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  successContinueText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Gallery */
  gallery: { position: 'relative', backgroundColor: '#fff' },
  imgSlide: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.9, backgroundColor: '#fff' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },



  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    paddingVertical: 8, backgroundColor: COLORS.background,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border, marginHorizontal: 3 },
  dotActive: { backgroundColor: COLORS.primary, width: 16 },

  /* Body */
  body: { padding: 16 },

  brand: {
    fontSize: 11, color: COLORS.textSecondary, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4,
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, paddingRight: 12 },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text, lineHeight: 27 },
  detailRating: { fontSize: 15, fontWeight: '700', color: '#F6A800', marginTop: 4, marginLeft: 8 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  price: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  offerPrice: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  origPrice: { fontSize: 16, color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  discBadge: {
    paddingHorizontal: 2, paddingVertical: 2,
  },
  discBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  stockBadge: {
    alignSelf: 'flex-start', backgroundColor: '#F0FDF4',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.success, marginBottom: 16,
  },
  stockBadgeOut: { backgroundColor: '#FEF2F2', borderColor: COLORS.error },
  stockText: { color: COLORS.success, fontSize: 12, fontWeight: '600' },
  stockTextOut: { color: COLORS.error },

  /* Selectors */
  selectorBlock: { marginBottom: 16 },
  selectorLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  sizeChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8,
  },
  sizeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sizeChipOOS: { opacity: 0.35 },
  sizeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  sizeChipTextActive: { color: COLORS.white },

  colorDot: {
    width: 34, height: 34, borderRadius: 17, marginRight: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  colorDotActive: { borderColor: COLORS.primary, borderWidth: 3 },
  colorDotWhite: { borderColor: COLORS.border },
  colorCheck: {
    color: COLORS.white, fontSize: 15, fontWeight: '800',
    textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  /* Buy Now + Add to Cart row */
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  buyBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,   // pink
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cartBtn: {
    flex: 1,
    backgroundColor: '#1565C0',         // blue
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionBtnDisabled: { backgroundColor: COLORS.textSecondary },
  cartBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Sections */
  section: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 16, marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },

  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.surface,
  },
  detailKey: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  detailVal: { fontSize: 13, color: COLORS.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  /* Reviews */
  reviewCard: {
    backgroundColor: COLORS.surface, borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewName: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  stars: { color: '#F59E0B', fontSize: 13 },
  reviewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  ownerBox: { marginTop: 12, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#fff5f5', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#c0392b' },
  ownerText: { fontSize: 12, fontWeight: '700', color: '#c0392b', lineHeight: 18 },
  ownerTextMl: { fontSize: 11, fontWeight: '500', color: '#c0392b', lineHeight: 18, marginTop: 4, opacity: 0.9 },
  trustBox: { marginTop: 10, backgroundColor: '#f0faf4', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#27ae60' },
  trustTitle: { fontSize: 13, fontWeight: '700', color: '#1a7a40', marginBottom: 2 },
  trustTitleMl: { fontSize: 12, fontWeight: '600', color: '#1a7a40', marginBottom: 8, opacity: 0.85 },
  trustBody: { fontSize: 12, color: '#2d6a4f', lineHeight: 19, marginBottom: 4 },
  trustBodyMl: { fontSize: 12, color: '#2d6a4f', lineHeight: 20, opacity: 0.8 },

  relatedCard: { width: 140, marginRight: 8, flex: 0 },

  /* Reviews header row */
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  writeReviewBtn: {
    backgroundColor: '#FFF0F8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  writeReviewBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  noReviewsText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontStyle: 'italic' },

  /* Review Modal */
  rvModalSafe: { flex: 1, backgroundColor: COLORS.white },
  rvModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rvTitle: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
  rvCancel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  rvSubmit: { fontSize: 15, color: COLORS.primary, fontWeight: '700' },
  rvBody: { padding: 20, paddingBottom: 40 },
  rvProductName: {
    fontSize: 15, fontWeight: '600', color: COLORS.dark,
    marginBottom: 20, lineHeight: 21,
  },
  rvLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.text,
    marginBottom: 10,
  },
  rvStarRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rvStar: { fontSize: 40, color: COLORS.border },
  rvStarActive: { color: '#F59E0B' },
  rvRatingLabel: {
    fontSize: 13, fontWeight: '600', color: '#F59E0B',
    marginBottom: 24, height: 18,
  },
  rvInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    minHeight: 120,
    lineHeight: 20,
  },
  rvCharCount: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 6 },

  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: { fontSize: 18, color: '#fff', fontWeight: '600' },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rvAttachBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#fff3f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rvAttachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rvPreviewWrap: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rvPreviewImage: {
    width: '100%',
    height: '100%',
  },
  rvRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rvRemoveBtnText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
});
