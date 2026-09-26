import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Package,
  Layers,
  Check,
  Plus,
  X,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { productApi, categoryApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function NewArrivals() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'marked' | 'unmarked'
  const [selectedCategory, setSelectedCategory] = useState('');
  const debounceRef = useRef(null);
  const loadMoreRef = useRef(null);
  const limit = 20;

  const newArrivalParam = filter === 'marked' ? 'true' : filter === 'unmarked' ? 'false' : undefined;

  // Categories list
  const { data: catData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryApi.list,
  });
  const categories = catData?.data?.categories || [];

  // Products Infinite Query
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-products-new-arrivals', activeSearch, selectedCategory, filter],
    queryFn: ({ pageParam }) => productApi.list({
      search: activeSearch || undefined,
      category: selectedCategory || undefined,
      new_arrival: newArrivalParam,
      page: pageParam,
      limit,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.products?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });

  const products = data?.pages.flatMap((p) => p.data?.products || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;

  // Total New Arrivals count
  const { data: markedData } = useQuery({
    queryKey: ['admin-products-new-arrivals-count'],
    queryFn: () => productApi.list({ new_arrival: 'true', limit: 1 }),
  });
  const markedCount = markedData?.data?.total || 0;

  // Total catalog count
  const { data: totalCatalogData } = useQuery({
    queryKey: ['admin-products-total-count'],
    queryFn: () => productApi.list({ limit: 1 }),
  });
  const totalCatalogCount = totalCatalogData?.data?.total || 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-products-new-arrivals'] });
    qc.invalidateQueries({ queryKey: ['admin-products-new-arrivals-count'] });
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(val), 250);
  };

  const clearSearch = () => {
    setSearch('');
    setActiveSearch('');
  };

  const handleToggle = async (p) => {
    try {
      await productApi.toggleNewArrival(p.id);
      invalidate();
      toast.success(
        p.is_new_arrival
          ? `Removed "${p.name}" from New Arrivals`
          : `Added "${p.name}" to New Arrivals`
      );
    } catch {
      toast.error('Failed to update product');
    }
  };

  /* Lazy-load next page */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '250px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Storefront Showcase
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {markedCount} Featured on Homepage
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">New Arrivals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select and curate the fresh clothing styles and collections featured prominently on the storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCategory || activeSearch || filter !== 'all' ? (
            <button
              onClick={() => {
                setSelectedCategory('');
                clearSearch();
                setFilter('all');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* 3 Executive Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Featured Count */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live in Showcase</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{markedCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Products marked as New Arrival</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Catalog Total */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Catalog</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCatalogCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Available styles in inventory</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Showcase Share */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Showcase Ratio</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {totalCatalogCount > 0 ? `${Math.round((markedCount / totalCatalogCount) * 100)}%` : '0%'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Share of catalog featured</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
            <Layers className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search by product name, SKU, or brand..."
              className="w-full pl-10 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold shrink-0">
            {[
              { id: 'all', label: 'All Products' },
              { id: 'marked', label: `New Arrivals (${markedCount})` },
              { id: 'unmarked', label: 'Not Featured' },
            ].map((t) => {
              const active = filter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 text-xs">
            <span className="text-slate-400 font-medium mr-1 shrink-0">Category:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-xl font-medium transition-colors shrink-0 ${
                !selectedCategory
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => {
              const isSelected = selectedCategory === c.slug;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? '' : c.slug)}
                  className={`px-3 py-1 rounded-xl font-medium transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-medium">Loading catalog styles...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-800">No products found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No products match your current search query or category filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Category & Brand</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Stock Status</th>
                  <th className="py-3.5 px-6 text-center">Homepage Showcase</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isMarked = p.is_new_arrival;
                  const inStock = p.stock > 0;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isMarked ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-14 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0 overflow-hidden relative">
                            {p.primary_image ? (
                              <img
                                src={p.primary_image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate max-w-xs">{p.name}</p>
                            {p.sku && (
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                SKU: {p.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="py-4 px-6">
                        <p className="font-medium text-slate-800">{p.category_name || 'General'}</p>
                        {p.brand_name && (
                          <p className="text-xs text-slate-400 mt-0.5">{p.brand_name}</p>
                        )}
                      </td>

                      {/* Pricing */}
                      <td className="py-4 px-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-slate-900">
                            ₹{p.offer_price || p.price}
                          </span>
                          {p.offer_price && p.price > p.offer_price && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{p.price}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Status */}
                      <td className="py-4 px-6">
                        {inStock ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {p.stock} in stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Out of stock
                          </span>
                        )}
                      </td>

                      {/* Showcase Status */}
                      <td className="py-4 px-6 text-center">
                        {isMarked ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-slate-900 text-white shadow-xs">
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            Featured
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* 1-Click Action Toggle */}
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggle(p)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                            isMarked
                              ? 'border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50'
                              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                          }`}
                        >
                          {isMarked ? (
                            <>
                              <X className="h-3.5 w-3.5" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Add to New
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Lazy load footer sentinel */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex items-center justify-center py-6 border-t border-slate-100">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Spinner size="sm" />
                <span>Loading more products...</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Scroll for more products</span>
            )}
          </div>
        )}
        {!hasNextPage && products.length > 0 && (
          <div className="text-center py-4 text-xs font-medium text-slate-400 border-t border-slate-100 bg-slate-50/40">
            Showing all {products.length} of {total} products
          </div>
        )}
      </div>
    </div>
  );
}
