import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { productApi, categoryApi } from '../../../api';
import ProductCard from '../../../components/product/ProductCard';
import Spinner from '../../../components/ui/Spinner';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

const COLOR_SWATCHES = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  black: '#111111', white: '#f5f5f5', pink: '#ec4899', purple: '#a855f7',
  orange: '#f97316', brown: '#92400e', grey: '#6b7280', gray: '#6b7280',
  navy: '#1e3a5f', beige: '#d4b896', cream: '#fef3c7', maroon: '#7f1d1d',
  violet: '#7c3aed', indigo: '#4338ca', teal: '#0d9488', cyan: '#06b6d4',
  lime: '#84cc16', coral: '#f43f5e', gold: '#f59e0b', silver: '#9ca3af',
  turquoise: '#14b8a6', magenta: '#d946ef', rose: '#f43f5e',
};

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #2e2e2e', paddingBottom: '16px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full mb-3"
      >
        <p className="text-sm font-semibold" style={{ color: '#ddd' }}>{title}</p>
        <span className="text-xs" style={{ color: '#666' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && children}
    </div>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const activeCategory = searchParams.get('category') || '';
  const activeColor    = searchParams.get('color') || '';
  const activeType     = searchParams.get('type') || '';
  const activeMaterial = searchParams.get('material') || '';

  const params = {
    category:    activeCategory || undefined,
    search:      searchParams.get('search') || undefined,
    featured:    searchParams.get('featured') || undefined,
    offer:       searchParams.get('offer') || undefined,
    new_arrival: searchParams.get('new_arrival') || undefined,
    color:       activeColor || undefined,
    type:        activeType || undefined,
    material:    activeMaterial || undefined,
    sort:        searchParams.get('sort') || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.list(params),
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  const { data: filterData } = useQuery({
    queryKey: ['product-filters'],
    queryFn: productApi.getFilters,
    staleTime: 5 * 60 * 1000,
  });

  const products   = data?.data?.products || [];
  const categories = catData?.data?.categories || [];
  const colors     = filterData?.data?.colors || [];
  const types      = filterData?.data?.types || [];
  const materials  = filterData?.data?.materials || [];

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const toggleFilter = (key, value, current) => {
    setFilter(key, current === value ? '' : value);
  };

  const setCategory = (slug) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('category', slug); else next.delete('category');
    next.delete('search');
    setSearchParams(next);
  };

  const activeCount = [activeCategory, activeColor, activeType, activeMaterial].filter(Boolean).length;

  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('color'); next.delete('type'); next.delete('material');
    next.delete('offer'); next.delete('new_arrival'); next.delete('featured');
    setSearchParams(next);
  };

  const isOffer       = searchParams.get('offer') === 'true';
  const isNewArrival  = searchParams.get('new_arrival') === 'true';

  const title = searchParams.get('search')
    ? `Results for "${searchParams.get('search')}"`
    : activeCategory
      ? categories.find((c) => c.slug === activeCategory)?.name || 'Products'
      : isOffer        ? 'Exclusive Offers'
      : isNewArrival   ? 'New Arrivals'
      : searchParams.get('featured') === 'true' ? 'Trending Products'
      : 'All Products';

  const filterPanel = (
    <div className="space-y-5">
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeColor && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#1a0a12', color: '#e91e8c', border: '1px solid #3d1226' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_SWATCHES[activeColor] || '#888' }} />
              {activeColor}
              <button onClick={() => setFilter('color', '')}><X className="h-3 w-3 ml-0.5" /></button>
            </span>
          )}
          {activeType && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#1a0a12', color: '#e91e8c', border: '1px solid #3d1226' }}>
              {activeType}
              <button onClick={() => setFilter('type', '')}><X className="h-3 w-3 ml-0.5" /></button>
            </span>
          )}
          {activeMaterial && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#1a0a12', color: '#e91e8c', border: '1px solid #3d1226' }}>
              {activeMaterial}
              <button onClick={() => setFilter('material', '')}><X className="h-3 w-3 ml-0.5" /></button>
            </span>
          )}
          <button onClick={clearAll} className="text-xs hover:underline" style={{ color: '#666' }}>Clear all</button>
        </div>
      )}

      <FilterSection title="Category">
        <ul className="space-y-1">
          <li>
            <button onClick={() => setCategory('')}
              className="text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors"
              style={!activeCategory
                ? { backgroundColor: '#1a0a12', color: '#e91e8c', fontWeight: 600 }
                : { color: '#888' }}>
              All
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button onClick={() => setCategory(c.slug)}
                className="text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors capitalize"
                style={activeCategory === c.slug
                  ? { backgroundColor: '#1a0a12', color: '#e91e8c', fontWeight: 600 }
                  : { color: '#888' }}>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </FilterSection>

      {colors.length > 0 && (
        <FilterSection title="Color">
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const swatch = COLOR_SWATCHES[color] || '#888';
              const isActive = activeColor === color;
              return (
                <button key={color}
                  onClick={() => toggleFilter('color', color, activeColor)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all"
                  style={isActive
                    ? { backgroundColor: '#1a0a12', color: '#e91e8c', border: '1px solid #e91e8c' }
                    : { color: '#888', border: '1px solid #2e2e2e' }}>
                  <span className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: swatch, border: color === 'white' ? '1px solid #555' : 'none' }} />
                  {color}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {types.length > 0 && (
        <FilterSection title="Type">
          <ul className="space-y-1">
            {types.map((type) => (
              <li key={type}>
                <button onClick={() => toggleFilter('type', type, activeType)}
                  className="text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors capitalize"
                  style={activeType === type
                    ? { backgroundColor: '#1a0a12', color: '#e91e8c', fontWeight: 600 }
                    : { color: '#888' }}>
                  {type}
                </button>
              </li>
            ))}
          </ul>
        </FilterSection>
      )}

      {materials.length > 0 && (
        <FilterSection title="Material">
          <ul className="space-y-1">
            {materials.map((mat) => (
              <li key={mat}>
                <button onClick={() => toggleFilter('material', mat, activeMaterial)}
                  className="text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors capitalize"
                  style={activeMaterial === mat
                    ? { backgroundColor: '#1a0a12', color: '#e91e8c', fontWeight: 600 }
                    : { color: '#888' }}>
                  {mat}
                </button>
              </li>
            ))}
          </ul>
        </FilterSection>
      )}
    </div>
  );

  return (
    <div>
      {/* Pink offer banner */}
      {isOffer && (
        <div style={{ background: 'linear-gradient(135deg, #6d0f3a 0%, #be185d 45%, #e91e8c 75%, #ff6eb4 100%)', padding: '2.5rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#fce7f3', marginBottom: '8px', opacity: 0.85 }}>✦ Limited Time ✦</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: '8px', textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>Exclusive Offers</h1>
          <p style={{ fontSize: '14px', color: '#fce7f3', opacity: 0.9 }}>Handpicked deals just for you ✨</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4" style={{ paddingTop: isOffer ? '1.5rem' : '2rem', paddingBottom: '2rem' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            {!isOffer && <h1 className="text-2xl font-bold" style={{ color: '#f5f5f5' }}>{title}</h1>}
            {products.length > 0 && (
              <p className="text-xs mt-1" style={{ color: '#555' }}>{products.length} products</p>
            )}
          </div>
          <button onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 transition-colors"
            style={{ color: activeCount > 0 ? '#e91e8c' : '#bbb', border: `1px solid ${activeCount > 0 ? '#3d1226' : '#2e2e2e'}`, backgroundColor: activeCount > 0 ? '#1a0a12' : 'transparent' }}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters {activeCount > 0 && `(${activeCount})`}
          </button>
        </div>

        {/* Filter bottom sheet — almost full screen */}
        {showFilters && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowFilters(false); }}
          >
            <div style={{
              width: '100%', height: '93vh',
              backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e',
              borderRadius: '1.25rem 1.25rem 0 0',
              boxShadow: '0 -10px 60px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #2e2e2e', flexShrink: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '15px', color: '#f5f5f5' }}>Filters</p>
                <button onClick={() => setShowFilters(false)} style={{ color: '#666' }}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: '1 1 0px', padding: '1rem 1.25rem' }}>
                {filterPanel}
              </div>

              {/* Footer */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #2e2e2e', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={clearAll}
                  style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: 600, border: '1px solid #2e2e2e', color: '#888', backgroundColor: '#111' }}
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: 600, color: '#fff', backgroundColor: '#e91e8c' }}
                >
                  Show Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1">
          {isLoading ? (
            <Spinner />
          ) : products.length === 0 ? (
            <div className="text-center py-20" style={{ color: '#555' }}>
              <p className="text-4xl mb-3">🛍️</p>
              <p className="mb-2">No products found</p>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-sm hover:underline" style={{ color: '#e91e8c' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
