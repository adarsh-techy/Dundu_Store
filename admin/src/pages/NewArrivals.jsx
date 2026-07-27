import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Search } from 'lucide-react';
import { productApi } from '../api';
import Spinner from '../components/ui/Spinner';
import CategoryChips from '../components/ui/CategoryChips';
import toast from 'react-hot-toast';

export default function NewArrivals() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'marked' | 'unmarked'
  const [category, setCategory] = useState('');
  const debounceRef = useRef(null);
  const loadMoreRef = useRef(null);
  const limit = 15;

  const newArrivalParam = filter === 'marked' ? 'true' : filter === 'unmarked' ? 'false' : undefined;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-products-new-arrivals', activeSearch, category, filter],
    queryFn: ({ pageParam }) => productApi.list({
      search: activeSearch || undefined,
      category: category || undefined,
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

  const { data: markedData } = useQuery({
    queryKey: ['admin-products-new-arrivals-count'],
    queryFn: () => productApi.list({ new_arrival: 'true', limit: 1 }),
  });
  const markedCount = markedData?.data?.total || 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-products-new-arrivals'] });
    qc.invalidateQueries({ queryKey: ['admin-products-new-arrivals-count'] });
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(val), 300);
  };

  const handleToggle = async (p) => {
    try {
      await productApi.toggleNewArrival(p.id);
      invalidate();
      toast.success(p.is_new_arrival ? 'Removed from New Arrivals' : 'Added to New Arrivals');
    } catch { toast.error('Failed to update'); }
  };

  /* ── lazy-load next page as the sentinel scrolls into view ── */
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" /> New Arrivals
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {markedCount} product{markedCount !== 1 ? 's' : ''} marked as new arrival — shown on the home page
          </p>
        </div>
      </div>

      {/* Category chips */}
      <CategoryChips value={category} onChange={setCategory} />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-medium">
          {[['all', 'All'], ['marked', 'New Arrival'], ['unmarked', 'Not Marked']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-md transition-colors ${filter === v ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="bg-green-50 rounded-2xl border border-pink-300 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><Spinner /></div>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No products found.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                {/* Image */}
                <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                  {p.primary_image
                    ? <img src={p.primary_image} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category_name} {p.brand_name ? `· ${p.brand_name}` : ''} · ₹{p.offer_price || p.price}</p>
                </div>

                {/* Stock badge */}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0
                  ${p.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                </span>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(p)}
                  className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
                    ${p.is_new_arrival
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {p.is_new_arrival ? 'New Arrival' : 'Mark'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── lazy-load sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && <span className="text-sm text-gray-400">Loading more…</span>}
        </div>
      )}
      {!hasNextPage && products.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {products.length} of {total}</div>
      )}
    </div>
  );
}
