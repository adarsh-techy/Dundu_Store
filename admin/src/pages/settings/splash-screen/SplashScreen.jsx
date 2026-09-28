import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  ImageIcon,
  X,
  Smartphone,
  Upload,
  RotateCcw
} from 'lucide-react';
import { splashApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

const BG_COLOR_OPTIONS = [
  { label: 'Black', value: '#0A0A0A' },
  { label: 'Slate', value: '#0F172A' },
  { label: 'Navy', value: '#111827' },
  { label: 'Emerald', value: '#064E3B' },
  { label: 'Plum', value: '#1E1035' },
  { label: 'White', value: '#FFFFFF' },
];

const TEXT_COLOR_OPTIONS = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Gold', value: '#F59E0B' },
  { label: 'Black', value: '#0A0A0A' },
  { label: 'Gray', value: '#94A3B8' },
];

const DURATION_OPTIONS = [
  { label: '1.5 sec', value: 1500 },
  { label: '2.0 sec', value: 2000 },
  { label: '2.5 sec', value: 2500 },
  { label: '3.0 sec', value: 3000 },
];

export default function SplashScreenPage() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [removeBg, setRemoveBg] = useState(false);

  const [form, setForm] = useState({
    app_name: 'Dundu',
    tagline: 'Fashion that fits your vibe',
    bg_color: '#0A0A0A',
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
        bg_color: splash.bg_color || '#0A0A0A',
        text_color: splash.text_color || '#FFFFFF',
        duration_ms: splash.duration_ms || 2500,
        is_active: splash.is_active ?? true,
      });
      if (splash.bg_image) setPreviewUrl(splash.bg_image);
    }
  }, [data]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB');
      return;
    }
    setBgImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveBg(false);
  };

  const handleRemoveImage = () => {
    setBgImage(null);
    setPreviewUrl('');
    setRemoveBg(true);
  };

  const resetForm = () => {
    const splash = data?.data?.splash;
    if (splash) {
      setForm({
        app_name: splash.app_name || 'Dundu',
        tagline: splash.tagline || '',
        bg_color: splash.bg_color || '#0A0A0A',
        text_color: splash.text_color || '#FFFFFF',
        duration_ms: splash.duration_ms || 2500,
        is_active: splash.is_active ?? true,
      });
      setPreviewUrl(splash.bg_image || '');
    }
    setBgImage(null);
    setRemoveBg(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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
        fd.append('bg_image', bgImage);
      } else if (removeBg) {
        fd.append('remove_bg_image', 'true');
      } else if (existingBgImageRef.current) {
        fd.append('existing_bg_image', existingBgImageRef.current);
      }

      const result = await splashApi.update(fd);
      const savedSplash = result?.data?.splash;
      if (savedSplash) existingBgImageRef.current = savedSplash.bg_image || '';
      else if (removeBg) existingBgImageRef.current = '';

      qc.invalidateQueries(['admin-splash']);
      toast.success('Splash screen saved!');
      setBgImage(null);
      setRemoveBg(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const savedSplash = data?.data?.splash;
  const isDirty = savedSplash
    ? (
      anyChanged(
        [form.app_name, savedSplash.app_name || 'Dundu'],
        [form.tagline, savedSplash.tagline || ''],
        [form.bg_color, savedSplash.bg_color || '#0A0A0A'],
        [form.text_color, savedSplash.text_color || '#FFFFFF'],
        [form.duration_ms, savedSplash.duration_ms || 2500],
        [form.is_active, savedSplash.is_active ?? true]
      ) ||
      bgImage !== null ||
      removeBg
    )
    : false;

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Splash Screen</h1>
          <p className="text-sm text-slate-500 mt-1">
            Customize the screen users see when the mobile app or website opens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            loading={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-sm text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Studio: Form (Left) & Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Simple Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Toggle & Basic Info */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-900 text-base">Enable Splash Screen</p>
                <p className="text-xs text-slate-500 mt-0.5">Show this screen on initial app boot</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  form.is_active ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* App Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                App Name / Logo Text
              </label>
              <Input
                value={form.app_name}
                onChange={(e) => setForm((p) => ({ ...p, app_name: e.target.value }))}
                placeholder="e.g. Dundu"
                maxLength={50}
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tagline (Optional)
              </label>
              <Input
                value={form.tagline}
                onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
                placeholder="e.g. Fashion that fits your vibe"
                maxLength={100}
              />
            </div>
          </div>

          {/* Card 2: Colors & Background Image */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Design & Colors
            </h2>

            {/* Background Color */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Background Color
              </label>
              <div className="flex items-center gap-2 mb-3">
                {BG_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm((p) => ({ ...p, bg_color: c.value }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.bg_color.toLowerCase() === c.value.toLowerCase()
                        ? 'border-slate-900 scale-110 ring-2 ring-slate-900/20'
                        : 'border-slate-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.bg_color}
                  onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-xs"
                />
                <Input
                  value={form.bg_color}
                  onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))}
                  className="w-36 font-mono text-sm uppercase"
                  maxLength={20}
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Text & Loader Color
              </label>
              <div className="flex items-center gap-2 mb-3">
                {TEXT_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm((p) => ({ ...p, text_color: c.value }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.text_color.toLowerCase() === c.value.toLowerCase()
                        ? 'border-slate-900 scale-110 ring-2 ring-slate-900/20'
                        : 'border-slate-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) => setForm((p) => ({ ...p, text_color: e.target.value }))}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-xs"
                />
                <Input
                  value={form.text_color}
                  onChange={(e) => setForm((p) => ({ ...p, text_color: e.target.value }))}
                  className="w-36 font-mono text-sm uppercase"
                  maxLength={20}
                />
              </div>
            </div>

            {/* Background Image Upload */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Background Image (Optional)
              </label>
              <p className="text-xs text-slate-400 mb-3">Vertical image (1080×1920) recommended.</p>

              {previewUrl ? (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900">
                  <img src={previewUrl} alt="Splash" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100 shadow-md">
                      Change Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-md flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-400 hover:bg-slate-50/60 transition-all p-4 text-center">
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">Click to upload background photo</span>
                  <span className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 5MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          {/* Card 3: Display Duration */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Display Duration</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DURATION_OPTIONS.map((d) => {
                const isSelected = form.duration_ms === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, duration_ms: d.value }))}
                    className={`py-3 px-4 rounded-2xl text-center border font-semibold text-sm transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSubmit}
              loading={loading}
              className="flex-1 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Save className="h-4 w-4" />
              Save Splash Screen
            </Button>
            {isDirty && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Discard
              </button>
            )}
          </div>
        </div>

        {/* Right: Live Phone Mockup (5 cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center gap-2 pb-4 border-b border-slate-100">
              <Smartphone className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live Preview
              </span>
            </div>

            {/* Smartphone Frame */}
            <div className="my-6 relative w-[280px] h-[540px] rounded-[40px] border-[8px] border-slate-900 shadow-xl overflow-hidden bg-slate-950">
              {/* Top Notch / Pill */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-30" />

              {/* Status bar */}
              <div
                className="absolute top-3 left-6 right-6 flex items-center justify-between text-[10px] font-semibold z-20 opacity-70"
                style={{ color: form.text_color }}
              >
                <span>9:41</span>
                <span>5G</span>
              </div>

              {/* Canvas */}
              <div
                className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center"
                style={{ backgroundColor: form.bg_color }}
              >
                {/* Background Image */}
                {previewUrl && (
                  <div className="absolute inset-0 z-0">
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                )}

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
                  <div
                    className="text-3xl font-extrabold tracking-tight font-sans drop-shadow-sm"
                    style={{ color: form.text_color }}
                  >
                    {form.app_name || 'Dundu'}
                  </div>

                  {form.tagline && (
                    <div
                      className="text-xs font-medium tracking-wide max-w-[180px] opacity-80"
                      style={{ color: form.text_color }}
                    >
                      {form.tagline}
                    </div>
                  )}

                  {/* Loading dots */}
                  <div className="flex items-center gap-1.5 pt-6">
                    <div
                      className="w-1.5 h-1.5 rounded-full opacity-80 animate-bounce"
                      style={{ backgroundColor: form.text_color, animationDelay: '0ms' }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full opacity-80 animate-bounce"
                      style={{ backgroundColor: form.text_color, animationDelay: '150ms' }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full opacity-80 animate-bounce"
                      style={{ backgroundColor: form.text_color, animationDelay: '300ms' }}
                    />
                  </div>
                </div>

                {/* Bottom Bar */}
                <div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full z-20 opacity-40"
                  style={{ backgroundColor: form.text_color }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Displays for {(form.duration_ms / 1000).toFixed(1)}s when the app opens
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
