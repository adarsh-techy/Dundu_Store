import { useState, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Star, Trash2, Plus, X, Pencil, Search, RefreshCw, Filter,
  CheckCircle2, ShieldCheck, Image as ImageIcon, Camera,
  ChevronDown, MessageSquare, AlertTriangle, Eye, ExternalLink,
  ThumbsUp, ShoppingBag, Check, Sparkles
} from 'lucide-react';
import { reviewApi, productApi } from '../../../api';
import StatCard from '../../../components/ui/StatCard';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

const STAR_LABELS = ['', 'Poor (1 Star)', 'Fair (2 Stars)', 'Good (3 Stars)', 'Very Good (4 Stars)', 'Excellent (5 Stars)'];

/* ── Interactive Star Picker for Create / Edit ── */
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const activeRating = hover || value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="p-1 rounded-lg hover:bg-amber-50 transition-all transform hover:scale-110 focus:outline-none cursor-pointer"
            aria-label={`${s} star`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                s <= activeRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-200 fill-transparent hover:text-amber-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-xs font-bold text-slate-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
          {STAR_LABELS[activeRating] || 'Select rating'}
        </span>
      </div>
    </div>
  );
}

/* ── Static Star Rating Display ── */
function StarDisplay({ rating, size = 'sm', showValue = false }) {
  const iconSize = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${iconSize} ${
              s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'
            }`}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-xs font-black text-slate-900 ml-1">
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}

/* ── Add / Edit Review Modal ── */
function ReviewModal({ onClose, onSave, products, editing }) {
  const isEdit = !!editing;
  const [form, setForm] = useState(
    isEdit
      ? {
          product_id: editing.product_id,
          reviewer_name: editing.user_name || editing.reviewer_name || '',
          rating: editing.rating || 5,
          review: editing.review || '',
        }
      : { product_id: '', reviewer_name: '', rating: 5, review: '' }
  );
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(editing?.image_url || null);
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.product_id) return toast.error('Please select a product');
    if (!form.reviewer_name.trim()) return toast.error('Please enter reviewer name');

    setLoading(true);
    try {
      const fd = new FormData();
      if (!isEdit) fd.append('product_id', form.product_id);
      fd.append('reviewer_name', form.reviewer_name.trim());
      fd.append('rating', form.rating);
      fd.append('review', form.review.trim());

      if (imageFile) {
        fd.append('image', imageFile);
      } else if (isEdit && !imagePreview) {
        fd.append('image_url', ''); // clear existing image
      }

      await onSave(fd);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEdit ? 'Edit Customer Review' : 'Create Product Review'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Update review text, star rating, or photo' : 'Add verified testimonial or curated customer feedback'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Product Selector */}
          {!isEdit ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Target Product <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.product_id}
                onChange={(e) => set('product_id')(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              >
                <option value="">Select a product to review...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <ShoppingBag className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Reviewed Product</span>
                <p className="text-xs font-bold text-slate-900 truncate">{editing.product_name}</p>
              </div>
            </div>
          )}

          {/* Reviewer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Reviewer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.reviewer_name}
              onChange={(e) => set('reviewer_name')(e.target.value)}
              placeholder="e.g. Priya Sharma (Mumbai)"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Star Rating <span className="text-rose-500">*</span>
            </label>
            <StarPicker value={form.rating} onChange={set('rating')} />
          </div>

          {/* Review Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Review Content
            </label>
            <textarea
              rows={3}
              value={form.review}
              onChange={(e) => set('review')(e.target.value)}
              placeholder="Write the customer testimonial or feedback..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none leading-relaxed font-medium"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Customer Photo Attachment (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all rounded-xl px-4 py-2.5 text-xs text-slate-700 font-semibold cursor-pointer shadow-xs">
                <Camera className="w-4 h-4 text-slate-500" />
                <span>{imageFile ? 'Replace Photo' : 'Select Photo'}</span>
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
                <div className="relative group w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute inset-0 bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Review' : 'Create Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Lightbox Image Modal ── */
function ImageLightboxModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200 cursor-default"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <img src={imageUrl} alt="Review attachment" className="w-full h-auto max-h-[85vh] object-contain" />
      </div>
    </div>
  );
}

/* ── Delete Confirmation Dialog ── */
function DeleteConfirmModal({ review, onClose, onConfirm, isDeleting }) {
  if (!review) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Delete Review</h3>
            <p className="text-xs text-slate-500">Are you sure you want to permanently remove this review?</p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
          <p className="font-bold text-slate-800">"{review.user_name || review.reviewer_name}"</p>
          <p className="text-slate-500">{review.product_name}</p>
          {review.review && <p className="text-slate-600 italic line-clamp-2">"{review.review}"</p>}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={isDeleting} onClick={onConfirm}>
            Yes, Delete Review
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Reviews() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [deletingReview, setDeletingReview] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  /* ── Filter & Search States ── */
  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterRating, setFilterRating] = useState(''); // '' | '5' | '4' | '3' | '2' | '1'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'verified' | 'admin' | 'with_photos'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'

  const loadMoreRef = useRef(null);
  const limit = 20;

  /* ── Infinite Query for Reviews ── */
  const {
    data: reviewData,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin-reviews', filterProduct, filterRating, filterType, search, sortBy],
    queryFn: ({ pageParam = 1 }) =>
      reviewApi.list({
        product_id: filterProduct || undefined,
        rating: filterRating || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        search: search.trim() || undefined,
        sort: sortBy,
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

  /* ── Products List for Dropdown ── */
  const { data: productData } = useQuery({
    queryKey: ['admin-products-simple'],
    queryFn: () => productApi.list({ limit: 500 }),
  });

  const reviews = useMemo(() => {
    return reviewData?.pages.flatMap((p) => p.data?.reviews || []) || [];
  }, [reviewData]);

  const totalFiltered = reviewData?.pages?.[0]?.data?.total ?? reviews.length;
  const stats = reviewData?.pages?.[0]?.data?.stats || null;
  const products = productData?.data?.products || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-reviews'] });

  /* ── Add / Edit Mutations ── */
  const handleAdd = async (form) => {
    await reviewApi.create(form);
    toast.success('Review created successfully');
    invalidate();
  };

  const handleEdit = async (form) => {
    await reviewApi.update(editingReview.id, form);
    toast.success('Review updated successfully');
    invalidate();
  };

  /* ── Delete Mutation ── */
  const deleteMutation = useMutation({
    mutationFn: (id) => reviewApi.remove(id),
    onSuccess: () => {
      toast.success('Review deleted');
      setDeletingReview(null);
      invalidate();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    },
  });

  /* ── IntersectionObserver for Infinite Scroll ── */
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

  const openEdit = (r) => {
    setEditingReview(r);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReview(null);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterProduct('');
    setFilterRating('');
    setFilterType('all');
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(
    search || filterProduct || filterRating || filterType !== 'all' || sortBy !== 'newest'
  );

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Product Reviews & Social Proof
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {stats?.total ?? 0} Reviews
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Curate verified buyer testimonials, monitor star distributions, and manage product ratings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              refetch();
              toast.success('Reviews refreshed');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            title="Refresh review list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setEditingReview(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Review
          </button>
        </div>
      </div>

      {/* ── Executive KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reviews"
          value={stats?.total ?? 0}
          icon={MessageSquare}
          color="indigo"
          sub="Customer & curated testimonials"
        />
        <StatCard
          title="Average Rating"
          value={stats?.avg_rating ? `${stats.avg_rating.toFixed(1)} / 5.0` : '—'}
          icon={Star}
          color="amber"
          sub="Overall customer sentiment"
        />
        <StatCard
          title="5-Star Ratings"
          value={stats?.distribution?.[5] ?? 0}
          icon={CheckCircle2}
          color="emerald"
          sub={
            stats?.total
              ? `${Math.round(((stats.distribution?.[5] || 0) / stats.total) * 100)}% of total ratings`
              : 'Top satisfaction rating'
          }
        />
        <StatCard
          title="Photo Reviews"
          value={stats?.with_photos_count ?? 0}
          icon={ImageIcon}
          color="blue"
          sub="Reviews with buyer attachments"
        />
      </div>

      {/* ── Interactive Rating Distribution & Quick Filter Strip ── */}
      {stats && stats.total > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Big Score Display */}
            <div className="flex items-center gap-5 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-8">
              <div className="text-center">
                <span className="text-4xl font-black text-slate-900 tracking-tight block">
                  {stats.avg_rating.toFixed(1)}
                </span>
                <div className="mt-1 flex justify-center">
                  <StarDisplay rating={Math.round(stats.avg_rating)} size="md" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
                  Based on {stats.total} reviews
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 pl-4 border-l border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{stats.verified_count} Verified Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>{stats.admin_count} Curated Reviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>{stats.with_photos_count} With Customer Photos</span>
                </div>
              </div>
            </div>

            {/* Right: Interactive 5-Star Breakdown Bars */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[5, 4, 3, 2, 1].map((s) => {
                const count = stats.distribution?.[s] || 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const isSelected = filterRating === String(s);

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterRating(isSelected ? '' : String(s))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-100 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-800">{s}</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{count}</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                      {pct}% of reviews
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters & Search Control Bar ── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reviewer, review keywords, or product..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Product Filter & Sort Dropdown */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative min-w-[190px]">
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="w-full bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[150px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filters */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {[
                { id: 'all', label: 'All Reviews' },
                { id: 'verified', label: 'Verified Buyers' },
                { id: 'admin', label: 'Admin Added' },
                { id: 'with_photos', label: 'With Photos' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilterType(t.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterType === t.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Rating Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilterRating('')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  !filterRating ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Stars
              </button>
              {[5, 4, 3, 2, 1].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterRating(filterRating === String(s) ? '' : String(s))}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterRating === String(s)
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{s}</span>
                  <Star className="w-3 h-3 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Reviews Directory Grid / List ── */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center space-y-3 shadow-sm">
          <RefreshCw className="h-8 w-8 mx-auto text-slate-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading reviews directory...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
            <Star className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No reviews found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Try relaxing your search terms or filter pills to see matching reviews.'
              : 'Add customer testimonials and product reviews to establish buyer confidence.'}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All Filters
            </Button>
          ) : (
            <button
              onClick={() => {
                setEditingReview(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add First Review
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
            <span>Showing {reviews.length} of {totalFiltered} reviews</span>
            {hasActiveFilters && <span className="font-bold text-indigo-600">Filtered View</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r) => {
              const reviewerName = r.user_name || r.reviewer_name || 'Customer';
              const initial = reviewerName.charAt(0).toUpperCase() || 'C';
              const formattedDate = r.created_at
                ? new Date(r.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—';

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: User Avatar, Name, Badges & Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black text-sm shrink-0">
                          {initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900">{reviewerName}</h4>
                            {r.is_admin_created ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                Admin Added
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Verified Buyer
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block">{formattedDate}</span>
                        </div>
                      </div>

                      {/* Edit / Delete Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(r)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit review"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingReview(r)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete review"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Star Rating Strip */}
                    <div className="flex items-center gap-2">
                      <StarDisplay rating={r.rating} size="sm" />
                      <span className="text-xs font-bold text-slate-700">
                        {r.rating}.0 / 5.0
                      </span>
                    </div>

                    {/* Product Attribution Badge */}
                    <div className="flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/70">
                      {r.product_image ? (
                        <img
                          src={r.product_image}
                          alt={r.product_name}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {r.product_name}
                      </span>
                    </div>

                    {/* Review Body Text */}
                    {r.review && (
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        "{r.review}"
                      </p>
                    )}
                  </div>

                  {/* Photo Attachment Thumbnail */}
                  {r.image_url && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div
                        onClick={() => setPreviewImage(r.image_url)}
                        className="group flex items-center gap-2.5 cursor-pointer"
                      >
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-xs group-hover:border-indigo-400 transition-colors">
                          <img
                            src={r.image_url}
                            alt="Buyer review attachment"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                          View Photo
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Photo Verified
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Infinite Scroll Sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Loading more reviews...
            </div>
          )}
        </div>
      )}

      {!hasNextPage && reviews.length > 0 && (
        <div className="text-center py-4 text-xs font-semibold text-slate-400">
          Showing all {reviews.length} reviews
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <ReviewModal
          products={products}
          editing={editingReview}
          onClose={closeModal}
          onSave={editingReview ? handleEdit : handleAdd}
        />
      )}

      {/* ── Lightbox Image Modal ── */}
      {previewImage && (
        <ImageLightboxModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deletingReview && (
        <DeleteConfirmModal
          review={deletingReview}
          isDeleting={deleteMutation.isPending}
          onClose={() => setDeletingReview(null)}
          onConfirm={() => deleteMutation.mutate(deletingReview.id)}
        />
      )}
    </div>
  );
}
