import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { productApi, categoryApi } from '../../../api/index';
import { COLORS } from '../../../config';
import ProductCard from '../../../components/product/ProductCard';
import AppHeader from '../../../components/ui/AppHeader';
import CategoryStrip from '../../../components/ui/CategoryStrip';
import useSettingsStore from '../../../store/settings.store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 12) / 2 - 10; // listContent paddingH=6 each side, card margin=5

const SORT_OPTIONS = [
  { label: 'Newest',  value: 'newest' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
];

const ALL_COLORS = [
  'White', 'Black', 'Red', 'Pink', 'Rose', 'Orange', 'Yellow',
  'Green', 'Mint', 'Teal', 'Blue', 'Sky Blue', 'Navy', 'Purple',
  'Lavender', 'Maroon', 'Brown', 'Beige', 'Cream', 'Grey',
  'Charcoal', 'Gold', 'Silver', 'Mustard', 'Coral', 'Peach',
  'Indigo', 'Olive', 'Rust', 'Ivory',
];

const PAGE_SIZE = 20;

const GENZY_THEME = {
  primary:     '#22c55e',
  bg:          '#040d04',
  topBg:       '#040d04',
  surface:     '#0a180a',
  border:      '#163016',
  tagBg:       '#0a2a0a',
  inputBg:     '#0a180a',
  inputBorder: '#163016',
  stripBorder: '#22c55e',
};
const DEFAULT_THEME = {
  primary:     COLORS.primary,
  bg:          '#fff0f6',
  topBg:       '#000',
  surface:     '#ffffff',
  border:      '#f9c8e0',
  tagBg:       '#ffe0f0',
  inputBg:     '#1a1a1a',
  inputBorder: '#2e2e2e',
  stripBorder: COLORS.primary,
};

/* ── Professional funnel filter icon (3 tapering lines) ──────────────────── */
function FilterIcon({ color = '#fff', size = 15 }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <View style={{ width: size * 1.2, height: Math.max(2, size * 0.13), borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: size * 0.85, height: Math.max(2, size * 0.13), borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: size * 0.5, height: Math.max(2, size * 0.13), borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

/* ── Filter bottom sheet ──────────────────────────────────────────────────── */
function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.fchip, active && styles.fchipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.fchipText, active && styles.fchipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* Dropdown select picker */
function SelectDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      {/* Trigger */}
      <TouchableOpacity
        style={[styles.dropdownTrigger, value && styles.dropdownTriggerActive]}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.85}
      >
        <Text style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}>
          {value || `Select ${label}`}
        </Text>
        {/* Arrow */}
        <View style={[styles.dropdownArrow, open && styles.dropdownArrowUp]}>
          <View style={styles.dropdownArrowInner} />
        </View>
      </TouchableOpacity>

      {/* Options list */}
      {open && (
        <View style={styles.dropdownList}>
          {/* Clear option */}
          <TouchableOpacity
            style={[styles.dropdownItem, !value && styles.dropdownItemActive]}
            onPress={() => { onChange(''); setOpen(false); }}
          >
            <Text style={[styles.dropdownItemText, !value && styles.dropdownItemTextActive]}>
              All {label}s
            </Text>
            {!value && <Text style={styles.dropdownCheck}>✓</Text>}
          </TouchableOpacity>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextActive]}>
                {opt}
              </Text>
              {value === opt && <Text style={styles.dropdownCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function FilterSheet({ visible, onClose, filters, onApply, opts = {} }) {
  const [local, setLocal] = useState(filters);
  const toggle = (k, v) => setLocal((p) => ({ ...p, [k]: p[k] === v ? '' : v }));

  useEffect(() => { if (visible) setLocal(filters); }, [visible]);

  const subCats  = opts.sub_categories || [];
  const types    = opts.types           || [];
  const materials= opts.materials       || [];
  const colors   = opts.colors          || [];
  const ageGroups= opts.age_groups      || [];

  const activeCount = [
    local.sub_category, local.material, local.color, local.type, local.age_group,
  ].filter(Boolean).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.sheetCenter} pointerEvents="box-none">
        <View style={styles.sheet}>

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setLocal({ sub_category: '', material: '', color: '', type: '', age_group: '', offer: false })}>
              <Text style={styles.sheetReset}>Reset all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

            {subCats.length > 0 && (
              <>
                <Text style={styles.sheetSection}>Style / Sub Category</Text>
                <View style={styles.chipRow}>
                  {subCats.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      active={local.sub_category === s}
                      onPress={() => toggle('sub_category', s)}
                    />
                  ))}
                </View>
              </>
            )}

            {types.length > 0 && (
              <>
                <Text style={styles.sheetSection}>Type</Text>
                <SelectDropdown
                  label="Type"
                  options={types}
                  value={local.type}
                  onChange={(v) => setLocal((p) => ({ ...p, type: v }))}
                />
              </>
            )}

            {materials.length > 0 && (
              <>
                <Text style={styles.sheetSection}>Material</Text>
                <SelectDropdown
                  label="Material"
                  options={materials}
                  value={local.material}
                  onChange={(v) => setLocal((p) => ({ ...p, material: v }))}
                />
              </>
            )}

            {colors.length > 0 && (
              <>
                <Text style={styles.sheetSection}>Color</Text>
                <View style={styles.chipRow}>
                  {colors.map((c) => (
                    <Chip key={c} label={c} active={local.color === c} onPress={() => toggle('color', c)} />
                  ))}
                </View>
              </>
            )}

            {ageGroups.length > 0 && (
              <>
                <Text style={styles.sheetSection}>Age Group</Text>
                <SelectDropdown
                  label="Age Group"
                  options={ageGroups}
                  value={local.age_group}
                  onChange={(v) => setLocal((p) => ({ ...p, age_group: v }))}
                />
              </>
            )}

          </ScrollView>

          <TouchableOpacity style={styles.applyBtn} onPress={() => { onApply(local); onClose(); }}>
            <Text style={styles.applyBtnText}>
              Apply{activeCount > 0 ? ` (${activeCount} active)` : ' Filters'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ── Main Screen ──────────────────────────────────────────────────────────── */
const DEFAULT_FILTERS = { sub_category: '', material: '', color: '', type: '', age_group: '', offer: false };

export default function ProductsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params || {};

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalFilterOpts, setGlobalFilterOpts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const [searchInput, setSearchInput] = useState(routeParams.search || '');
  const [search, setSearch] = useState(routeParams.search || '');
  const [sort, setSort] = useState('newest');
  const [activeSlug, setActiveSlug] = useState(routeParams.category || null);
  const [categoryName, setCategoryName] = useState(routeParams.category_name || null);
  const [offerOnly, setOfferOnly] = useState(!!routeParams.offer);
  const [newArrivalOnly, setNewArrivalOnly] = useState(!!routeParams.new_arrival);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const activeFilterCount = [
    filters.sub_category, filters.material, filters.color,
    filters.type, filters.age_group, filters.offer,
  ].filter(Boolean).length;

  const isGenzy = activeSlug?.toLowerCase().includes('genzy');
  const T = isGenzy ? GENZY_THEME : DEFAULT_THEME;

  const festEnabled = useSettingsStore((s) => s.festivalEnabled);
  const festBgColor = useSettingsStore((s) => s.festivalBgColor);
  const festNavBg   = useSettingsStore((s) => s.festivalNavbarColor);
  const festNavText = useSettingsStore((s) => s.festivalNavbarTextColor);

  // Load categories + global filter options
  useEffect(() => {
    categoryApi.list()
      .then((res) => setCategories(res.categories || res || []))
      .catch(() => {});
    productApi.getFilters()
      .then((res) => setGlobalFilterOpts(res || {}))
      .catch(() => {});
  }, []);

  // When category changes, fetch scoped filter data from backend
  const [catFilterOpts, setCatFilterOpts] = useState({});
  useEffect(() => {
    if (activeSlug) {
      productApi.getFilters({ category: activeSlug })
        .then((res) => setCatFilterOpts(res || {}))
        .catch(() => setCatFilterOpts({}));
    } else {
      setCatFilterOpts({});
    }
  }, [activeSlug]);

  // Build filterOpts: category-scoped when active, else global
  const filterOpts = React.useMemo(() => {
    if (activeSlug && categories.length > 0) {
      const cat = categories.find((c) => c.slug === activeSlug);
      if (cat) {
        const parseJson = (v) => {
          if (Array.isArray(v)) return v;
          try { return JSON.parse(v || '[]'); } catch { return []; }
        };
        const subCats = parseJson(cat.sub_categories)
          .filter((s) => s.is_active && s.name)
          .map((s) => s.name);
        const types = parseJson(cat.types)
          .filter((t) => t.is_active && t.name)
          .map((t) => t.name);
        return {
          sub_categories: subCats,
          types:          types.length > 0 ? types : (catFilterOpts.types || []),
          materials:      catFilterOpts.materials  || [],
          colors:         ALL_COLORS,
          age_groups:     catFilterOpts.age_groups || [],
        };
      }
    }
    return { ...globalFilterOpts, colors: ALL_COLORS };
  }, [activeSlug, categories, globalFilterOpts, catFilterOpts]);

  useEffect(() => { resetAndFetch(); }, [search, sort, activeSlug, offerOnly, newArrivalOnly, filters]);

  useEffect(() => {
    setActiveSlug(routeParams.category || null);
    setCategoryName(routeParams.category_name || null);
    setOfferOnly(!!routeParams.offer);
    setNewArrivalOnly(!!routeParams.new_arrival);
    setFilters(DEFAULT_FILTERS);
    const q = routeParams.search || '';
    setSearchInput(q);
    setSearch(q);
  }, [routeParams.category, routeParams.category_name, routeParams.offer, routeParams.new_arrival, routeParams.search]);

  async function fetchProducts(pageNum, append = false) {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = { page: pageNum, limit: PAGE_SIZE };
      if (search)              params.search       = search;
      if (sort !== 'newest')   params.sort         = sort;
      if (offerOnly || filters.offer) params.offer = true;
      if (newArrivalOnly)      params.new_arrival  = true;
      if (activeSlug)          params.category     = activeSlug;
      if (filters.sub_category) params.sub_category = filters.sub_category;
      if (filters.material)    params.material     = filters.material;
      if (filters.color)       params.color        = filters.color;
      if (filters.type)        params.type         = filters.type;
      if (filters.age_group)   params.age_group    = filters.age_group;

      const res = await productApi.list(params);
      const newProducts = res.products || res || [];
      setProducts(append ? (prev) => [...prev, ...newProducts] : newProducts);
      setHasMore(newProducts.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      console.warn("fetchProducts error details:", err);
      if (pageNum === 1) {
        Alert.alert(
          'Error',
          `Failed to load products. Details: ${err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))}`
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  function resetAndFetch() { setPage(1); setHasMore(true); fetchProducts(1, false); }
  function handleLoadMore() { if (!loadingMore && hasMore && !loading) fetchProducts(page + 1, true); }
  function handleSearch() { setSearch(searchInput.trim()); }

  function handleCategoryPress(cat) {
    if (cat.slug === activeSlug) { setActiveSlug(null); setCategoryName(null); }
    else { setActiveSlug(cat.slug); setCategoryName(cat.name); setOfferOnly(false); }
  }
  function handleOffersPress() { setOfferOnly((p) => !p); setNewArrivalOnly(false); setActiveSlug(null); setCategoryName(null); }
  function clearAll() { setActiveSlug(null); setCategoryName(null); setOfferOnly(false); setNewArrivalOnly(false); setFilters(DEFAULT_FILTERS); }

  const renderProduct = useCallback(
    ({ item }) => (
      <View style={offerOnly ? styles.offerCardWrap : styles.normalCardWrap}>
        <ProductCard
          product={item}
          style={styles.productCard}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        />
      </View>
    ),
    [navigation, offerOnly]
  );

  const hasAnyFilter = activeSlug || offerOnly || activeFilterCount > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: festEnabled ? festNavBg : T.bg }]} edges={['left', 'right', 'bottom']}>

      <AppHeader logo showCart showWishlist logoColor={isGenzy ? GENZY_THEME.primary : undefined} />

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: festEnabled ? festNavBg : T.topBg, borderBottomColor: festEnabled ? festNavBg : T.border }]}>
        <Text style={[styles.searchIcon, festEnabled && { color: festNavText }]}>🔍</Text>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: festEnabled ? 'rgba(255,255,255,0.18)' : T.inputBg,
              borderColor: festEnabled ? 'rgba(255,255,255,0.25)' : T.inputBorder,
            },
            festEnabled && { color: festNavText },
          ]}
          placeholder="Search products, brands..."
          placeholderTextColor={festEnabled ? 'rgba(255,255,255,0.65)' : '#666'}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* Category strip */}
      <CategoryStrip
        categories={categories}
        activeSlug={activeSlug}
        isOfferActive={offerOnly}
        onPressCategory={handleCategoryPress}
        onPressOffers={handleOffersPress}
        onPressCombo={() => navigation.navigate('ComboList')}
        themeColor={T.stripBorder}
      />

      {/* Active filters tags row */}
      {hasAnyFilter && (
        <View style={[styles.filterSection, { backgroundColor: T.bg, borderBottomColor: T.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeTagsRow}>
            {offerOnly && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>🏷️ Offers</Text></View>}
            {activeSlug && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>📂 {categoryName}</Text></View>}
            {filters.sub_category && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>{filters.sub_category}</Text></View>}
            {filters.type     && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>👗 {filters.type}</Text></View>}
            {filters.material && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>🧵 {filters.material}</Text></View>}
            {filters.color    && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>🎨 {filters.color}</Text></View>}
            {filters.age_group && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>👶 {filters.age_group}</Text></View>}
            {filters.offer    && <View style={[styles.activeTag, { backgroundColor: T.tagBg, borderColor: T.primary }]}><Text style={[styles.activeTagText, { color: T.primary }]}>🏷️ Offers</Text></View>}
          </ScrollView>
          <TouchableOpacity onPress={clearAll} style={{ paddingHorizontal: 12 }}>
            <Text style={[styles.clearText, { color: T.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort chips + Filter icon */}
      <View style={[styles.sortRow, { backgroundColor: T.bg, borderBottomColor: T.border }]}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, { backgroundColor: T.surface, borderColor: T.border }, sort === opt.value && { backgroundColor: T.primary, borderColor: T.primary }]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.chipText, sort === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.resultCount}>{products.length}{hasMore ? '+' : ''} items</Text>

        {/* Filter button — right side of sort row */}
        <TouchableOpacity
          style={[styles.sortFilterBtn, { borderColor: T.primary, backgroundColor: T.surface }, activeFilterCount > 0 && { backgroundColor: T.tagBg }]}
          onPress={() => setShowFilter(true)}
        >
          <FilterIcon color={T.primary} size={16} />
          {activeFilterCount > 0 && (
            <View style={[styles.sortFilterBadge, { backgroundColor: T.primary }]}>
              <Text style={styles.sortFilterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Products grid */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={T.primary} /></View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛍</Text>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyHint}>Try adjusting your filters</Text>
          {hasAnyFilter && (
            <TouchableOpacity style={[styles.clearAllBtn, { backgroundColor: T.primary }]} onPress={clearAll}>
              <Text style={styles.clearAllBtnText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
          key={offerOnly ? 'offer-2col' : 'normal-2col'}
          contentContainerStyle={[styles.listContent, { backgroundColor: T.bg }]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={
            loadingMore
              ? <View style={styles.loadMoreBox}><ActivityIndicator size="small" color={T.primary} /></View>
              : null
          }
        />
      )}

      {/* Filter bottom sheet */}
      <FilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filters}
        onApply={(f) => setFilters(f)}
        opts={filterOpts}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff0f6' },

  /* Search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: { fontSize: 15, color: '#888' },
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

  /* Active filter bar */
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  activeTagsRow: { paddingLeft: 12, gap: 6 },
  activeTag: {
    backgroundColor: '#2a0a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeTagText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  clearText: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },

  /* Sort row */
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#0d0d0d',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  /* Filter btn inside sort row */
  sortFilterBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#1a1a1a',
    position: 'relative',
    gap: 4,
  },
  sortFilterBtnActive: {
    backgroundColor: '#2a0a1a',
  },
  sortFilterIcon: {
    fontSize: 16,
    color: COLORS.primary,
  },
  sortFilterIconActive: { color: COLORS.primary },
  sortFilterBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  sortFilterBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2e2e2e',
    backgroundColor: '#1a1a1a',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  resultCount: { fontSize: 11, color: '#999', fontWeight: '500', flexShrink: 1 },

  /* Grid */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#999', marginBottom: 16 },
  clearAllBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  clearAllBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  listContent: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 68, backgroundColor: COLORS.background },

  // Normal card wrap
  normalCardWrap: { width: CARD_WIDTH, margin: 5 },
  // Offer card wrap — gold shadow, no border
  offerCardWrap: {
    width: CARD_WIDTH,
    margin: 5,
    borderRadius: 14,
    overflow: 'hidden',
    // Premium gold glow (iOS)
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    // Android elevation
    elevation: 12,
  },
  productCard: { flex: 1 },
  loadMoreBox: { paddingVertical: 16, alignItems: 'center' },

  /* ── Filter sheet ── */
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFF8FB',
    borderRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 18,
    maxHeight: SCREEN_HEIGHT * 0.78,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    // Projected shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0c8dc',
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  sheetReset: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  sheetSection: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fchip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f0c8dc',
    backgroundColor: '#fff',
  },
  fchipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  fchipText: { fontSize: 12, color: '#222', fontWeight: '500' },
  fchipTextActive: { color: '#fff', fontWeight: '700' },

  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 18,
  },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  /* ── Dropdown select ── */
  dropdownWrap: {
    marginBottom: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#f0c8dc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownTriggerActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ffe0f0',
  },
  dropdownValue: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#c090b0',
    fontWeight: '400',
  },
  dropdownArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#c090b0',
    transform: [{ rotate: '-45deg' }],
    marginTop: -4,
  },
  dropdownArrowUp: {
    transform: [{ rotate: '135deg' }],
    marginTop: 2,
    borderColor: COLORS.primary,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0c8dc',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f8e0ec',
  },
  dropdownItemActive: {
    backgroundColor: '#ffe0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dropdownCheck: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '800',
  },
});
