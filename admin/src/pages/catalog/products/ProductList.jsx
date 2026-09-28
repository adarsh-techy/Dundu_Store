import { useState, useRef, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Star, Tag, Search, BarChart2,
  Package, RefreshCw, Filter, ArrowUpRight, CheckCircle2, AlertTriangle,
  Sparkles, RotateCcw,
} from 'lucide-react';
import { productApi, categoryApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice } from '../../../utils/format';
import toast from 'react-hot-toast';

export default function ProductList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'in_stock' | 'restock' | 'promoted'
  const [loadingToggle, setLoadingToggle] = useState(null); // e.g. `${p.id}_${field}`
  const tableContainerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const limit = 20;

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin-products', search, activeCategory, quickFilter],
    queryFn: ({ pageParam }) => productApi.list({
      search: search || undefined,
      category: activeCategory || undefined,
      stock_status: quickFilter === 'in_stock' ? 'in_stock' : quickFilter === 'restock' ? 'restock' : undefined,
      featured: quickFilter === 'promoted' ? 'true' : undefined,
      show_hidden: 'true',
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
  const stats = data?.pages?.[0]?.data?.stats || {
    total_active: total || 0,
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    featured_count: 0,
    offer_count: 0,
    total_units: 0,
  };

  const { data: catData } = useQuery({ queryKey: ['admin-categories'], queryFn: categoryApi.list });
  const categories = catData?.data?.categories || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-products'] });

  /* ── Reset table scroll to top whenever search or filters change ── */
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [search, activeCategory, quickFilter]);

  /* ── Lazy-load next page as sentinel row scrolls into view inside table ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    const container = tableContainerRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: container, rootMargin: '250px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, products.length]);

  /* ── Dual trigger on inside scroll for fast scrolling & flings ── */
  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const toggle = async (action, id, field, label) => {
    const key = `${id}_${field}`;
    setLoadingToggle(key);

    // Optimistically update React Query cache immediately for instant response
    qc.setQueriesData({ queryKey: ['admin-products'] }, (oldData) => {
      if (!oldData?.pages) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((pg) => ({
          ...pg,
          data: {
            ...pg.data,
            products: (pg.data?.products || []).map((prod) => {
              if (prod.id !== id) return prod;
              if (field === 'hidden') return { ...prod, is_hidden: !prod.is_hidden };
              if (field === 'featured') return { ...prod, is_featured: !prod.is_featured };
              if (field === 'offer') return { ...prod, is_offer_product: !prod.is_offer_product };
              return prod;
            }),
          },
        })),
      };
    });

    try {
      await action(id);
      invalidate();
      toast.success(`Product ${label}`);
    } catch {
      invalidate();
      toast.error('Failed to update product state');
    } finally {
      setLoadingToggle(null);
    }
  };

  const remove = async (id) => {
    if (!confirm('Move this product to Trash? It disappears from the store and can be restored from System → Trash within 30 days.')) return;
    try {
      await productApi.remove(id);
      invalidate();
      toast.success('Product moved to Trash');
    } catch (err) { toast.error(err?.message || 'Failed to delete product'); }
  };

  return (
    <div className="w-full space-y-6 pb-16">

      {/* ── 1. Top Executive Products Command Bar ────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Product Catalog
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {total} Active Item{total !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage online catalog, pricing, variants, images, and merchandising flags
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Products"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <Button onClick={() => navigate('/products/new')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" /> Add New Product
          </Button>
        </div>
      </div>

      {/* ── 2. Catalog KPI & Status Health Cards (Easy to Understand) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Catalog Products */}
        <div
          onClick={() => setQuickFilter('all')}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between select-none relative group ${
            quickFilter === 'all'
              ? 'border-slate-900 shadow-md ring-1 ring-slate-900/10'
              : 'border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200/80 shadow-2xs">
                <Package className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                quickFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {quickFilter === 'all' ? 'Active View' : 'All Items'}
              </span>
            </div>
            <div className="mt-3.5">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.total_active || total}
              </p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                Total Catalog Products
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">{stats.total_units?.toLocaleString?.() || 0} total units in stock</span>
            <span className="text-[10px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0">
              {categories.length} Depts →
            </span>
          </div>
        </div>

        {/* Card 2: Healthy Stock */}
        <div
          onClick={() => setQuickFilter((p) => p === 'in_stock' ? 'all' : 'in_stock')}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between select-none relative group ${
            quickFilter === 'in_stock'
              ? 'border-emerald-600 shadow-md ring-1 ring-emerald-600/20 bg-emerald-50/20'
              : 'border-slate-200/80 hover:border-emerald-200 shadow-2xs hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ready to Sell
              </span>
            </div>
            <div className="mt-3.5">
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {stats.in_stock}
              </p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                Healthy Stock (10+ Units)
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Ready for immediate checkout</span>
            <span className="text-[10px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0">
              {quickFilter === 'in_stock' ? 'Viewing' : 'Filter →'}
            </span>
          </div>
        </div>

        {/* Card 3: Needs Restock Alert */}
        <div
          onClick={() => setQuickFilter((p) => p === 'restock' ? 'all' : 'restock')}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between select-none relative group ${
            quickFilter === 'restock'
              ? 'border-amber-600 shadow-md ring-1 ring-amber-600/20 bg-amber-50/20'
              : 'border-slate-200/80 hover:border-amber-200 shadow-2xs hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${
                (stats.out_of_stock || 0) > 0
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                (stats.out_of_stock || 0) > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {(stats.out_of_stock || 0) > 0
                  ? `${stats.out_of_stock} Out of Stock`
                  : `${stats.low_stock || 0} Low Stock`}
              </span>
            </div>
            <div className="mt-3.5">
              <p className="text-2xl font-black text-amber-600 tracking-tight">
                {(stats.low_stock || 0) + (stats.out_of_stock || 0)}
              </p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                Restock Attention Needed
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">
              {stats.out_of_stock || 0} out • {stats.low_stock || 0} below 10 units
            </span>
            <span className="text-[10px] font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0">
              {quickFilter === 'restock' ? 'Viewing' : 'Inspect →'}
            </span>
          </div>
        </div>

        {/* Card 4: Storefront Merchandising */}
        <div
          onClick={() => setQuickFilter((p) => p === 'promoted' ? 'all' : 'promoted')}
          className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between select-none relative group ${
            quickFilter === 'promoted'
              ? 'border-violet-600 shadow-md ring-1 ring-violet-600/20 bg-violet-50/20'
              : 'border-slate-200/80 hover:border-violet-200 shadow-2xs hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shadow-2xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Storefront Rails
              </span>
            </div>
            <div className="mt-3.5">
              <p className="text-2xl font-black text-violet-700 tracking-tight">
                {(stats.featured_count || 0) + (stats.offer_count || 0)}
              </p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                Featured & Special Offers
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">
              {stats.featured_count || 0} trending • {stats.offer_count || 0} on offer
            </span>
            <span className="text-[10px] font-bold text-violet-600 group-hover:translate-x-0.5 transition-transform shrink-0">
              {quickFilter === 'promoted' ? 'Viewing' : 'Filter →'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Active Filter Banner ── */}
      {quickFilter !== 'all' && (
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Showing filter view:{' '}
              <strong className="text-white font-bold">
                {quickFilter === 'in_stock'
                  ? 'Healthy In-Stock Products (10+ Units)'
                  : quickFilter === 'restock'
                  ? 'Restock Attention (Low & Out of Stock)'
                  : 'Storefront Promoted & Special Offer Products'}
              </strong>
            </span>
          </div>
          <button
            onClick={() => setQuickFilter('all')}
            className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Show All Products</span>
          </button>
        </div>
      )}

      {/* ── 3. Filters & Search Strip ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, SKU, product code..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Category:
          </span>
          <button
            onClick={() => setActiveCategory('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !activeCategory
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.slug === activeCategory ? '' : c.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                activeCategory === c.slug
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Full-Width Products Ledger Table with Inside Scroll & Lazy Loading ─────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading catalog products...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          {/* Table Header Status Bar */}
          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200/70 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-700" />
                Product Catalog Ledger
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-medium">
                Showing <strong className="text-slate-900 font-bold">{products.length}</strong> of <strong className="text-slate-900 font-bold">{total}</strong> products
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isFetchingNextPage && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Lazy loading more...
                </span>
              )}
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
                Scroll inside table to lazy load
              </span>
            </div>
          </div>

          {/* Scrollable Table Viewport with Sticky Header */}
          <div
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            className="overflow-x-auto overflow-y-auto relative custom-table-scrollbar"
            style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '400px' }}
          >
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 z-20 border-b border-slate-200/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="sticky top-0 z-20 px-5 py-3.5 bg-slate-50/95 backdrop-blur-xs">Product</th>
                  <th className="sticky top-0 z-20 px-5 py-3.5 bg-slate-50/95 backdrop-blur-xs">Department</th>
                  <th className="sticky top-0 z-20 px-5 py-3.5 bg-slate-50/95 backdrop-blur-xs text-right">Price</th>
                  <th className="sticky top-0 z-20 px-5 py-3.5 bg-slate-50/95 backdrop-blur-xs text-center">Stock</th>
                  <th className="sticky top-0 z-20 px-5 py-3.5 bg-slate-50/95 backdrop-blur-xs text-center">Status & Badges</th>
                  <th className="sticky top-0 z-20 px-5 py-3.5 bg-slate-50/95 backdrop-blur-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-slate-400 text-xs">
                      <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No products matching the selected criteria
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => navigate(`/products/${p.id}`)}
                          className="flex items-center gap-3 text-left w-full hover:opacity-85 transition-opacity cursor-pointer"
                        >
                          <div className="w-10 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                            {p.primary_image ? (
                              <img
                                src={p.primary_image}
                                alt={p.name}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.product-img-fallback');
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                            <div
                              className="product-img-fallback w-full h-full flex items-center justify-center bg-slate-100 text-slate-400"
                              style={{ display: p.primary_image ? 'none' : 'flex' }}
                            >
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors text-xs">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.product_code && (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {p.product_code}
                                </span>
                              )}
                              {p.sku && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {p.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                        {p.category_name || 'General'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <p className="font-extrabold text-slate-900 text-xs">
                          {formatPrice(p.offer_price || p.price)}
                        </p>
                        {p.offer_price && (
                          <p className="text-[10px] text-slate-400 line-through">
                            {formatPrice(p.price)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          p.stock === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : p.stock < 10
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.stock === 0 ? 'bg-rose-500' : p.stock < 10 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {p.stock} units
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          {p.is_hidden && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Hidden
                            </span>
                          )}
                          {p.is_featured && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Trending
                            </span>
                          )}
                          {p.is_offer_product && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Offer
                            </span>
                          )}
                          {p.is_new_arrival && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                              New
                            </span>
                          )}
                          {!p.is_hidden && !p.is_featured && !p.is_offer_product && !p.is_new_arrival && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/products/${p.id}`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                            title="View Product Details"
                          >
                            <BarChart2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/products/${p.id}/edit`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit Product"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {/* 1. Store Visibility Toggle */}
                          <button
                            onClick={() => toggle(productApi.toggleHidden, p.id, 'hidden', p.is_hidden ? 'now visible in store' : 'now hidden from store')}
                            disabled={loadingToggle === `${p.id}_hidden`}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              loadingToggle === `${p.id}_hidden`
                                ? 'bg-slate-100 text-slate-400 border-slate-200'
                                : !p.is_hidden
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-300 hover:bg-emerald-100 shadow-xs'
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                            }`}
                            title={!p.is_hidden ? 'Status: Active (Visible in Store) · Click to Hide' : 'Status: Hidden from Store · Click to Make Visible'}
                          >
                            {loadingToggle === `${p.id}_hidden` ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : !p.is_hidden ? (
                              <Eye className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            )}
                          </button>

                          {/* 2. Featured / Trending Toggle */}
                          <button
                            onClick={() => toggle(productApi.toggleFeatured, p.id, 'featured', p.is_featured ? 'removed from featured' : 'marked as featured')}
                            disabled={loadingToggle === `${p.id}_featured`}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              loadingToggle === `${p.id}_featured`
                                ? 'bg-amber-50 text-amber-500 border-amber-200'
                                : p.is_featured
                                ? 'bg-amber-50 text-amber-600 border-amber-300 hover:bg-amber-100 shadow-xs ring-1 ring-amber-400/30'
                                : 'text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600'
                            }`}
                            title={p.is_featured ? 'Status: Featured / Trending (Active) · Click to Remove' : 'Status: Not Featured · Click to Make Featured'}
                          >
                            {loadingToggle === `${p.id}_featured` ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                            ) : (
                              <Star className={`h-4 w-4 transition-transform ${p.is_featured ? 'fill-amber-400 text-amber-500 scale-110' : 'text-slate-400'}`} />
                            )}
                          </button>

                          {/* 3. Special Offer Toggle */}
                          <button
                            onClick={() => toggle(productApi.toggleOffer, p.id, 'offer', p.is_offer_product ? 'removed from special offers' : 'marked as special offer')}
                            disabled={loadingToggle === `${p.id}_offer`}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              loadingToggle === `${p.id}_offer`
                                ? 'bg-rose-50 text-rose-500 border-rose-200'
                                : p.is_offer_product
                                ? 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100 shadow-xs ring-1 ring-rose-400/30'
                                : 'text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600'
                            }`}
                            title={p.is_offer_product ? 'Status: Special Offer Active · Click to Remove' : 'Status: No Special Offer · Click to Mark as Offer'}
                          >
                            {loadingToggle === `${p.id}_offer` ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-rose-500" />
                            ) : (
                              <Tag className={`h-4 w-4 transition-transform ${p.is_offer_product ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'}`} />
                            )}
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {/* ── Inside Table Lazy-Load Trigger Sentinel ── */}
                {hasNextPage && (
                  <tr ref={loadMoreRef}>
                    <td colSpan={6} className="py-6 text-center bg-slate-50/40">
                      <div className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Loading next batch of products...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Status Strip */}
          <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              {products.length === total && total > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  All {total} catalog products loaded
                </span>
              ) : (
                <span>
                  Showing <strong className="text-slate-800">{products.length}</strong> of <strong className="text-slate-800">{total}</strong> products
                  {total > products.length && ` • ${total - products.length} remaining`}
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Inside table scroll active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
