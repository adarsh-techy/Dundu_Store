import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ImageIcon,
  ChevronUp, ChevronDown, Search, X, RefreshCw,
  ExternalLink, Tag, CheckCircle2, Smartphone,
  ChevronLeft, ChevronRight, Upload, Link2, AlertCircle
} from 'lucide-react';
import { bannerApi, categoryApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  { label: 'Dundu Pink', value: '#E91E8C' },
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
  badge_color: '#E91E8C',
};

function slugToCategory(link, categories) {
  const m = link?.match(/[?&]category=([^&]+)/);
  if (!m) return '';
  return categories.find((c) => c.slug === m[1])?.slug || '';
}

export default function Banners() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(0);
  const [selectedBannerId, setSelectedBannerId] = useState(null);

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
    setImageUrlInput('');
    setFileInfo(null);
    setUploadMode('file');
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
      badge_color: banner.badge_color || '#E91E8C',
    });
    setImage(null);
    setPreviewUrl(banner.image_url || '');
    setImageUrlInput(banner.image_url || '');
    setFileInfo(banner.image_url ? { name: 'Active Banner Artwork', size: null } : null);
    setUploadMode(banner.image_url && banner.image_url.startsWith('http') ? 'url' : 'file');
    setSelectedBannerId(banner.id);
    setShowModal(true);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setImageUrlInput('');
    setFileInfo({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
    });
  };

  const handleImageUrlChange = (url) => {
    setImageUrlInput(url);
    setImage(null);
    setPreviewUrl(url.trim());
    if (url.trim()) {
      setFileInfo({ name: 'Web Image URL', size: null });
    } else {
      setFileInfo(null);
    }
  };

  const handleClearImage = (e) => {
    e?.stopPropagation?.();
    setImage(null);
    setPreviewUrl('');
    setImageUrlInput('');
    setFileInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editing && !image && !previewUrl && !imageUrlInput) {
      toast.error('Please choose or upload a banner artwork image');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
      });
      if (image) {
        fd.append('image', image);
      } else if (imageUrlInput || (!editing && previewUrl)) {
        fd.append('image_url', imageUrlInput || previewUrl);
      }

      if (editing) {
        await bannerApi.update(editing.id, fd);
        toast.success('Banner updated successfully');
      } else {
        await bannerApi.create(fd);
        toast.success('Banner created successfully');
      }
      setShowModal(false);
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    } catch (err) {
      toast.error(err.message || 'Failed to save banner');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (banner) => {
    try {
      await bannerApi.toggle(banner.id);
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success(banner.is_active ? 'Banner deactivated' : 'Banner activated on mobile app');
    } catch {
      toast.error('Failed to toggle banner status');
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title || 'this banner'}"? This action cannot be reversed.`))
      return;
    try {
      await bannerApi.remove(banner.id);
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success('Banner deleted');
      if (selectedBannerId === banner.id) setSelectedBannerId(null);
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
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
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
  const activeBanners = useMemo(() => banners.filter((b) => b.is_active), [banners]);
  const linkedCount = banners.filter((b) => b.link).length;
  const badgeCount = banners.filter((b) => b.badge_active && b.badge_text).length;

  // Active banners list for carousel preview
  const previewBannersList = useMemo(() => {
    if (showModal && (form.title || previewUrl)) {
      return [
        {
          id: 'draft',
          title: form.title || 'Draft Banner Title',
          subtitle: form.subtitle || 'Draft subtitle description',
          image_url: previewUrl,
          badge_text: form.badge_text,
          badge_active: form.badge_active,
          badge_color: form.badge_color || '#E91E8C',
          is_active: true,
        },
      ];
    }
    if (activeBanners.length > 0) return activeBanners;
    if (banners.length > 0) return banners;
    // Default fallback banner mock
    return [
      {
        id: 'default',
        title: 'Festive Mega Collection',
        subtitle: 'Explore handpicked festive styles for family',
        badge_text: 'FLAT 40% OFF',
        badge_active: true,
        badge_color: '#E91E8C',
        is_active: true,
      },
    ];
  }, [activeBanners, banners, showModal, form, previewUrl]);

  // Currently displayed banner in preview
  const currentPreviewBanner = useMemo(() => {
    if (selectedBannerId) {
      const found = previewBannersList.find((b) => b.id === selectedBannerId);
      if (found) return found;
    }
    const idx = Math.min(selectedBannerIndex, previewBannersList.length - 1);
    return previewBannersList[Math.max(0, idx)] || previewBannersList[0];
  }, [previewBannersList, selectedBannerIndex, selectedBannerId]);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ─── 1. Clean Executive Header ────────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Promotional Banners & Hero Sliders
              </h1>
              <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                {banners.length} Total
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeCount} Live on App
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage high-impact hero banners, category routing, promo badges, and homepage carousel order with live mobile preview.
            </p>
          </div>
        </div>

        {/* Top Actions: Refresh + Add Banner */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
          <button
            onClick={() => {
              refetch();
              toast.success('Banners refreshed');
            }}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh banners"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Button
            size="sm"
            onClick={openCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs rounded-xl px-4 py-2 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Banner
          </Button>
        </div>
      </div>

      {/* ─── 2. Clean Executive KPI Cards (No Over-Coloring) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Banners */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Banners</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{banners.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Stored banner slides</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <ImageIcon className="h-5 w-5" />
          </div>
        </div>

        {/* Active Live */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Live</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{activeCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Live on mobile carousel</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Category Linked */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category Linked</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{linkedCount}</p>
            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Direct shopping routing</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <ExternalLink className="h-5 w-5" />
          </div>
        </div>

        {/* Offer Badges */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Offer Badges</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{badgeCount}</p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">Promotional badges</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <Tag className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ─── 3. Two-Column Layout: Controls & List (Left) + Exact Mobile App Preview (Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Filters & Banners Ledger (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters & Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search banner title, link…"
                className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:bg-white text-slate-800 placeholder-slate-400 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-white text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Paused Only</option>
              </select>

              {/* Category Destination Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-white text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">All Destinations</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-xl">
                {filteredBanners.length} of {banners.length}
              </div>
            </div>
          </div>

          {/* Banners List */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center">
              <Spinner size="lg" />
              <p className="mt-3 text-xs text-slate-400 font-medium">Loading promotional banners...</p>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-slate-800">No banners found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {search || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No promotional banners match your active filters.'
                  : 'Add your first promotional hero banner to showcase seasonal deals on the mobile home screen.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredBanners.map((b) => {
                const slug = slugToCategory(b.link, categories);
                const cat = categories.find((c) => c.slug === slug);
                const isSelected = selectedBannerId === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBannerId(b.id);
                      const idx = previewBannersList.findIndex((item) => item.id === b.id);
                      if (idx !== -1) setSelectedBannerIndex(idx);
                    }}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Banner Image & Overlay Chips */}
                    <div className="relative aspect-[16/6] bg-slate-100 overflow-hidden">
                      {b.image_url ? (
                        <img
                          src={b.image_url}
                          alt={b.title || 'Banner'}
                          className="w-full h-full object-cover transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#2A1A2E] text-white/50">
                          <span className="text-lg font-black tracking-widest text-[#E91E8C]">DUNDU</span>
                        </div>
                      )}

                      {/* Top Left: Active Status Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs ${
                            b.is_active
                              ? 'bg-emerald-600 text-white backdrop-blur-xs'
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
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        {isSelected && (
                          <span className="text-[10px] uppercase font-black bg-white/90 text-slate-900 px-2 py-0.5 rounded-full shadow-xs">
                            Viewing on Phone
                          </span>
                        )}
                        <span className="text-xs font-bold bg-slate-900/80 text-white px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs">
                          #{b.sort_order}
                        </span>
                      </div>

                      {/* Bottom Left: Offer Badge Overlay */}
                      {b.badge_text && (
                        <div className="absolute bottom-2.5 left-2.5">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm text-white ${
                              b.badge_active ? '' : 'line-through opacity-60'
                            }`}
                            style={{ backgroundColor: b.badge_active ? b.badge_color || '#E91E8C' : '#64748b' }}
                          >
                            {b.badge_text}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content & Actions */}
                    <div className="p-3.5 space-y-2.5">
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
                          <span className="text-slate-400 italic text-[11px]">No destination link</span>
                        )}
                      </div>

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                        {/* Toggle Active Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(b);
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl border transition-colors cursor-pointer ${
                            b.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {b.is_active ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
                          <span>{b.is_active ? 'Live' : 'Paused'}</span>
                        </button>

                        {/* Reorder, Edit & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(b, 'up');
                            }}
                            disabled={banners.indexOf(b) === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-25"
                            title="Move Up in Carousel"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(b, 'down');
                            }}
                            disabled={banners.indexOf(b) === banners.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-25"
                            title="Move Down in Carousel"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(b);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Banner"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(b);
                            }}
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
        </div>

        {/* RIGHT COLUMN: EXACT MOBILE APP PREVIEW (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 flex flex-col items-center">
            {/* Header / Carousel Controls */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Mobile Hero Slider Preview
                </span>
              </div>

              {/* Prev / Next Banner Switchers */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBannerIndex((prev) =>
                      prev === 0 ? previewBannersList.length - 1 : prev - 1
                    );
                    setSelectedBannerId(null);
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                  title="Previous Banner"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold text-slate-500 px-1">
                  {previewBannersList.indexOf(currentPreviewBanner) + 1} / {previewBannersList.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBannerIndex((prev) => (prev + 1) % previewBannersList.length);
                    setSelectedBannerId(null);
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                  title="Next Banner"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                EXACT MOBILE APP DEVICE FRAME (350px width, precise proportions)
            ══════════════════════════════════════════════════════════════ */}
            <div className="w-[350px] h-[700px] rounded-[48px] border-[9px] border-[#18181b] bg-[#040d04] shadow-2xl overflow-hidden flex flex-col relative select-none">

              {/* 1. Exact iOS Status Bar (#040d04 background matching AppHeader) */}
              <div className="bg-[#040d04] h-11 px-6 flex items-center justify-between text-white shrink-0 z-20">
                <span className="text-[12px] font-bold tracking-tight">9:41</span>
                {/* Dynamic Island */}
                <div className="w-24 h-6 bg-black rounded-full flex items-center justify-end px-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#18181b] border border-[#27272a]"></div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span>5G</span>
                  <div className="w-5 h-2.5 border border-white/80 rounded-xs p-0.5 flex items-center">
                    <div className="w-full h-full bg-white rounded-2xs"></div>
                  </div>
                </div>
              </div>

              {/* 2. Exact Mobile AppHeader.jsx (Height 52px, Background #040d04) */}
              <div className="bg-[#040d04] h-[52px] px-4 flex items-center justify-between shrink-0 z-20 border-b border-[#142314]">
                {/* Left: Dundu Store Logo */}
                <div className="flex items-center gap-1">
                  <span className="text-xl font-black text-[#E91E8C] tracking-widest font-sans">
                    DUNDU
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E91E8C] mb-1"></span>
                </div>
                {/* Right: Wishlist & Cart icons */}
                <div className="flex items-center gap-3 text-white">
                  <span className="text-base cursor-pointer hover:opacity-80">🤍</span>
                  <div className="relative cursor-pointer hover:opacity-80">
                    <span className="text-base">🛍</span>
                    <span className="absolute -top-1.5 -right-2 bg-[#E91E8C] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                      1
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Exact Mobile Search Bar (HomeScreen.jsx lines 425-446) */}
              <div className="bg-[#000000] px-3.5 py-2 border-b border-[#1e1e1e] shrink-0 z-20">
                <div className="h-[38px] bg-[#1a1a1a] rounded-[10px] border border-[#2e2e2e] px-3 flex items-center gap-2">
                  <span className="text-xs text-[#666]">🔍</span>
                  <span className="text-xs text-[#888] font-sans">Search products, brands...</span>
                </div>
              </div>

              {/* 4. Exact Mobile Category Circles (CategoryStrip.jsx) */}
              <div className="bg-[#000000] px-3 py-2 flex items-center justify-between border-b border-[#1e1e1e] text-center shrink-0 z-10">
                {[
                  { name: 'Women', icon: '👗', bg: 'bg-[#2A1A2E]' },
                  { name: 'Kids', icon: '🧸', bg: 'bg-[#1A262E]' },
                  { name: 'Newborn', icon: '👶', bg: 'bg-[#1A2E26]' },
                  { name: 'Maternity', icon: '🤰', bg: 'bg-[#2E1A22]' },
                  { name: 'Combos', icon: '🎀', bg: 'bg-[#2E281A]' },
                ].map((c) => (
                  <div key={c.name} className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-full ${c.bg} border border-white/10 flex items-center justify-center text-sm shadow-xs`}>
                      {c.icon}
                    </div>
                    <span className="text-[10px] font-bold text-white/80">{c.name}</span>
                  </div>
                ))}
              </div>

              {/* 5. Scrollable Screen Content: Exact Hero Banner Carousel + Products */}
              <div className="flex-1 bg-white overflow-y-auto relative scrollbar-hide">
                {/* ── EXACT HERO BANNER CAROUSEL (HomeScreen.jsx lines 64-134) ── */}
                <div className="w-full h-[175px] bg-[#2A1A2E] relative overflow-hidden flex flex-col justify-between select-none">
                  {/* Banner Image or Placeholder */}
                  {currentPreviewBanner?.image_url ? (
                    <img
                      src={currentPreviewBanner.image_url}
                      alt={currentPreviewBanner.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2A1A2E] via-[#1A1A2E] to-[#140c16]">
                      <span className="text-2xl font-black tracking-widest text-[#E91E8C] opacity-60">
                        DUNDU
                      </span>
                    </div>
                  )}

                  {/* Floating Offer Badge (top: 10, right: 10) */}
                  {currentPreviewBanner?.badge_text && (currentPreviewBanner.badge_active !== false) && (
                    <div className="relative z-10 p-2.5 flex justify-end">
                      <span
                        className="text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md text-white tracking-wider"
                        style={{ backgroundColor: currentPreviewBanner.badge_color || '#E91E8C' }}
                      >
                        {currentPreviewBanner.badge_text}
                      </span>
                    </div>
                  )}

                  {!currentPreviewBanner?.badge_text && <div />}

                  {/* Bottom Text Overlay with Dark Gradient */}
                  {(currentPreviewBanner?.title || currentPreviewBanner?.subtitle) && (
                    <div className="relative z-10 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                      {currentPreviewBanner.title && (
                        <h4 className="text-sm font-black leading-tight drop-shadow-sm truncate">
                          {currentPreviewBanner.title}
                        </h4>
                      )}
                      {currentPreviewBanner.subtitle && (
                        <p className="text-[11px] text-white/90 leading-tight mt-0.5 truncate">
                          {currentPreviewBanner.subtitle}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Carousel Dots Row (HomeScreen.jsx lines 125-131) ── */}
                <div className="flex items-center justify-center gap-1.5 py-2 bg-white">
                  {previewBannersList.map((b, i) => {
                    const isCur = currentPreviewBanner?.id === b.id || previewBannersList.indexOf(currentPreviewBanner) === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedBannerIndex(i);
                          setSelectedBannerId(b.id);
                        }}
                        className={`transition-all rounded-full ${
                          isCur
                            ? 'w-4 h-1.5 bg-[#E91E8C]'
                            : 'w-1.5 h-1.5 bg-[#444] hover:bg-slate-500'
                        }`}
                        title={`Slide ${i + 1}`}
                      />
                    );
                  })}
                </div>

                {/* New Arrivals Section Mock */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">New Arrivals</span>
                    <span className="text-[11px] font-bold text-[#E91E8C]">See all →</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Pure Cotton Saree', price: '₹799', orig: '₹1,299' },
                      { name: 'Maternity Midi Dress', price: '₹999', orig: '₹1,699' },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-2 border border-slate-100 shadow-2xs">
                        <div className="w-full h-20 bg-slate-200/80 rounded-lg flex items-center justify-center text-xl mb-1.5">
                          👗
                        </div>
                        <p className="text-[10px] font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] font-black text-slate-900 mt-0.5">
                          {item.price}{' '}
                          <span className="text-[8px] text-slate-400 font-normal line-through">
                            {item.orig}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. Exact Mobile Bottom Tabs Navigation (MainTabs.jsx) */}
              <div className="bg-[#0F0F0F] h-[52px] border-t border-[#1e1e1e] px-4 flex items-center justify-around shrink-0 z-20">
                {[
                  { name: 'Home', icon: '🏠', active: true },
                  { name: 'Shop', icon: '🛍', active: false },
                  { name: 'Cart', icon: '🛒', active: false },
                  { name: 'Profile', icon: '👤', active: false },
                ].map((tab) => (
                  <div
                    key={tab.name}
                    className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                      tab.active ? 'text-[#E91E8C]' : 'text-slate-400'
                    }`}
                  >
                    <span className="text-sm">{tab.icon}</span>
                    <span className="text-[9px] font-bold">{tab.name}</span>
                  </div>
                ))}
              </div>

              {/* 7. iOS Home Gesture Indicator Bar */}
              <div className="bg-[#0F0F0F] pb-1.5 pt-0.5 text-center shrink-0 z-20">
                <div className="w-28 h-1 bg-white/30 rounded-full mx-auto"></div>
              </div>
            </div>

            {/* Note below preview */}
            <p className="text-[11px] text-slate-400 text-center max-w-xs">
              Live mobile hero slider reflects 2:1 ratio, floating offer badge, carousel dots, and category navigation.
            </p>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Banner Modal ── */}
      {showModal && (
        <Modal
          size="lg"
          title={editing ? `Edit Banner — ${editing.title || 'Banner'}` : 'Add Promotional Hero Banner'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Banner Artwork Upload Section ── */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Banner Artwork Image
                  </span>
                  {!editing ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                      Required
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Current Active
                    </span>
                  )}
                </div>

                {/* Upload Mode Switcher */}
                <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      uploadMode === 'file'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      uploadMode === 'url'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Web URL</span>
                  </button>
                </div>
              </div>

              {/* URL Input Box if mode === 'url' */}
              {uploadMode === 'url' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      placeholder="https://images.unsplash.com/... or CDN link"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                    {imageUrlInput && (
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="px-2.5 py-2 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Paste any public image direct URL (PNG, JPG, WEBP).
                  </p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="hidden"
              />

              {/* Main Visual Artwork Canvas & Dropzone */}
              {previewUrl ? (
                <div className="space-y-2">
                  <div className="relative aspect-[16/6] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xs group">
                    <img
                      src={previewUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        toast.error('Failed to load image from URL');
                      }}
                    />

                    {/* Live Artwork Overlay Simulation (Title, Subtitle & Badge) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-between p-3.5 pointer-events-none">
                      <div className="flex justify-between items-start">
                        {form.badge_active && form.badge_text ? (
                          <span
                            className="text-[10px] font-black uppercase tracking-wider text-white px-2 py-0.5 rounded-full shadow-xs"
                            style={{ backgroundColor: form.badge_color || '#E91E8C' }}
                          >
                            {form.badge_text}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="text-[10px] font-medium bg-black/60 text-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md pointer-events-auto">
                          16:6 Live Artwork
                        </span>
                      </div>

                      <div>
                        {form.title && (
                          <h4 className="text-white font-bold text-sm leading-tight drop-shadow-sm truncate">
                            {form.title}
                          </h4>
                        )}
                        {form.subtitle && (
                          <p className="text-white/80 text-[11px] line-clamp-1 drop-shadow-xs mt-0.5">
                            {form.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Overlay Controls */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/95 text-slate-800 hover:bg-white hover:text-indigo-600 px-2.5 py-1 rounded-lg shadow-xs border border-slate-200/80 backdrop-blur-xs cursor-pointer transition-colors"
                        title="Upload a different image"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/95 text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg shadow-xs border border-rose-200/80 backdrop-blur-xs cursor-pointer transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* File Metadata Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">
                        {fileInfo?.name || 'Banner image loaded'}
                      </span>
                      {fileInfo?.size && (
                        <span className="text-slate-400">({fileInfo.size})</span>
                      )}
                    </div>
                    <span className="text-slate-400 shrink-0">Ratio: 16:6 (2.67 : 1)</span>
                  </div>
                </div>
              ) : (
                /* Empty Dropzone Card */
                <div
                  onClick={() => {
                    if (uploadMode === 'file') fileInputRef.current?.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className={`relative aspect-[16/6] min-h-[160px] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer select-none ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]'
                      : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/80 shadow-2xs'
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to choose banner image <span className="font-normal text-slate-500">or drag & drop here</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PNG, JPG, or WEBP up to 10MB • Recommended 1600 × 600 px (16:6)
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200/80 transition-colors">
                    Browse File
                  </span>
                </div>
              )}
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
