import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
  Linking,
  AppState,
} from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { homeApi, settingsApi } from '../api/index';
import { COLORS, UPLOADS_URL } from '../config';
import ProductCard from '../components/product/ProductCard';
import AppHeader from '../components/ui/AppHeader';
import CategoryStrip from '../components/ui/CategoryStrip';
import AnnouncementBar from '../components/ui/AnnouncementBar';
import WelcomePopup from '../components/ui/WelcomePopup';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2; // 2 cols, 16px side padding each

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

function isOlderVersion(current, latest) {
  const parse = (v) => String(v).split('.').map((n) => parseInt(n) || 0);
  const [ca, cb, cc] = parse(current);
  const [la, lb, lc] = parse(latest);
  if (ca !== la) return ca < la;
  if (cb !== lb) return cb < lb;
  return cc < lc;
}

function getImageUri(src) {
  if (!src) return null;
  const str = typeof src === 'object' ? src.url : src;
  if (!str) return null;
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  return UPLOADS_URL + (str.startsWith('/') ? str : '/' + str);
}

function parseBannerLink(link) {
  if (!link) return null;
  const m = link.match(/[?&]category=([^&]+)/);
  if (m) return { screen: 'Shop', params: { category: m[1] } };
  const offerM = link.match(/[?&]offer=true/);
  if (offerM) return { screen: 'Shop', params: { offer: true } };
  return null;
}

