import { useState, useRef, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Tag, Search, BarChart2 } from 'lucide-react';
import { productApi, categoryApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice } from '../../../utils/format';
import ProductForm from './ProductForm';
import toast from 'react-hot-toast';

export default function ProductList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | product (full)
  const [editLoading, setEditLoading] = useState(false);
  const loadMoreRef = useRef(null);
  const limit = 15;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-products', search, activeCategory],
    queryFn: ({ pageParam }) => productApi.list({
      search: search || undefined,
      category: activeCategory || undefined,
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

  const { data: catData } = useQuery({ queryKey: ['admin-categories'], queryFn: categoryApi.list });
  const categories = catData?.data?.categories || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-products'] });

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

  const toggle = async (action, id, label) => {
    try {
      await action(id);
      invalidate();
      toast.success(`Product ${label}`);
    } catch { toast.error('Failed'); }
  };

  const openEdit = async (p) => {
    setEditLoading(p.id);
    try {
      const res = await productApi.getOne(p.id);
      setModal(res.data?.product || p);
    } catch { setModal(p); }
    finally { setEditLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this product? If it has order history it will be hidden instead.')) return;
    try {
      const res = await productApi.remove(id);
      invalidate();
      if (res.data?.soft_deleted) {
        toast('Product hidden — it has order history and cannot be permanently deleted.', {
          icon: '⚠️', duration: 4000,
          style: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
        });
      } else {
        toast.success('Product permanently deleted');
      }
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{total} product{total !== 1 ? 's' : ''}</span>
          <Button onClick={() => setModal('add')} size="sm">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
          className="w-full pl-9 pr-4 py-2 border border-gray-900 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            !activeCategory
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.slug === activeCategory ? '' : c.slug)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
              activeCategory === c.slug
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-pink-100 text-xs text-pink-500 uppercase tracking-wide">
              <tr>
                {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No products found</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/products/${p.id}`)}
                      className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity w-full">
                      <img src={p.primary_image || '/placeholder.jpg'} alt={p.name}
                        className="w-9 h-11 object-cover rounded-lg bg-gray-100 shrink-0" />
                      <div>
                        <p className="font-medium text-indigo-600 line-clamp-1 hover:underline">{p.name}</p>
                        {p.product_code && (
                          <p className="text-xs font-mono font-semibold text-indigo-400">{p.product_code}</p>
                        )}
                        {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category_name}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-green-600">{formatPrice(p.offer_price || p.price)}</p>
                    {p.offer_price && <p className="text-xs text-gray-400 line-through">{formatPrice(p.price)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${p.stock < 10 ? 'text-red-500' : 'text-gray-700'}`}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.is_hidden && <Badge color="gray">Hidden</Badge>}
                      {p.is_featured && <Badge color="indigo">Featured</Badge>}
                      {p.is_offer_product && <Badge color="yellow">Offer</Badge>}
                      {!p.is_hidden && !p.is_featured && !p.is_offer_product && <Badge color="green">Active</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/products/${p.id}`)}
                        className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500 transition-colors" title="View Analytics">
                        <BarChart2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openEdit(p)} disabled={editLoading === p.id}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500 transition-colors disabled:opacity-50" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggle(productApi.toggleHidden, p.id, p.is_hidden ? 'shown' : 'hidden')}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title={p.is_hidden ? 'Show' : 'Hide'}>
                        {p.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => toggle(productApi.toggleFeatured, p.id, p.is_featured ? 'unfeatured' : 'featured')}
                        className={`p-1.5 rounded-lg transition-colors ${p.is_featured ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'}`} title="Toggle Featured">
                        <Star className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggle(productApi.toggleOffer, p.id, p.is_offer_product ? 'removed from offers' : 'marked as offer')}
                        className={`p-1.5 rounded-lg transition-colors ${p.is_offer_product ? 'text-orange-500 hover:bg-orange-50' : 'text-gray-400 hover:bg-gray-100'}`} title="Toggle Offer">
                        <Tag className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── lazy-load sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && <span className="text-sm text-gray-400">Loading more…</span>}
        </div>
      )}
      {!hasNextPage && products.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {products.length} of {total}</div>
      )}

      {modal && (
        <ProductForm
          product={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); qc.invalidateQueries(['admin-products']); }}
        />
      )}
    </div>
  );
}
