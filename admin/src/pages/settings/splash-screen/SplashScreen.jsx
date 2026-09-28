import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  ImageIcon,
  X,
  Smartphone,
  Upload,
  RotateCcw,
  Crop,
  Type,
  AlignLeft,
  Palette,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { splashApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import ImageCropperModal from '../../../components/ui/ImageCropperModal';
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
  { label: 'Rose', value: '#FB7185' },
  { label: 'Emerald', value: '#34D399' },
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

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropSource, setCropSource] = useState(null); // { src, name }
  const fileInputRef = useRef(null);

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
      if (splash.bg_image) {
        setPreviewUrl(splash.bg_image);
        setCropSource({ src: splash.bg_image, name: 'Active Splash Artwork' });
      }
    }
  }, [data]);

  // When a photo file is picked, feed it to the 9:16 cropper modal
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropSource({ src: reader.result, name: file.name });
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedFile, croppedUrl) => {
    setBgImage(croppedFile);
    setPreviewUrl(croppedUrl);
    setRemoveBg(false);
    toast.success('Splash photo cropped & applied');
  };

  const handleRemoveImage = () => {
    setBgImage(null);
    setPreviewUrl('');
    setCropSource(null);
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
      setCropSource(splash.bg_image ? { src: splash.bg_image, name: 'Active Splash Artwork' } : null);
    }
    setBgImage(null);
    setRemoveBg(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('app_name', form.app_name.trim() || 'Dundu');
      fd.append('tagline', form.tagline.trim());
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
      
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Splash Screen</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Mobile App Boot
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Customize the photo, title text, and subtext displayed when the app opens.
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

      {/* ── Main Studio: Form (7 cols) & Live Phone Mockup (5 cols) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Settings Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* ── CARD 1: Splash Photo, Text & Subtext ────────────────────── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Splash Photo, Text & Subtext
                </h2>
                <p className="text-xs text-slate-500">
                  Upload artwork and configure the overlay title and subtitle
                </p>
              </div>
            </div>

            {/* 1. Photo Upload / Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Background Photo (Vertical 9:16)
                </label>
                {previewUrl && (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Photo Active
                  </span>
                )}
              </div>

              {previewUrl ? (
                <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-950 flex items-center justify-center">
                  <img src={previewUrl} alt="Splash photo" className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-black/40" />

                  {/* Overlaid preview badge */}
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                      9:16 Splash Photo
                    </span>
                  </div>

                  {/* Overlay Action Buttons */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2.5 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    {cropSource && (
                      <button
                        type="button"
                        onClick={() => setCropperOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow-md flex items-center gap-1.5 cursor-pointer"
                        title="Crop & position photo"
                      >
                        <Crop className="w-3.5 h-3.5 text-emerald-600" />
                        Crop Photo
                      </button>
                    )}
                    <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shadow-md flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Change Photo
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2.5 w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all p-5 text-center group">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">Upload Splash Screen Photo</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Recommended 1080×1920 portrait · PNG, JPG, or WEBP</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            {/* 2. Text (Main Title) & Subtext (Tagline) Inputs */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Text & Subtext On Photo
                </span>
              </div>

              {/* Main Title / Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Main Text / Headline Title
                </label>
                <Input
                  value={form.app_name}
                  onChange={(e) => setForm((p) => ({ ...p, app_name: e.target.value }))}
                  placeholder="e.g. Dundu"
                  maxLength={50}
                  className="font-bold text-base"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Primary brand name or headline shown center-screen when the app opens
                </p>
              </div>

              {/* Subtext / Tagline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subtext / Slogan / Subtitle
                </label>
                <Input
                  value={form.tagline}
                  onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
                  placeholder="e.g. Fashion that fits your vibe"
                  maxLength={100}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Secondary slogan or subtitle displayed directly beneath the main text
                </p>
              </div>

              {/* Text & Subtext Color */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Text & Subtext Color
                </label>
                <div className="flex items-center gap-2 mb-2.5">
                  {TEXT_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setForm((p) => ({ ...p, text_color: c.value }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        form.text_color.toLowerCase() === c.value.toLowerCase()
                          ? 'border-indigo-600 scale-110 ring-2 ring-indigo-500/20'
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
                    className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-xs"
                  />
                  <Input
                    value={form.text_color}
                    onChange={(e) => setForm((p) => ({ ...p, text_color: e.target.value }))}
                    className="w-32 font-mono text-xs uppercase"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ── CARD 2: Appearance & Behavior Settings ──────────────────── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Settings & Timing
            </h2>

            {/* Enable Splash Screen toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Enable Splash Screen</p>
                <p className="text-xs text-slate-500 mt-0.5">Show this splash screen on app boot</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
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

            {/* Fallback Background Color */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Fallback Background Color
              </label>
              <p className="text-xs text-slate-400 mb-2.5">
                Color displayed behind the image or when no image is uploaded
              </p>
              <div className="flex items-center gap-2 mb-3">
                {BG_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm((p) => ({ ...p, bg_color: c.value }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                      form.bg_color.toLowerCase() === c.value.toLowerCase()
                        ? 'border-indigo-600 scale-110 ring-2 ring-indigo-500/20'
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
                  className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-xs"
                />
                <Input
                  value={form.bg_color}
                  onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))}
                  className="w-32 font-mono text-xs uppercase"
                  maxLength={20}
                />
              </div>
            </div>

            {/* Display Duration */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Display Duration
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DURATION_OPTIONS.map((d) => {
                  const isSelected = form.duration_ms === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, duration_ms: d.value }))}
                      className={`py-2.5 px-3 rounded-xl text-center border font-semibold text-xs transition-all cursor-pointer ${
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
          </div>

          {/* ── Bottom Action Bar (Always Visible) ───────────────────────── */}
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

        {/* ── Right: Live Phone Mockup (5 cols) ─────────────────────────── */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center">
            
            <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live Phone Preview
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {(form.duration_ms / 1000).toFixed(1)}s Boot
              </span>
            </div>

            {/* Smartphone Frame */}
            <div className="my-6 relative w-[280px] h-[540px] rounded-[40px] border-[8px] border-slate-900 shadow-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
              
              {/* Top Notch / Dynamic Island */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-30" />

              {/* Status bar */}
              <div
                className="absolute top-3 left-6 right-6 flex items-center justify-between text-[10px] font-semibold z-20 opacity-75"
                style={{ color: form.text_color }}
              >
                <span>9:41</span>
                <span>5G</span>
              </div>

              {/* Canvas Background & Photo */}
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

                {/* Overlaid Content: Main Text & Subtext */}
                <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
                  <div
                    className="text-3xl font-extrabold tracking-tight font-sans drop-shadow-md"
                    style={{ color: form.text_color }}
                  >
                    {form.app_name || 'Dundu'}
                  </div>

                  {form.tagline && (
                    <div
                      className="text-xs font-medium tracking-wide max-w-[200px] opacity-90 drop-shadow-sm leading-relaxed"
                      style={{ color: form.text_color }}
                    >
                      {form.tagline}
                    </div>
                  )}

                  {/* Loading bouncing dots */}
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

                {/* Bottom Home Indicator Bar */}
                <div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full z-20 opacity-40"
                  style={{ backgroundColor: form.text_color }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
              Real-time preview of how customers will see your photo, main title text, and subtext when launching the app.
            </p>
          </div>
        </div>

      </div>

      {/* ── Interactive 9:16 Crop Modal ─────────────────────────────────── */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropSource?.src}
        aspectRatio={9 / 16}
        allowRatioSwitch={false}
        previewType="splash"
        itemName={form.app_name}
        subtitle={form.tagline}
        fileNamePrefix="splash"
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />

    </div>
  );
}
