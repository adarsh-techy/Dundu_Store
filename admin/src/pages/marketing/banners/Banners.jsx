import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  RefreshCw,
  ExternalLink,
  Tag,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { bannerApi, categoryApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Slate', value: '#0f172a' },
];

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  link: '',
  sort_order: 0,
  category_slug: '',
  badge_text: '',
  badge_active: false,
  badge_color: '#4f46e5',
};

function slugToCategory(link, categories) {
  const m = link?.match(/[?&]category=([^&]+)/);
  if (!m) return '';
  return categories.find((c) => c.slug === m[1])?.slug || '';
}

export default function Banners() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: bannerApi.list,
  });
  const banners = data?.data?.banners || [];

  const { data: catData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryApi.list,
  });
  const categories = catData?.data?.categories || [];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sort_order: banners.length + 1 });
    setImage(null);
    setPreviewUrl('');
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditing(banner);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '',
      sort_order: banner.sort_order || 0,
      category_slug: slugToCategory(banner.link, categories),
      badge_text: banner.badge_text || '',
      badge_active: banner.badge_active || false,
      badge_color: banner.badge_color || '#4f46e5',
    });
    setImage(null);
    setPreviewUrl(banner.image_url || '');
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);

      if (editing) {
        await bannerApi.update(editing.id, fd);
        toast.success('Banner updated successfully');
      } else {
        await bannerApi.create(fd);
        toast.success('Banner created successfully');
      }
      setShowModal(false);
      qc.invalidateQueries(['admin-banners']);
    } catch (err) {
      toast.error(err.message || 'Failed to save banner');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (banner) => {
    try {
      await bannerApi.toggle(banner.id);
      qc.invalidateQueries(['admin-banners']);
      toast.success(banner.is_active ? 'Banner deactivated' : 'Banner activated');
    } catch {
      toast.error('Failed to toggle banner status');
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title || 'this banner'}"? This action cannot be reversed.`))
      return;
    try {
      await bannerApi.remove(banner.id);
      qc.invalidateQueries(['admin-banners']);
      toast.success('Banner deleted');
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  const handleReorder = async (banner, direction) => {
    const idx = banners.findIndex((b) => b.id === banner.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const other = banners[swapIdx];
    try {
      await Promise.all([
        bannerApi.update(
          banner.id,
          (() => {
            const fd = new FormData();
            fd.append('sort_order', other.sort_order);
            return fd;
          })()
        ),
        bannerApi.update(
          other.id,
          (() => {
            const fd = new FormData();
            fd.append('sort_order', banner.sort_order);
            return fd;
          })()
        ),
      ]);
      qc.invalidateQueries(['admin-banners']);
    } catch {
      toast.error('Failed to reorder banner');
    }
  };

  // Filtered banners
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesTitle = (b.title || '').toLowerCase().includes(q);
        const matchesSubtitle = (b.subtitle || '').toLowerCase().includes(q);
        const matchesLink = (b.link || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubtitle && !matchesLink) return false;
      }
      if (statusFilter === 'active' && !b.is_active) return false;
      if (statusFilter === 'inactive' && b.is_active) return false;

      if (categoryFilter !== 'all') {
        const bannerSlug = slugToCategory(b.link, categories);
        if (bannerSlug !== categoryFilter) return false;
      }
      return true;
    });
  }, [banners, search, statusFilter, categoryFilter, categories]);

  // Aggregate metrics
  const activeCount = banners.filter((b) => b.is_active).length;
  const linkedCount = banners.filter((b) => b.link).length;
  const badgeCount = banners.filter((b) => b.badge_active && b.badge_text).length;

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Promotional Banners & Hero Sliders
                </h1>
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                  {banners.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage high-impact hero banners, category routing, promo badges, and homepage carousel order
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            title="Refresh banners"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Banner
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Banners</p>
            <p className="text-xl font-bold text-slate-900">{banners.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Live</p>
            <p className="text-xl font-bold text-slate-900">
              {activeCount} <span className="text-xs font-normal text-slate-400">on homepage</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <ExternalLink className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category Linked</p>
            <p className="text-xl font-bold text-slate-900">{linkedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Offer Badges</p>
            <p className="text-xl font-bold text-slate-900">{badgeCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banner title, subtitle, or link…"
            className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-slate-50/50 hover:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Paused Only</option>
          </select>

          {/* Category Destination Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-700 cursor-pointer"
          >
            <option value="all">All Destinations</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-2 rounded-xl">
            {filteredBanners.length} of {banners.length}
          </div>
        </div>
      </div>

      {/* ── Banners Grid ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-400 font-medium">Loading promotional banners...</p>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-800">No banners found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {search || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No promotional banners match your active filters. Try clearing your search.'
              : 'Add your first promotional hero banner to showcase seasonal sales and new arrivals.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBanners.map((b) => {
            const slug = slugToCategory(b.link, categories);
            const cat = categories.find((c) => c.slug === slug);

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* ── Image & Overlay Chips ── */}
                <div className="relative aspect-[16/6] bg-slate-100 overflow-hidden">
                  {b.image_url ? (
                    <img
                      src={b.image_url}
                      alt={b.title || 'Banner'}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="h-10 w-10 opacity-50" />
                    </div>
                  )}

                  {/* Top Left: Active Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs ${
                        b.is_active
                          ? 'bg-emerald-500/90 text-white backdrop-blur-xs'
                          : 'bg-slate-900/80 text-slate-300 backdrop-blur-xs'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          b.is_active ? 'bg-white animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {b.is_active ? 'Live on Store' : 'Paused'}
                    </span>
                  </div>

                  {/* Top Right: Sort Order Pill */}
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold bg-slate-900/80 text-white px-2.5 py-1 rounded-full backdrop-blur-xs shadow-xs">
                      #{b.sort_order}
                    </span>
                  </div>

                  {/* Bottom Left: Offer Badge Overlay */}
                  {b.badge_text && (
                    <div className="absolute bottom-3 left-3">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm text-white ${
                          b.badge_active ? '' : 'line-through opacity-60'
                        }`}
                        style={{ backgroundColor: b.badge_active ? b.badge_color || '#4f46e5' : '#64748b' }}
                      >
                        {b.badge_text}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Card Content & Actions ── */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {b.title || <span className="text-slate-400 italic">No Title</span>}
                    </h3>
                    {b.subtitle && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{b.subtitle}</p>
                    )}
                  </div>

                  {/* Link Destination */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {cat ? (
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate">
                        Category: {cat.name}
                      </span>
                    ) : b.link ? (
                      <span className="text-slate-600 font-mono text-[11px] truncate bg-slate-100 px-2 py-0.5 rounded-md">
                        {b.link}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No destination link</span>
                    )}
                  </div>

                  {/* Bottom Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {/* Toggle Active Button */}
                    <button
                      onClick={() => handleToggle(b)}
                      title={b.is_active ? 'Click to Pause' : 'Click to Activate'}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        b.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200/60 hover:bg-slate-200'
                      }`}
                    >
                      {b.is_active ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                          <span>Paused</span>
                        </>
                      )}
                    </button>

                    {/* Reorder & Edit Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReorder(b, 'up')}
                        disabled={banners.indexOf(b) === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Up in Carousel"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReorder(b, 'down')}
                        disabled={banners.indexOf(b) === banners.length - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Down in Carousel"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Banner"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Banner"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Banner Modal ── */}
      {showModal && (
        <Modal
          size="lg"
          title={editing ? `Edit Banner — ${editing.title || 'Banner'}` : 'Add Promotional Hero Banner'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload Zone */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                Banner Artwork {editing && '(Leave empty to keep current)'}
              </label>
              {previewUrl && (
                <div className="aspect-[16/6] rounded-xl overflow-hidden bg-slate-100 mb-2 border border-slate-200">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Recommended aspect ratio: 16:6 (e.g. 1600 × 600 px) in PNG, JPG, or WEBP.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Banner Title"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Festive Summer Mega Sale"
              />
              <Input
                label="Subtitle / Tagline"
                value={form.subtitle}
                onChange={set('subtitle')}
                placeholder="e.g. Up to 50% Off on Ethnic Wear"
              />
            </div>

            {/* Destination Link */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                Target Category Destination
              </label>
              <select
                value={form.category_slug}
                onChange={(e) => {
                  const slug = e.target.value;
                  setForm((p) => ({
                    ...p,
                    category_slug: slug,
                    link: slug ? `/products?category=${slug}` : '',
                  }));
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white text-slate-700 cursor-pointer"
              >
                <option value="">— No category (Use custom link) —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {!form.category_slug && (
              <Input
                label="Custom Deep Link (Optional)"
                value={form.link}
                onChange={set('link')}
                placeholder="e.g. /products?offer=true"
              />
            )}

            <Input
              label="Carousel Sort Position"
              type="number"
              value={form.sort_order}
              onChange={set('sort_order')}
            />

            {/* Offer Badge Customizer */}
            <div className="border border-slate-200/80 rounded-xl p-4 space-y-3 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Floating Offer Badge Overlay
                </p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.badge_active}
                    onChange={(e) => setForm((p) => ({ ...p, badge_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-semibold">Enable Badge</span>
                </label>
              </div>

              <Input
                label="Badge Label"
                value={form.badge_text}
                onChange={set('badge_text')}
                placeholder="e.g. FLAT 40% OFF or LIMITED DROP"
              />

              {/* Color Presets */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Accent Color
                </p>
                <div className="flex flex-wrap gap-2.5 mb-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, badge_color: c.value }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        form.badge_color === c.value ? 'border-slate-900 scale-110 shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Real-time Badge Preview */}
              {form.badge_text && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  <span className="text-xs text-slate-400">Live Preview:</span>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-xs"
                    style={{ backgroundColor: form.badge_active ? form.badge_color : '#94a3b8' }}
                  >
                    {form.badge_text}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl px-4">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5"
              >
                {editing ? 'Save Changes' : 'Add Banner'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
