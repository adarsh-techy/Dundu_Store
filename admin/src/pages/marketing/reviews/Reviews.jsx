import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, Plus, X, Pencil } from 'lucide-react';
import { reviewApi, productApi } from '../../../api';
import toast from 'react-hot-toast';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 focus:outline-none">
          <Star className="h-7 w-7"
            style={{
              fill: s <= (hover || value) ? '#facc15' : 'transparent',
              color: s <= (hover || value) ? '#facc15' : '#4b5563',
              transition: 'fill 0.1s',
            }} />
        </button>
      ))}
      {(hover || value) > 0 && (
        <span className="ml-2 text-sm text-gray-400">{STAR_LABELS[hover || value]}</span>
      )}
    </div>
  );
}

function ReviewModal({ onClose, onSave, products, editing }) {
  const isEdit = !!editing;
  const [form, setForm] = useState(
    isEdit
      ? { product_id: editing.product_id, reviewer_name: editing.user_name, rating: editing.rating, review: editing.review || '' }
      : { product_id: '', reviewer_name: '', rating: 5, review: '' }
  );
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(editing?.image_url || null);
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.product_id) return toast.error('Select a product');
    if (!form.reviewer_name.trim()) return toast.error('Enter reviewer name');
    setLoading(true);
    try {
      const fd = new FormData();
      if (!isEdit) fd.append('product_id', form.product_id);
      fd.append('reviewer_name', form.reviewer_name);
      fd.append('rating', form.rating);
      fd.append('review', form.review);
      
      if (imageFile) {
        fd.append('image', imageFile);
      } else if (isEdit && !imagePreview) {
        fd.append('image_url', ''); // clear image
      }

      await onSave(fd);
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Review' : 'Add Review'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Product — only for new reviews */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Product</label>
              <select
                value={form.product_id}
                onChange={(e) => set('product_id')(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {isEdit && (
            <p className="text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
              Product: <span className="text-gray-300 font-medium">{editing.product_name}</span>
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Reviewer Name</label>
            <input
              type="text"
              value={form.reviewer_name}
              onChange={(e) => set('reviewer_name')(e.target.value)}
              placeholder="e.g. Priya from Mumbai"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Rating</label>
            <StarPicker value={form.rating} onChange={set('rating')} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Review (optional)</label>
            <textarea
              value={form.review}
              onChange={(e) => set('review')(e.target.value)}
              placeholder="Write the review text..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Review Image (optional)</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-600 transition-colors rounded-lg px-4 py-2 text-xs text-gray-300 font-semibold cursor-pointer">
                📷 Select Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-700">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-red-500 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className="h-3.5 w-3.5"
          style={{ fill: s <= rating ? '#facc15' : 'transparent', color: s <= rating ? '#facc15' : '#374151' }} />
      ))}
    </div>
  );
}

export default function Reviews() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [filterProduct, setFilterProduct] = useState('');
  const loadMoreRef = useRef(null);
  const limit = 15;

  const {
    data: reviewData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-reviews', filterProduct],
    queryFn: ({ pageParam }) => reviewApi.list({
      product_id: filterProduct || undefined,
      page: pageParam,
      limit,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.reviews?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
  const { data: productData } = useQuery({
    queryKey: ['admin-products-simple'],
    queryFn: () => productApi.list({ limit: 500 }),
  });

  const reviews = reviewData?.pages.flatMap((p) => p.data?.reviews || []) || [];
  const stats = reviewData?.pages?.[0]?.data?.stats || null;
  const products = productData?.data?.products || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-reviews'] });

  const handleAdd = async (form) => {
    await reviewApi.create(form);
    toast.success('Review added');
    invalidate();
  };

  const handleEdit = async (form) => {
    await reviewApi.update(editingReview.id, form);
    toast.success('Review updated');
    invalidate();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    await reviewApi.remove(id);
    toast.success('Review deleted');
    invalidate();
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

  const openEdit = (r) => { setEditingReview(r); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingReview(null); };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-600">Reviews</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage product reviews visible to customers</p>
        </div>
        <button onClick={() => { setEditingReview(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus className="h-4 w-4" /> Add Review
        </button>
      </div>

      {/* Product filter */}
      <div className="mb-5">
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 min-w-[260px]"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Stats row — server-computed across all matching reviews, not just what's loaded */}
      {stats && stats.total > 0 && (
        <div className="flex items-center gap-6 mb-5 p-4 bg-gray-900 rounded-xl border border-gray-800">
          <div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total Reviews</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{stats.avg_rating.toFixed(1)}</p>
            <p className="text-xs text-gray-400">Avg Rating</p>
          </div>
          <div className="flex gap-3">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = stats.distribution[s] || 0;
              const pct = Math.round((count / stats.total) * 100);
              return (
                <div key={s} className="text-center">
                  <p className="text-sm font-semibold text-white">{count}</p>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-500">{s}</span>
                  </div>
                  <p className="text-xs text-gray-500">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No reviews yet. Add some to build customer trust.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id}
              className="flex items-start gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-indigo-900 flex items-center justify-center shrink-0 text-indigo-300 font-bold text-sm">
                {r.user_name?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-white">{r.user_name}</span>
                  {r.is_admin_created && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 font-medium">Admin Added</span>
                  )}
                  <StarDisplay rating={r.rating} />
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-indigo-400 mt-1 font-medium">{r.product_name}</p>
                {r.review && <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">{r.review}</p>}
                {r.image_url && (
                  <div className="mt-3 max-w-[100px] rounded-lg overflow-hidden border border-gray-800">
                    <img
                      src={r.image_url}
                      alt="Review Attachment"
                      className="w-full h-auto max-h-[100px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(r.image_url, '_blank')}
                    />
                  </div>
                )}
              </div>

              {/* Edit / Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(r)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-900/20 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(r.id)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── lazy-load sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && <span className="text-sm text-gray-400">Loading more…</span>}
        </div>
      )}
      {!hasNextPage && reviews.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-500">— End of list — {reviews.length} of {stats?.total ?? reviews.length}</div>
      )}

      {showModal && (
        <ReviewModal
          products={products}
          editing={editingReview}
          onClose={closeModal}
          onSave={editingReview ? handleEdit : handleAdd}
        />
      )}
    </div>
  );
}
