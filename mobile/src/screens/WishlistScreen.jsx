import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';

const CARD_WIDTH = (Dimensions.get('window').width - 32) / 2;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { userApi } from '../api/index';
import { COLORS } from '../config';
import ProductCard from '../components/product/ProductCard';
import AppHeader from '../components/ui/AppHeader';
import useAuthStore from '../store/auth.store';
import useLoginPromptStore from '../store/loginPrompt.store';

export default function WishlistScreen() {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showPrompt = useLoginPromptStore((s) => s.show);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      showPrompt('Login to view and manage your wishlist');
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }
    fetchWishlist();
  }, [isAuthenticated]);

  async function fetchWishlist() {
    setLoading(true);
    try {
      const res = await userApi.getWishlist();
      setWishlist(res.products || res.wishlist || res || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load wishlist.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmRemove() {
    if (!confirmProduct) return;
    setRemoving(true);
    try {
      await userApi.toggleWishlist(confirmProduct.id);
      setWishlist((prev) => prev.filter((p) => (p.product_id || p.id) !== confirmProduct.id));
      setConfirmProduct(null);
    } catch {
      Alert.alert('Error', 'Could not remove from wishlist.');
    } finally {
      setRemoving(false);
    }
  }

  function renderProduct({ item }) {
    const product = { ...item, id: item.product_id || item.id, is_wishlisted: true };
    return (
      <ProductCard
        product={product}
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
        onWishlistRemove={(p) => setConfirmProduct(p)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      {/* Remove confirmation popup */}
      <Modal visible={!!confirmProduct} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmIcon}>🗑️</Text>
            <Text style={styles.confirmTitle}>Remove from Wishlist?</Text>
            <Text style={styles.confirmMsg} numberOfLines={2}>
              {confirmProduct?.name}
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmProduct(null)}
                disabled={removing}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmOkBtn}
                onPress={handleConfirmRemove}
                disabled={removing}
              >
                <Text style={styles.confirmOkText}>{removing ? 'Removing…' : 'Remove'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AppHeader title="Wishlist" showBack showCart />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart icon on any product to save it here
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.shopButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchWishlist}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
  },
  backText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  shopButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  row: {
    paddingHorizontal: 6,
    justifyContent: 'flex-start',
  },
  productCard: {
    width: CARD_WIDTH,
    flex: 0,
    margin: 5,
  },

  /* Remove confirmation */
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmIcon: { fontSize: 36, marginBottom: 10 },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  confirmMsg: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
  },
  confirmOkBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmOkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