/* ── Banner carousel ─────────────────────────────── */
function BannerCarousel({ banners, navigation }) {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % banners.length;
        try { flatListRef.current?.scrollToIndex({ index: next, animated: true }); }
        catch (_) {}
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [banners]);

  if (!banners?.length) return null;

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item, i) => String(item.id || i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
        }
        renderItem={({ item }) => {
          const uri = getImageUri(item.image_url || item.image);
          const dest = parseBannerLink(item.link);
          return (
            <TouchableOpacity
              style={styles.bannerSlide}
              activeOpacity={dest ? 0.9 : 1}
              onPress={() => dest && navigation.navigate(dest.screen, dest.params)}
            >
              {uri
                ? <Image source={{ uri }} style={styles.bannerImage} resizeMode="cover" />
                : <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
                    <Text style={styles.bannerPlaceholderText}>DUNDU</Text>
                  </View>
              }
              {item.badge_text && item.badge_active && (
                <View style={[styles.bannerBadge, { backgroundColor: item.badge_color || '#e91e8c' }]}>
                  <Text style={styles.bannerBadgeText}>{item.badge_text}</Text>
                </View>
              )}
              {(item.title || item.subtitle) && (
                <View style={styles.bannerOverlay}>
                  {item.title && <Text style={styles.bannerTitle}>{item.title}</Text>}
                  {item.subtitle && <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
      {banners.length > 1 && (
        <View style={styles.dotsRow}>
          {banners.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

/* ── Section header ──────────────────────────────── */
function SectionHeader({ title, onViewAll, titleColor }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, titleColor && { color: titleColor }]}>{title}</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>View all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ── Main screen ─────────────────────────────────── */
export default function HomeScreen() {
  const navigation = useNavigation();
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [updateModal, setUpdateModal] = useState({ visible: false, message: '' });
  const updateDismissed = useRef(false);

  useEffect(() => {
    fetchHome();
    checkForUpdate();

    // Poll every 30 seconds so admin-triggered notifications appear without restart
    const pollInterval = setInterval(checkForUpdate, 30_000);

    // Re-check when app comes back to foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForUpdate();
    });

    return () => {
      clearInterval(pollInterval);
      appStateSub.remove();
    };
  }, []);

  async function fetchHome() {
    setLoading(true);
    try {
      const res = await homeApi.getHomeData();
      setHomeData(res);
    } catch {
      Alert.alert('Error', 'Failed to load home data.');
    } finally {
      setLoading(false);
    }
  }

  async function checkForUpdate() {
    if (updateDismissed.current) return;
    try {
      const res = await settingsApi.getPayment();
      const s = res?.data || res;
      const message = s.update_message || 'A new version of Dundu is available. Please update the app for the best experience.';
      const shouldShow =
        s.update_available === true ||
        (s.latest_version && isOlderVersion(APP_VERSION, s.latest_version));
      if (shouldShow) {
        setUpdateModal({ visible: true, message });
      }
    } catch (_) {}
  }

  function handleSearch() {
    const q = searchText.trim();
    if (q) {
      navigation.navigate('Shop', { search: q });
      setSearchText('');
    }
  }

  const banners = homeData?.banners || [];
  const categories = homeData?.categories || [];
  const newArrivals = (homeData?.new_arrivals || []).slice(0, 8);
  const trending = (homeData?.trending || []).slice(0, 8);
  const offers = (homeData?.offers || []).slice(0, 6);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      {/* ── App Update Modal ── */}
      <Modal
        visible={updateModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.updateBackdrop}>
          <View style={styles.updateCard}>
            <Text style={styles.updateEmoji}>🚀</Text>
            <Text style={styles.updateTitle}>Update Available</Text>
            <Text style={styles.updateMessage}>{updateModal.message}</Text>
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={() => {
                updateDismissed.current = true;
                setUpdateModal((p) => ({ ...p, visible: false }));
                Linking.openURL('https://play.google.com/store/apps/details?id=com.dundu.app').catch(() => {});
              }}
            >
              <Text style={styles.updateBtnText}>Update Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.updateLaterBtn}
              onPress={() => {
                updateDismissed.current = true;
                setUpdateModal((p) => ({ ...p, visible: false }));
              }}
            >
              <Text style={styles.updateLaterText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <WelcomePopup />

      {/* ── Top bar: DUNDU left + icons right ── */}
      <AppHeader logo showCart showWishlist />

      {/* ── Search bar (always visible) ── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, brands..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* ── Category circles strip (always visible) ── */}
      <CategoryStrip
        categories={categories}
        activeSlug={null}
        isOfferActive={false}
        onPressOffers={() => navigation.navigate('Shop', { offer: true })}
        onPressCategory={(cat) =>
          navigation.navigate('Shop', { category: cat.slug, category_name: cat.name })
        }
      />

      {/* ── Scrollable content ── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <AnnouncementBar />
          <BannerCarousel banners={banners} navigation={navigation} />

          {/* New Arrivals */}
          {newArrivals.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="New Arrivals"
                titleColor="#16a34a"
                onViewAll={() => navigation.navigate('Shop', { sort: 'newest' })}
              />
              <FlatList
                data={newArrivals}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    style={styles.hCard}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  />
                )}
              />
            </View>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Trending Now ✨"
                titleColor="#7c3aed"
                onViewAll={() => navigation.navigate('Shop')}
              />
              <FlatList
                data={trending}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    style={styles.hCard}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  />
                )}
              />
            </View>
          )}

          {/* Hot Offers — 2-col grid */}
          {offers.length > 0 && (
            <View style={styles.offersSection}>
              {/* Styled header */}
              <View style={styles.offersHeaderRow}>
                <View style={styles.offersTitleWrap}>
                  <Text style={styles.offersFireEmoji}>🔥</Text>
                  <View>
                    <Text style={styles.offersTitle}>Hot Offers</Text>
                    <Text style={styles.offersSubtitle}>Limited-time deals just for you</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.offersViewAll}
                  onPress={() => navigation.navigate('Shop', { offer: true })}
                >
                  <Text style={styles.offersViewAllText}>See all →</Text>
                </TouchableOpacity>
              </View>

              {/* 2-column grid using rows */}
              <View style={styles.offersGrid}>
                {offers.map((item, idx) => (
                  <View
                    key={String(item.id)}
                    style={[
                      styles.offerCardWrap,
                      idx % 2 === 0 ? { marginRight: CARD_GAP / 2 } : { marginLeft: CARD_GAP / 2 },
                    ]}
                  >
                    <ProductCard
                      product={item}
                      style={{ width: CARD_WIDTH }}
                      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 Dundu. All rights reserved.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#040d04' },

  /* Search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  searchIcon: { fontSize: 15, marginRight: 8, color: '#666' },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },

  /* Loading */
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Scroll area */
  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 90 },

  /* Banners */
  bannerSlide: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.5, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { backgroundColor: '#2A1A2E', alignItems: 'center', justifyContent: 'center' },
  bannerPlaceholderText: { fontSize: 24, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  bannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bannerBadge: { position: 'absolute', top: 10, right: 10, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  bannerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  bannerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#444', marginHorizontal: 3 },
  dotActive: { backgroundColor: COLORS.primary, width: 16 },

  /* Sections */
  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  viewAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  hList: { paddingHorizontal: 10 },
  hCard: { width: 148, marginHorizontal: 4, flex: 0 },

  offersSection: {
    marginTop: 24,
    backgroundColor: '#FFF0F8',
    paddingBottom: 8,
  },
  offersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFD6EC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f9a8d4',
    marginBottom: 12,
  },
  offersTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offersFireEmoji: {
    fontSize: 32,
  },
  offersTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  offersSubtitle: {
    fontSize: 11,
    color: '#c06080',
    marginTop: 1,
    opacity: 0.8,
  },
  offersViewAll: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  offersViewAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  offersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  offerCardWrap: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },

  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { color: COLORS.textSecondary, fontSize: 12 },

  /* Update modal */
  updateBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  updateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  updateEmoji: { fontSize: 48, marginBottom: 10 },
  updateTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 10 },
  updateMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  updateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  updateBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  updateLaterBtn: { paddingVertical: 8 },
  updateLaterText: { color: '#999', fontSize: 13 },
});
