import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, ImageIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { bannerApi, categoryApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  { label: 'Pink',   value: '#e91e8c' },
  { label: 'Red',    value: '#e53e3e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Green',  value: '#16a34a' },
  { label: 'Blue',   value: '#2563eb' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Black',  value: '#1a1a1a' },
];

const EMPTY_FORM = { title: '', subtitle: '', link: '', sort_order: 0, category_slug: '', badge_text: '', badge_active: false, badge_color: '#e91e8c' };

function slugToCategory(link, categories) {
  const m = link?.match(/[?&]category=([^&]+)/);
  if (!m) return '';
  return categories.find((c) => c.slug === m[1])?.slug || '';
}

export default function Banners() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // banner object being edited
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const { data, isLoading } = useQuery({ queryKey: ['admin-banners'], queryFn: bannerApi.list });
  const banners = data?.data?.banners || [];

  const { data: catData } = useQuery({ queryKey: ['admin-categories'], queryFn: categoryApi.list });
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
      badge_color: banner.badge_color || '#e91e8c',
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
        toast.success('Banner updated');
      } else {
        await bannerApi.create(fd);
        toast.success('Banner created');
      }
      setShowModal(false);
      qc.invalidateQueries(['admin-banners']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (banner) => {
    try {
      await bannerApi.toggle(banner.id);
      qc.invalidateQueries(['admin-banners']);
      toast.success(banner.is_active ? 'Banner deactivated' : 'Banner activated');
    } catch { toast.error('Failed to toggle'); }
  };

  const handleDelete = async (banner) => {
    if (!confirm(`Delete banner "${banner.title || 'this banner'}"? This cannot be undone.`)) return;
    try {
      await bannerApi.remove(banner.id);
      qc.invalidateQueries(['admin-banners']);
      toast.success('Banner deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleReorder = async (banner, direction) => {
    const idx = banners.findIndex((b) => b.id === banner.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const other = banners[swapIdx];
    try {
      await Promise.all([
        bannerApi.update(banner.id, (() => { const fd = new FormData(); fd.append('sort_order', other.sort_order); return fd; })()),
        bannerApi.update(other.id, (() => { const fd = new FormData(); fd.append('sort_order', banner.sort_order); return fd; })()),
      ]);
      qc.invalidateQueries(['admin-banners']);
    } catch { toast.error('Failed to reorder'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-400 mt-0.5">{banners.length} banner{banners.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Banner</Button>
      </div>

      {isLoading ? <Spinner /> : banners.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No banners yet. Add your first banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Image */}
              <div className="relative aspect-[16/5] bg-gray-100">
                {b.image_url
                  ? <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="h-8 w-8" /></div>
                }
                {/* Active badge overlay */}
                <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full
                  ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.is_active ? 'Active' : 'Inactive'}
                </span>
                {/* Offer badge preview */}
                {b.badge_text && (
                  <span className={`absolute bottom-2 left-2 text-xs font-bold px-3 py-1 rounded-full
                    ${b.badge_active ? 'bg-pink-500 text-white' : 'bg-gray-400 text-white line-through opacity-60'}`}>
                    {b.badge_text}
                  </span>
                )}
                <span className="absolute top-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                  #{b.sort_order}
                </span>
              </div>

              {/* Info + Actions */}
              <div className="p-4">
                <p className="font-medium text-sm text-gray-800">{b.title || <span className="text-gray-400 italic">No title</span>}</p>
                {b.subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{b.subtitle}</p>}
                {b.link && (() => {
                  const slug = slugToCategory(b.link, categories);
                  const cat = categories.find((c) => c.slug === slug);
                  return (
                    <p className="text-xs text-indigo-400 mt-0.5 truncate">
                      {cat ? `→ ${cat.name}` : b.link}
                    </p>
                  );
                })()}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggle(b)}
                    title={b.is_active ? 'Deactivate' : 'Activate'}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
                      ${b.is_active
                        ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
                        : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'}`}
                  >
                    {b.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {b.is_active ? 'Active' : 'Inactive'}
                  </button>

                  <div className="ml-auto flex items-center gap-1">
                    {/* Reorder */}
                    <button
                      onClick={() => handleReorder(b, 'up')}
                      disabled={banners.indexOf(b) === 0}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(b, 'down')}
                      disabled={banners.indexOf(b) === banners.length - 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(b)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Banner' : 'Add Banner'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image upload + preview */}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Banner Image {editing && '(leave empty to keep current)'}
              </label>
              {previewUrl && (
                <div className="aspect-[16/5] rounded-xl overflow-hidden bg-gray-100 mb-2">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange}
                className="block text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium cursor-pointer" />
            </div>

            <Input label="Title" value={form.title} onChange={set('title')} placeholder="Summer Sale" />
            <Input label="Subtitle" value={form.subtitle} onChange={set('subtitle')} placeholder="Up to 50% off" />

            {/* Category picker */}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1.5">
                Link to Category
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
              >
                <option value="">— No category (use custom link) —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Custom link (shown when no category selected) */}
            {!form.category_slug && (
              <Input
                label="Custom Link (optional)"
                value={form.link}
                onChange={set('link')}
                placeholder="/products?offer=true"
              />
            )}

            <Input label="Sort Order" type="number" value={form.sort_order} onChange={set('sort_order')} />

            {/* Offer Badge */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Offer Badge</p>
              <Input label="Badge Text" value={form.badge_text} onChange={set('badge_text')} placeholder="e.g. Up to 50% OFF" />

              {/* Color presets */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Badge Color</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c.value} type="button" onClick={() => setForm((p) => ({ ...p, badge_color: c.value }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.badge_color === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }} title={c.label} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Custom:</span>
                  <input type="color" value={form.badge_color}
                    onChange={(e) => setForm((p) => ({ ...p, badge_color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                  <input type="text" value={form.badge_color} onChange={set('badge_color')}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
                    placeholder="#e91e8c" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.badge_active}
                  onChange={(e) => setForm((p) => ({ ...p, badge_active: e.target.checked }))}
                  className="w-4 h-4 accent-pink-500" />
                <span className="text-sm text-gray-700 font-medium">Show badge on banner</span>
              </label>

              {form.badge_text && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Preview:</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: form.badge_active ? form.badge_color : '#9ca3af' }}>
                    {form.badge_text}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>{editing ? 'Save Changes' : 'Add Banner'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
