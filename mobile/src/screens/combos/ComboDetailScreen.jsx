import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { comboApi, cartApi } from '../../api/index';
import { COLORS, UPLOADS_URL } from '../../config';
import { formatPrice } from '../../utils/format';
import AppHeader from '../../components/ui/AppHeader';
import useCartStore from '../../store/cart.store';
import useRequireAuth from '../../hooks/useRequireAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getImageUri(src) {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return UPLOADS_URL + (src.startsWith('/') ? src : '/' + src);
}

// ── Slot Section ──────────────────────────────────────────────────────────────
function SlotSection({ slot, slotIndex, selection, onSelectionChange }) {
  const hasMultipleProducts = slot.products && slot.products.length > 1;
  const chosenProductId = selection?.product_id || slot.products?.[0]?.id;
  const chosenProduct = slot.products?.find((p) => p.id === chosenProductId) || slot.products?.[0];

  const variants = chosenProduct?.variants || [];
  const colors = [...new Set(variants.filter((v) => v.color && v.stock > 0).map((v) => v.color))];
  const chosenColor = selection?.color || null;
  const sizesForColor = variants.filter(
    (v) => v.stock > 0 && (!chosenColor || v.color === chosenColor)
  );
  const chosenSize = selection?.size || null;

  const selectProduct = (prod) => {
    onSelectionChange({ product_id: prod.id, color: null, size: null, variant_id: null });
  };

  const selectColor = (color) => {
    onSelectionChange({ ...selection, product_id: chosenProductId, color, size: null, variant_id: null });
  };

  const selectSize = (v) => {
    onSelectionChange({
      ...selection,
      product_id: chosenProductId,
      color: chosenColor,
      size: v.size,
      variant_id: v.id,
    });
  };

  const productUri = getImageUri(chosenProduct?.image);

  return (
    <View style={styles.slotSection}>
      {/* Slot header */}
      <View style={styles.slotHeader}>
        <View style={styles.slotNumberBadge}>
          <Text style={styles.slotNumber}>{slotIndex + 1}</Text>
        </View>
        <Text style={styles.slotLabel}>{slot.slot_label}</Text>
        {!slot.requires_selection && (
          <View style={styles.autoTag}>
            <Text style={styles.autoTagText}>Auto ✓</Text>
          </View>
        )}
      </View>

      {/* Product Picker (when multiple products in slot) */}
      {hasMultipleProducts && (
        <View style={styles.productPickerWrap}>
          <Text style={styles.sectionSubLabel}>Choose one:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={slot.products}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: 2, gap: 10 }}
            renderItem={({ item: prod }) => {
              const isChosen = prod.id === chosenProductId;
              const uri = getImageUri(prod.image);
              return (
                <TouchableOpacity
                  style={[styles.productChoice, isChosen && styles.productChoiceActive]}
                  onPress={() => selectProduct(prod)}
                  activeOpacity={0.8}
                >
                  {uri
                    ? <Image source={{ uri }} style={styles.productChoiceImage} resizeMode="cover" />
                    : <View style={styles.productChoiceImageFallback}><Text style={{ fontSize: 22 }}>👗</Text></View>
                  }
                  <Text style={[styles.productChoiceName, isChosen && styles.productChoiceNameActive]} numberOfLines={2}>
                    {prod.name}
                  </Text>
                  {isChosen && <View style={styles.productChoiceCheck}><Text style={{ color: '#fff', fontSize: 10 }}>✓</Text></View>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Single product preview */}
      {!hasMultipleProducts && chosenProduct && (
        <View style={styles.singleProductRow}>
          {productUri
            ? <Image source={{ uri: productUri }} style={styles.singleProductImage} resizeMode="cover" />
            : <View style={[styles.singleProductImage, { backgroundColor: '#fce4f4', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 22 }}>👗</Text></View>
          }
          <View style={{ flex: 1 }}>
            <Text style={styles.singleProductName} numberOfLines={2}>{chosenProduct.name}</Text>
            {chosenProduct.offer_price && parseFloat(chosenProduct.offer_price) > 0
              ? <Text style={styles.singleProductPrice}>{formatPrice(chosenProduct.offer_price)}</Text>
              : <Text style={styles.singleProductPrice}>{formatPrice(chosenProduct.price)}</Text>
            }
          </View>
        </View>
      )}

      {/* Color & Size pickers — only if requires_selection */}
      {slot.requires_selection && chosenProduct && (
        <View style={styles.variantSection}>
          {/* Color picker */}
          {colors.length > 0 && (
            <View style={styles.variantBlock}>
              <Text style={styles.variantLabel}>
                Color: <Text style={styles.variantValue}>{chosenColor || 'Select'}</Text>
              </Text>
              <View style={styles.optionRow}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => selectColor(color)}
                    style={[styles.colorChip, chosenColor === color && styles.colorChipActive]}
                  >
                    <Text style={[styles.colorChipText, chosenColor === color && styles.colorChipTextActive]}>
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Size picker */}
          {sizesForColor.length > 0 && (
            <View style={styles.variantBlock}>
              <Text style={styles.variantLabel}>
                Size: <Text style={styles.variantValue}>{chosenSize || 'Select'}</Text>
              </Text>
              <View style={styles.optionRow}>
                {sizesForColor.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => selectSize(v)}
                    style={[
                      styles.sizeChip,
                      chosenSize === v.size && styles.sizeChipActive,
                      v.stock === 0 && styles.sizeChipOOS,
                    ]}
                    disabled={v.stock === 0}
                  >
                    <Text style={[styles.sizeChipText, chosenSize === v.size && styles.sizeChipTextActive]}>
                      {v.size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* No variants */}
          {variants.length === 0 && (
            <View style={styles.noVariantNote}>
              <Text style={styles.noVariantNoteText}>✓ Ready to add</Text>
            </View>
          )}
        </View>
      )}

      {/* No-selection confirmation */}
      {!slot.requires_selection && (
        <View style={styles.autoNote}>
          <Text style={styles.autoNoteText}>✓ This item is auto-included — no selection needed</Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ComboDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { comboId } = route.params;
  const addItem = useCartStore((s) => s.addItem);
  const { requireAuth } = useRequireAuth();

  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  // selections[slotIndex] = { product_id, color, size, variant_id }
  const [selections, setSelections] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await comboApi.getOne(comboId);
        const c = res.data?.combo;
        if (c) {
          setCombo(c);
          // Pre-select first product for each slot
          const initSelections = {};
          (c.slots || []).forEach((slot, i) => {
            if (slot.products?.length > 0) {
              initSelections[i] = { product_id: slot.products[0].id, color: null, size: null, variant_id: null };
            }
          });
          setSelections(initSelections);
        }
      } catch (e) {
        Alert.alert('Error', 'Could not load combo details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [comboId]);

  const handleSelectionChange = useCallback((slotIndex, sel) => {
    setSelections((prev) => ({ ...prev, [slotIndex]: sel }));
  }, []);

  const validateSelections = () => {
    if (!combo) return null;
    const errors = [];
    combo.slots.forEach((slot, i) => {
      if (!slot.requires_selection) return; // auto-included, no check needed
      const sel = selections[i];
      const chosenProduct = slot.products?.find((p) => p.id === sel?.product_id) || slot.products?.[0];
      if (!chosenProduct) { errors.push(`Slot "${slot.slot_label}": pick a product`); return; }
      const variants = chosenProduct.variants || [];
      if (variants.length === 0) return; // product has no variants, fine

      const colors = [...new Set(variants.filter((v) => v.color && v.stock > 0).map((v) => v.color))];
      if (colors.length > 0 && !sel?.color) {
        errors.push(`"${slot.slot_label}": choose a color`);
        return;
      }
      const hasSize = variants.some((v) => v.size && v.stock > 0);
      if (hasSize && !sel?.size) {
        errors.push(`"${slot.slot_label}": choose a size`);
      }
    });
    return errors.length > 0 ? errors : null;
  };

  const handleAddToCart = async () => {
    requireAuth(async () => {
      const errors = validateSelections();
      if (errors) {
        Alert.alert('Please complete your selection', errors.join('\n'));
        return;
      }

      setCartLoading(true);
      try {
        // Build payload — one cart item per combo
        const slotSelections = combo.slots.map((slot, i) => ({
          slot_id: slot.id,
          slot_label: slot.slot_label,
          requires_selection: slot.requires_selection,
          product_id: selections[i]?.product_id || slot.products?.[0]?.id,
          variant_id: selections[i]?.variant_id || null,
          color: selections[i]?.color || null,
          size: selections[i]?.size || null,
        }));

        await addItem({
          combo_id: combo.id,
          quantity: 1,
          combo_selections: JSON.stringify(slotSelections),
        });

        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 2500);
      } catch (err) {
        Alert.alert('Error', err?.message || 'Could not add combo to cart');
      } finally {
        setCartLoading(false);
      }
    });
  };

  const hasOffer = combo?.offer_price && parseFloat(combo.offer_price) > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Combo" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!combo) return null;

  const comboUri = getImageUri(combo.image_url);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={combo.name} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero image */}
        <View style={styles.heroWrap}>
          {comboUri
            ? <Image source={{ uri: comboUri }} style={styles.heroImage} resizeMode="cover" />
            : <View style={styles.heroFallback}><Text style={{ fontSize: 80 }}>🎀</Text></View>
          }
          <View style={styles.comboBadge}>
            <Text style={styles.comboBadgeText}>COMBO DEAL</Text>
          </View>
        </View>

        {/* Header info */}
        <View style={styles.infoBlock}>
          <Text style={styles.comboName}>{combo.name}</Text>

          <View style={styles.priceRow}>
            {hasOffer ? (
              <>
                <Text style={styles.offerPrice}>{formatPrice(combo.offer_price)}</Text>
                <Text style={styles.mrp}>{formatPrice(combo.price)}</Text>
                <View style={styles.offPill}>
                  <Text style={styles.offPillText}>
                    {Math.round(((parseFloat(combo.price) - parseFloat(combo.offer_price)) / parseFloat(combo.price)) * 100)}% OFF
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.offerPrice}>{formatPrice(combo.price)}</Text>
            )}
          </View>

          {combo.description ? (
            <Text style={styles.description}>{combo.description}</Text>
          ) : null}

          {/* Slot count summary */}
          <View style={styles.slotSummary}>
            <Text style={styles.slotSummaryText}>
              🎀 {combo.slots.length} item{combo.slots.length !== 1 ? 's' : ''} in this combo
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Slots */}
        <View style={styles.slotsSection}>
          <Text style={styles.slotsTitle}>Customize Your Combo</Text>
          {combo.slots.map((slot, i) => (
            <SlotSection
              key={slot.id}
              slot={slot}
              slotIndex={i}
              selection={selections[i]}
              onSelectionChange={(sel) => handleSelectionChange(i, sel)}
            />
          ))}
        </View>

        {/* Bottom spacer for the fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Add to Cart */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyPrice}>
          <Text style={styles.stickyPriceLabel}>Total</Text>
          <Text style={styles.stickyPriceValue}>
            {hasOffer ? formatPrice(combo.offer_price) : formatPrice(combo.price)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, (cartLoading || cartSuccess) && styles.addBtnDisabled]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
          disabled={cartLoading || cartSuccess}
        >
          {cartLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : cartSuccess ? (
            <Text style={styles.addBtnText}>✓ Added to Cart!</Text>
          ) : (
            <Text style={styles.addBtnText}>Add Combo to Cart 🛒</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff0f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 20 },

  // Hero
  heroWrap: { height: 280, width: '100%', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { width: '100%', height: '100%', backgroundColor: '#fce4f4', alignItems: 'center', justifyContent: 'center' },
  comboBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12,
  },
  comboBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },

  // Info
  infoBlock: { padding: 16, backgroundColor: '#fff' },
  comboName: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', lineHeight: 30, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  offerPrice: { fontSize: 26, fontWeight: '900', color: COLORS.primary },
  mrp: { fontSize: 16, color: '#aaa', textDecorationLine: 'line-through', fontWeight: '500' },
  offPill: { backgroundColor: '#fce4f4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  offPillText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  description: { fontSize: 14, color: '#666', lineHeight: 21, marginBottom: 8 },
  slotSummary: { backgroundColor: '#fce4f4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  slotSummaryText: { fontSize: 13, fontWeight: '700', color: '#C2167A' },

  divider: { height: 8, backgroundColor: '#f5f5f5' },

  // Slots section
  slotsSection: { padding: 16, gap: 12 },
  slotsTitle: { fontSize: 17, fontWeight: '900', color: '#1a1a1a', marginBottom: 4 },

  // Individual slot
  slotSection: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#f0d6e8',
    padding: 14, marginBottom: 10,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slotNumberBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  slotNumber: { color: '#fff', fontSize: 12, fontWeight: '900' },
  slotLabel: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', flex: 1 },
  autoTag: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  autoTagText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },

  // Multiple product picker
  productPickerWrap: { marginBottom: 10 },
  sectionSubLabel: { fontSize: 12, fontWeight: '700', color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  productChoice: {
    width: 110, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#e0e0e0', backgroundColor: '#fff',
    padding: 8, alignItems: 'center', position: 'relative',
  },
  productChoiceActive: { borderColor: COLORS.primary, backgroundColor: '#fff0f6' },
  productChoiceImage: { width: 80, height: 80, borderRadius: 10, marginBottom: 6 },
  productChoiceImageFallback: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#fce4f4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  productChoiceName: { fontSize: 11, fontWeight: '600', color: '#555', textAlign: 'center', lineHeight: 15 },
  productChoiceNameActive: { color: COLORS.primary, fontWeight: '800' },
  productChoiceCheck: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Single product row
  singleProductRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  singleProductImage: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#f0d6e8' },
  singleProductName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 4, lineHeight: 18 },
  singleProductPrice: { fontSize: 15, fontWeight: '900', color: COLORS.primary },

  // Variant pickers
  variantSection: { gap: 10 },
  variantBlock: {},
  variantLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6 },
  variantValue: { color: COLORS.primary },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  colorChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fafafa',
  },
  colorChipActive: { borderColor: COLORS.primary, backgroundColor: '#fff0f6' },
  colorChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  colorChipTextActive: { color: COLORS.primary, fontWeight: '800' },

  sizeChip: {
    width: 48, height: 38, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#e0e0e0', backgroundColor: '#fafafa',
    alignItems: 'center', justifyContent: 'center',
  },
  sizeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  sizeChipOOS: { opacity: 0.35 },
  sizeChipText: { fontSize: 13, fontWeight: '700', color: '#555' },
  sizeChipTextActive: { color: '#fff' },

  noVariantNote: { backgroundColor: '#dcfce7', borderRadius: 10, padding: 8 },
  noVariantNoteText: { fontSize: 12, fontWeight: '700', color: '#16a34a', textAlign: 'center' },

  autoNote: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 8 },
  autoNoteText: { fontSize: 12, fontWeight: '600', color: '#16a34a', textAlign: 'center' },

  // Sticky bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: '#f0d6e8',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 15,
  },
  stickyPrice: { flex: 0 },
  stickyPriceLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  stickyPriceValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  addBtn: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#f0a8d0' },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
