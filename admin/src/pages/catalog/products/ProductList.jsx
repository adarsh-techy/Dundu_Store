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

  /* ── Lazy-load next page as sentinel scrolls into view ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggle = async (action, id, label) => {
    try {
      await action(id);
      invalidate();
      toast.success(`Product ${label}`);
    } catch { toast.error('Failed to update product state'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this product? If it has order history it will be hidden instead.')) return;
    try {
      const res = await productApi.remove(id);
      invalidate();
      if (res.data?.soft_deleted) {
        toast('Product hidden — it has past order history and cannot be deleted permanently.', {
          icon: '⚠️', duration: 4000,
          style: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
        });
      } else {
        toast.success('Product permanently deleted');
      }
    } catch { toast.error('Failed to delete product'); }
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

      {/* ── 3. Full-Width Products Ledger Table ─────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading catalog products...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5 text-right">Price</th>
                  <th className="px-5 py-3.5 text-center">Stock</th>
                  <th className="px-5 py-3.5 text-center">Status & Badges</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-xs">
                      <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No products matching the selected criteria
                    </td>
                  </tr>
                ) : products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/products/${p.id}`)}
                        className="flex items-center gap-3 text-left w-full hover:opacity-85 transition-opacity cursor-pointer"
                      >
                        <div className="w-10 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.primary_image ? (
                            <img src={p.primary_image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
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
                        <button
                          onClick={() => toggle(productApi.toggleHidden, p.id, p.is_hidden ? 'shown' : 'hidden')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                          title={p.is_hidden ? 'Make Visible' : 'Hide from Store'}
                        >
                          {p.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => toggle(productApi.toggleFeatured, p.id, p.is_featured ? 'unfeatured' : 'featured')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            p.is_featured ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title="Toggle Trending"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggle(productApi.toggleOffer, p.id, p.is_offer_product ? 'removed from offers' : 'marked as offer')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            p.is_offer_product ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title="Toggle Special Offer"
                        >
                          <Tag className="h-4 w-4" />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Lazy-load Sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && <span className="text-xs text-slate-400 font-semibold">Loading more products...</span>}
        </div>
      )}
      {!hasNextPage && products.length > 0 && (
        <div className="text-center py-4 text-xs text-slate-400 font-medium">
          Showing all {products.length} of {total} products
        </div>
      )}
    </div>
  );
}
