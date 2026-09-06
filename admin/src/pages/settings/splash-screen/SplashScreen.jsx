import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ImageIcon, X, Smartphone, Eye } from 'lucide-react';
import { splashApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  { label: 'Black',  value: '#0F0F0F' },
  { label: 'Pink',   value: '#E91E8C' },
  { label: 'Navy',   value: '#0A1628' },
  { label: 'Purple', value: '#1A0B2E' },
  { label: 'Dark Green', value: '#0A1F0A' },
  { label: 'Midnight', value: '#12122A' },
  { label: 'White',  value: '#FFFFFF' },
];

const TEXT_COLORS = [
  { label: 'White',  value: '#FFFFFF' },
  { label: 'Pink',   value: '#E91E8C' },
  { label: 'Gold',   value: '#FFD700' },
  { label: 'Black',  value: '#0F0F0F' },
  { label: 'Gray',   value: '#AAAAAA' },
];

const DURATIONS = [
  { label: '1.5 sec', value: 1500 },
  { label: '2 sec',   value: 2000 },
  { label: '2.5 sec', value: 2500 },
  { label: '3 sec',   value: 3000 },
  { label: '4 sec',   value: 4000 },
];

export default function SplashScreenPage() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [removeBg, setRemoveBg] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    app_name: 'Dundu',
    tagline: 'Fashion that fits your vibe',
    bg_color: '#0F0F0F',
    text_color: '#FFFFFF',
    duration_ms: 2500,
    is_active: true,
  });

  const existingBgImageRef = useRef('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-splash'],
    queryFn: splashApi.get,
  });

  useEffect(() => {
    const splash = data?.data?.splash;
    if (splash) {
      existingBgImageRef.current = splash.bg_image || '';
      setForm({
        app_name: splash.app_name || 'Dundu',
        tagline: splash.tagline || '',
        bg_color: splash.bg_color || '#0F0F0F',
        text_color: splash.text_color || '#FFFFFF',
        duration_ms: splash.duration_ms || 2500,
        is_active: splash.is_active ?? true,
      });
      if (splash.bg_image) setPreviewUrl(splash.bg_image);
    }
  }, [data]);


  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBgImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveBg(false);
  };

  const handleRemoveImage = () => {
    setBgImage(null);
    setPreviewUrl('');
    setRemoveBg(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('app_name', form.app_name);
      fd.append('tagline', form.tagline);
      fd.append('bg_color', form.bg_color);
      fd.append('text_color', form.text_color);
      fd.append('duration_ms', String(form.duration_ms));
      fd.append('is_active', String(form.is_active));

      if (bgImage) {
        // New file selected — upload it
        fd.append('bg_image', bgImage);
      } else if (removeBg) {
        // Explicit removal — signal backend with a dedicated flag
        fd.append('remove_bg_image', 'true');
      } else {
        // No change — pass existing URL so backend keeps it
        if (existingBgImageRef.current) fd.append('existing_bg_image', existingBgImageRef.current);
      }

      const result = await splashApi.update(fd);
      // Update ref with new saved state immediately
      const savedSplash = result?.data?.splash;
      if (savedSplash) existingBgImageRef.current = savedSplash.bg_image || '';
      else if (bgImage) {/* ref will be updated by the invalidate/refetch */}
      else if (removeBg) existingBgImageRef.current = '';

      qc.invalidateQueries(['admin-splash']);
      toast.success('Splash screen updated!');
      // Reset file state after successful save
      setBgImage(null);
      setRemoveBg(false);

    } catch (err) {
      toast.error(err?.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };


  const savedSplash = data?.data?.splash;
  const formDirty = savedSplash
    ? (
      anyChanged(
        [form.app_name, savedSplash.app_name || 'Dundu'],
        [form.tagline, savedSplash.tagline || ''],
        [form.bg_color, savedSplash.bg_color || '#0F0F0F'],
        [form.text_color, savedSplash.text_color || '#FFFFFF'],
        [form.duration_ms, savedSplash.duration_ms || 2500],
        [form.is_active, savedSplash.is_active ?? true]
      ) ||
      bgImage !== null ||
      removeBg
    )
    : true; // no config saved yet — always allow the first save

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Splash Screen</h1>
          <p className="text-sm text-gray-500 mt-1">Configure what users see when the app first opens</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Active toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">Enable Splash Screen</p>
                <p className="text-sm text-gray-500 mt-0.5">Show this custom splash screen to users when the app opens</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.is_active ? 'bg-pink-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Text Content */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Content</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">App Name</label>
              <Input
                value={form.app_name}
                onChange={set('app_name')}
                placeholder="e.g. Dundu"
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mt-1">Displayed as the large logo text on the splash</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline / Caption</label>
              <Input
                value={form.tagline}
                onChange={set('tagline')}
                placeholder="e.g. Fashion that fits your vibe"
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1">Short caption shown below the app name</p>
            </div>
          </div>

          {/* Background Image */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Background Image</h2>
            <p className="text-xs text-gray-400 -mt-2">Optional. If set, overlaid on the background color. Use a dark, vertical image for best results.</p>
            {previewUrl ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={previewUrl} alt="BG preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1.5 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-pink-400 hover:bg-pink-50/50 transition-colors">
                <ImageIcon className="h-8 w-8 text-gray-300" />
                <span className="text-sm text-gray-400">Click to upload background image</span>
                <span className="text-xs text-gray-300">PNG, JPG, WEBP · Recommended 1080×1920</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Colors */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Colors</h2>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm((p) => ({ ...p, bg_color: c.value }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.bg_color === c.value ? 'border-pink-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value, boxShadow: '0 0 0 1px #e5e7eb' }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.bg_color}
                  onChange={set('bg_color')}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <Input value={form.bg_color} onChange={set('bg_color')} className="flex-1" maxLength={20} />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm((p) => ({ ...p, text_color: c.value }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.text_color === c.value ? 'border-pink-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value, boxShadow: '0 0 0 1px #e5e7eb' }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={set('text_color')}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <Input value={form.text_color} onChange={set('text_color')} className="flex-1" maxLength={20} />
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider mb-3">Display Duration</h2>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, duration_ms: d.value }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.duration_ms === d.value
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          {formDirty && (
            <Button type="submit" loading={loading} className="w-full flex items-center justify-center gap-2">
              <Save className="h-4 w-4" />
              Save Splash Configuration
            </Button>
          )}
        </form>

        {/* Live Preview */}
        {showPreview && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" /> Live Preview
            </p>
            {/* Phone frame */}
            <div className="relative w-[280px] h-[560px] rounded-[36px] border-4 border-gray-800 shadow-2xl overflow-hidden"
                 style={{ backgroundColor: form.bg_color }}>
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-800 rounded-full z-10" />

              {/* Background image */}
              {previewUrl && (
                <img src={previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              )}

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-3">
                <div
                  className="text-4xl font-black tracking-widest"
                  style={{ color: form.text_color }}
                >
                  {form.app_name || 'Dundu'}
                </div>
                {form.tagline && (
                  <div
                    className="text-xs text-center tracking-wide opacity-80"
                    style={{ color: form.text_color }}
                  >
                    {form.tagline}
                  </div>
                )}
                {/* Loading dots */}
                <div className="flex gap-1.5 mt-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full opacity-60"
                      style={{ backgroundColor: form.text_color }}
                    />
                  ))}
                </div>
              </div>

              {/* Bottom bar indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full"
                   style={{ backgroundColor: form.text_color, opacity: 0.3 }} />
            </div>
            <p className="text-xs text-gray-400">Shows for {form.duration_ms / 1000}s on app launch</p>
          </div>
        )}
      </div>
    </div>
  );
}
