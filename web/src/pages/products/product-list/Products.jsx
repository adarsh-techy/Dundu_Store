import { useMemo, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import { productApi, categoryApi } from '../../../api';
import ProductCard from '../../../components/product/ProductCard';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import { ProductGridSkeleton } from '../../../components/ui/Skeleton';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import { isGenzyMatch } from '../../../store/theme.store';

const COLOR_SWATCHES = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  black: '#111111', white: '#f5f5f5', pink: '#ec4899', purple: '#a855f7',
  orange: '#f97316', brown: '#92400e', grey: '#6b7280', gray: '#6b7280',
  navy: '#1e3a5f', beige: '#d4b896', cream: '#fef3c7', maroon: '#7f1d1d',
  violet: '#7c3aed', indigo: '#4338ca', teal: '#0d9488', cyan: '#06b6d4',
  lime: '#84cc16', coral: '#f43f5e', gold: '#f59e0b', silver: '#9ca3af',
  turquoise: '#14b8a6', magenta: '#d946ef', rose: '#f43f5e', peach: '#ffb385',
  mint: '#98e2c6', lavender: '#c4b5fd', olive: '#6b8e23', mustard: '#e1ad01',
};

const SORTS = [
  { value: '', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];
const PAGE_SIZE = 24;

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line pb-4">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full py-1 mb-2" aria-expanded={open}>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="animate-fade-in">{children}</div>}
    </div>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const get = (k) => searchParams.get(k) || '';
  const activeCategory = get('category');
  const activeColor = get('color');
  const activeType = get('type');
  const activeMaterial = get('material');
  const sort = get('sort');
  const minPrice = get('min_price');
  const maxPrice = get('max_price');
  const inStock = get('in_stock') === 'true';
  const search = get('search');
  const isOffer = get('offer') === 'true';
  const isNewArrival = get('new_arrival') === 'true';
  const isFeatured = get('featured') === 'true';

  const params = useMemo(() => ({
    category: activeCategory || undefined,
    search: search || undefined,
    featured: isFeatured || undefined,
    offer: isOffer || undefined,
    new_arrival: isNewArrival || undefined,
    color: activeColor || undefined,
    type: activeType || undefined,
    material: activeMaterial || undefined,
    sort: sort || undefined,
    min_price: minPrice || undefined,
    max_price: maxPrice || undefined,
    in_stock: inStock || undefined,
    limit: PAGE_SIZE,
  }), [activeCategory, search, isFeatured, isOffer, isNewArrival, activeColor, activeType, activeMaterial, sort, minPrice, maxPrice, inStock]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['products', params],
    queryFn: ({ pageParam = 1 }) => productApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last?.data?.has_more ? (last.data.page || 1) + 1 : undefined),
  });

  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.list, staleTime: 5 * 60 * 1000 });
  const { data: filterData } = useQuery({ queryKey: ['product-filters'], queryFn: productApi.getFilters, staleTime: 5 * 60 * 1000 });

  const products = useMemo(() => (data?.pages || []).flatMap((pg) => pg?.data?.products || []), [data]);
  const total = data?.pages?.[0]?.data?.total ?? products.length;
  const hasMore = !!hasNextPage;
  const categories = catData?.data?.categories || [];
  const colors = filterData?.data?.colors || [];
  const types = filterData?.data?.types || [];
  const materials = filterData?.data?.materials || [];

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };
  const toggleFilter = (key, value, current) => setFilter(key, current === value ? '' : value);
  const setCategory = (slug) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('category', slug); else next.delete('category');
    next.delete('search');
    setSearchParams(next);
  };
  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    ['color', 'type', 'material', 'min_price', 'max_price', 'in_stock', 'offer', 'new_arrival', 'featured'].forEach((k) => next.delete(k));
    setSearchParams(next);
  };

  const activeCount = [activeColor, activeType, activeMaterial, minPrice, maxPrice, inStock ? '1' : ''].filter(Boolean).length;

  const title = search
    ? `Results for “${search}”`
    : activeCategory
      ? categories.find((c) => c.slug === activeCategory)?.name || 'Products'
      : isOffer ? 'Exclusive offers'
      : isNewArrival ? 'New arrivals'
      : isFeatured ? 'Trending'
      : 'All products';
  const activeCategoryObj = categories.find((c) => c.slug === activeCategory);
  const isGenzy = isGenzyMatch(activeCategory, activeCategoryObj?.name);
  const isCustomThemed = Boolean((activeCategoryObj?.theme_enabled && activeCategoryObj?.theme_color) || isGenzy);
  const themeAccent = activeCategoryObj?.theme_color || (isGenzy ? '#22c55e' : null);
  const themeBg = activeCategoryObj?.theme_bg_color || (isGenzy ? '#040d04' : null);
  useDocumentTitle(title);

  // Draft is keyed on the URL values, so it resets whenever a chip/clear changes them.
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice, key: `${minPrice}|${maxPrice}` });
  const draft = priceDraft.key === `${minPrice}|${maxPrice}` ? priceDraft : { min: minPrice, max: maxPrice, key: `${minPrice}|${maxPrice}` };
  const setDraft = (patch) => setPriceDraft({ ...draft, ...patch });
  const applyPrice = () => {
    const next = new URLSearchParams(searchParams);
    if (draft.min) next.set('min_price', draft.min); else next.delete('min_price');
    if (draft.max) next.set('max_price', draft.max); else next.delete('max_price');
    setSearchParams(next);
  };

  const listBtn = (active) => `text-sm w-full text-left px-2.5 py-1.5 rounded-lg transition-colors capitalize ${active ? 'bg-primary/10 text-primary-soft font-semibold' : 'text-muted hover:text-ink hover:bg-white/5'}`;

  const filterPanel = (
    <div className="space-y-5">
      <FilterSection title="Category">
        <ul className="space-y-0.5">
          <li><button onClick={() => setCategory('')} className={listBtn(!activeCategory)}>All</button></li>
          {categories.map((c) => (
            <li key={c.id}><button onClick={() => setCategory(c.slug)} className={listBtn(activeCategory === c.slug)}>{c.name}</button></li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Price">
        <div className="flex items-center gap-2">
          <input type="number" min="0" placeholder="Min" value={draft.min} onChange={(e) => setDraft({ min: e.target.value })} className="input h-9 text-xs" aria-label="Minimum price" />
          <span className="text-faint">–</span>
          <input type="number" min="0" placeholder="Max" value={draft.max} onChange={(e) => setDraft({ max: e.target.value })} className="input h-9 text-xs" aria-label="Maximum price" />
          <Button size="xs" variant="secondary" onClick={applyPrice}>Go</Button>
        </div>
        <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
          <button role="switch" aria-checked={inStock} className="switch" onClick={() => setFilter('in_stock', inStock ? '' : 'true')} />
          <span className="text-sm text-ink-2">In stock only</span>
        </label>
      </FilterSection>

      {colors.length > 0 && (
        <FilterSection title="Colour">
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button key={color} onClick={() => toggleFilter('color', color, activeColor)} className={`chip capitalize ${activeColor === color ? 'is-active' : ''}`}>
                <span className="w-3 h-3 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: COLOR_SWATCHES[color.toLowerCase()] || '#888' }} />
                {color}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {types.length > 0 && (
        <FilterSection title="Type" defaultOpen={false}>
          <ul className="space-y-0.5">
            {types.map((t) => <li key={t}><button onClick={() => toggleFilter('type', t, activeType)} className={listBtn(activeType === t)}>{t}</button></li>)}
          </ul>
        </FilterSection>
      )}

      {materials.length > 0 && (
        <FilterSection title="Material" defaultOpen={false}>
          <ul className="space-y-0.5">
            {materials.map((m) => <li key={m}><button onClick={() => toggleFilter('material', m, activeMaterial)} className={listBtn(activeMaterial === m)}>{m}</button></li>)}
          </ul>
        </FilterSection>
      )}
    </div>
  );

  const chips = [
    activeColor && { k: 'color', label: activeColor },
    activeType && { k: 'type', label: activeType },
    activeMaterial && { k: 'material', label: activeMaterial },
    (minPrice || maxPrice) && { k: 'price', label: `₹${minPrice || 0} – ₹${maxPrice || '∞'}` },
    inStock && { k: 'in_stock', label: 'In stock' },
  ].filter(Boolean);
  const removeChip = (k) => {
    if (k === 'price') { const n = new URLSearchParams(searchParams); n.delete('min_price'); n.delete('max_price'); setSearchParams(n); }
    else setFilter(k, '');
  };

  return (
    <div>
      {isOffer && (
        <div className="relative overflow-hidden border-b border-line">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(233,30,140,0.35),transparent_60%)]" />
          <div className="container-x relative py-12 md:py-16 text-center">
            <p className="eyebrow mb-3">✦ Limited time ✦</p>
            <h1 className="font-display text-4xl md:text-6xl text-ink">Exclusive offers</h1>
            <p className="mt-3 text-sm md:text-base text-ink-2">Handpicked deals, refreshed every week.</p>
          </div>
        </div>
      )}

      {isCustomThemed && !isOffer && (
        <div
          className="relative overflow-hidden border-b border-line"
          style={{
            background: themeBg
              ? `linear-gradient(180deg, ${themeBg} 0%, rgba(10,10,12,0.95) 100%)`
              : `linear-gradient(180deg, ${themeAccent}22 0%, transparent 100%)`,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${themeAccent}33 0%, transparent 70%)`,
            }}
          />
          <div className="container-x relative py-10 md:py-14 text-center">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest mb-3.5"
              style={{
                backgroundColor: `${themeAccent}20`,
                color: themeAccent,
                border: `1px solid ${themeAccent}50`,
                boxShadow: `0 0 24px ${themeAccent}40`,
              }}
            >
              ✦ {title.toUpperCase()} · EXCLUSIVE THEME ✦
            </span>
            <h1 className="font-display text-4xl md:text-6xl text-ink font-black tracking-tight drop-shadow-sm">
              {title}
            </h1>
            <p
              className="mt-3 text-sm md:text-base max-w-lg mx-auto font-medium leading-relaxed"
              style={{ color: `${themeAccent}dd` }}
            >
              {isGenzy
                ? 'Next-gen streetwear, oversized silhouettes & cyber aesthetics curated for the bold.'
                : `Explore exclusive curated collections and trending items in ${title}.`}
            </p>
          </div>
        </div>
      )}

      <div className="container-x py-6 md:py-10">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            {!isOffer && !isCustomThemed && <h1 className="font-display text-3xl md:text-4xl text-ink">{title}</h1>}
            {isCustomThemed && (
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: themeAccent }}
              >
                {title} Collection
              </p>
            )}
            <p className="text-xs text-muted mt-1">{isLoading ? 'Loading…' : `${total} ${total === 1 ? 'product' : 'products'}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Sort by</span>
              <select value={sort} onChange={(e) => setFilter('sort', e.target.value)} className="input h-10 text-xs pr-9 w-auto rounded-full">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <button onClick={() => setShowFilters(true)} className={`lg:hidden chip h-10 px-4 ${activeCount ? 'is-active' : ''}`}>
              <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {chips.map((c) => (
              <span key={c.k} className="chip is-active capitalize">
                {c.label}
                <button onClick={() => removeChip(c.k)} aria-label={`Remove ${c.label} filter`}><X className="h-3 w-3" /></button>
              </span>
            ))}
            <button onClick={clearAll} className="text-xs text-muted hover:text-ink underline-offset-2 hover:underline">Clear all</button>
          </div>
        )}

        <div className="grid lg:grid-cols-[250px_1fr] gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block sticky top-32 h-fit max-h-[calc(100vh-9rem)] overflow-y-auto pr-2 scrollbar-none">{filterPanel}</aside>

          {/* Mobile sheet */}
          {showFilters && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm lg:hidden animate-fade-in"
              onClick={(e) => { if (e.target === e.currentTarget) setShowFilters(false); }}>
              <div className="w-full h-[92vh] bg-surface border-t border-line rounded-t-3xl flex flex-col animate-slide-up">
                <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
                  <p className="font-display text-lg text-ink">Filters</p>
                  <button onClick={() => setShowFilters(false)} className="text-muted hover:text-ink" aria-label="Close filters"><X className="h-5 w-5" /></button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4">{filterPanel}</div>
                <div className="px-5 py-4 border-t border-line flex gap-3 shrink-0 safe-bottom">
                  <Button variant="secondary" fullWidth onClick={clearAll}>Clear all</Button>
                  <Button fullWidth onClick={() => setShowFilters(false)}>Show {total} results</Button>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          <div>
            {isLoading && !products.length ? (
              <ProductGridSkeleton count={12} />
            ) : products.length === 0 ? (
              <EmptyState icon={Search} title="Nothing here yet" description={search ? `We couldn't find anything for “${search}”. Try a different word or browse the categories.` : 'Try clearing a filter or two.'}
                action={activeCount || search ? 'Clear filters' : 'Browse all'} onAction={() => { clearAll(); if (search) setCategory(''); }} />
            ) : (
              <>
                <div className="product-grid">
                  {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
                </div>
                {hasMore && (
                  <div className="flex flex-col items-center gap-2 mt-10">
                    <p className="text-xs text-muted">Showing {products.length} of {total}</p>
                    <Button variant="secondary" pill loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Load more</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
