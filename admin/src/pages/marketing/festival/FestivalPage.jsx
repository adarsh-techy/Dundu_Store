import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Palette,
  Megaphone,
  CheckCircle2,
  Save,
  RotateCcw,
  Check,
  Sparkles,
  Smartphone,
  Copy,
  Tag,
  ShoppingBag,
  ArrowRight,
  Search,
  Bell,
  Home,
  Grid,
  Layers,
  User,
  X,
  Clock,
  Eye
} from 'lucide-react';
import { festivalApi } from '../../../api';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const PRESET_THEMES = [
  {
    name: 'Diwali Purple',
    navbar: '#7C3AED',
    navbarText: '#FFFFFF',
    bg: '#FFF7ED',
    btn: '#E91E8C',
  },
  {
    name: 'Crimson Gold',
    navbar: '#991B1B',
    navbarText: '#FFFFFF',
    bg: '#FEF2F2',
    btn: '#D97706',
  },
  {
    name: 'Emerald Prosperity',
    navbar: '#065F46',
    navbarText: '#FFFFFF',
    bg: '#F0FDF4',
    btn: '#059669',
  },
  {
    name: 'Midnight Sparkle',
    navbar: '#1E1B4B',
    navbarText: '#FFFFFF',
    bg: '#FAF5FF',
    btn: '#8B5CF6',
  },
];

export default function FestivalPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['festival-config'],
    queryFn: festivalApi.get,
  });

  const rawConfig = data?.data?.festival || {};

  const [cfg, setCfg] = useState({
    festival_enabled: false,
    festival_name: 'Grand Festival Sale',
    festival_bg_color: '#FFF7ED',
    festival_navbar_color: '#7C3AED',
    festival_navbar_text_color: '#FFFFFF',
    festival_logo_url: '',
    festival_banner_text: 'Festive Special Offers — Up to 50% Off Everything!',
    festival_popup_enabled: true,
    festival_popup_heading: 'Grand Festival Sale is Live!',
    festival_popup_subtext: 'Get exclusive festive discounts on all collections today!',
    festival_popup_coupon: 'FESTIVE30',
    festival_popup_badge_text: 'LIMITED TIME OFFER',
    festival_popup_btn_text: 'Shop Now',
    festival_popup_btn_color: '#E91E8C',
    festival_popup_expires_at: '',
  });

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('home'); // 'home' | 'popup'
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const initialDataRef = useRef(null);

  useEffect(() => {
    if (data?.data?.festival) {
      const initial = {
        festival_enabled: rawConfig.festival_enabled === 'true' || rawConfig.festival_enabled === true,
        festival_name: rawConfig.festival_name || 'Grand Festival Sale',
        festival_bg_color: rawConfig.festival_bg_color || '#FFF7ED',
        festival_navbar_color: rawConfig.festival_navbar_color || '#7C3AED',
        festival_navbar_text_color: rawConfig.festival_navbar_text_color || '#FFFFFF',
        festival_logo_url: rawConfig.festival_logo_url || '',
        festival_banner_text: rawConfig.festival_banner_text || 'Festive Special Offers — Up to 50% Off Everything!',
        festival_popup_enabled: rawConfig.festival_popup_enabled === 'true' || rawConfig.festival_popup_enabled === true,
        festival_popup_heading: rawConfig.festival_popup_heading || 'Grand Festival Sale is Live!',
        festival_popup_subtext: rawConfig.festival_popup_subtext || 'Get exclusive festive discounts on all collections today!',
        festival_popup_coupon: rawConfig.festival_popup_coupon || 'FESTIVE30',
        festival_popup_badge_text: rawConfig.festival_popup_badge_text || 'LIMITED TIME OFFER',
        festival_popup_btn_text: rawConfig.festival_popup_btn_text || 'Shop Now',
        festival_popup_btn_color: rawConfig.festival_popup_btn_color || '#E91E8C',
        festival_popup_expires_at: rawConfig.festival_popup_expires_at || '',
      };
      setCfg(initial);
      initialDataRef.current = JSON.stringify(initial);
    }
  }, [data]);

  // Dirty state tracking: true when user changed any setting
  const isDirty = initialDataRef.current !== null && JSON.stringify(cfg) !== initialDataRef.current;

  const handleDiscard = () => {
    if (initialDataRef.current) {
      setCfg(JSON.parse(initialDataRef.current));
      toast('Changes discarded', { icon: '↩️' });
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...cfg,
        festival_enabled: cfg.festival_enabled ? 'true' : 'false',
        festival_popup_enabled: cfg.festival_popup_enabled ? 'true' : 'false',
      };
      await festivalApi.update(payload);
      qc.invalidateQueries({ queryKey: ['festival-config'] });
      initialDataRef.current = JSON.stringify(cfg);
      toast.success('Festival settings saved successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setCfg((prev) => ({
      ...prev,
      festival_navbar_color: preset.navbar,
      festival_navbar_text_color: preset.navbarText,
      festival_bg_color: preset.bg,
      festival_popup_btn_color: preset.btn,
    }));
    toast.success(`Applied ${preset.name} palette`);
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-amber-500/15 p-6 sm:p-7 rounded-3xl border border-purple-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 text-white px-3 py-1 rounded-full shadow-xs">
              <Sparkles className="h-3 w-3" />
              Festive Campaign Studio
            </span>
            {cfg.festival_enabled ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live on Mobile App
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-full">
                Festival Inactive
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Festival Offers & App Theme
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Customize the seasonal festive branding and promotional popup offer for your mobile app.
          </p>
        </div>

        {/* Top Save button appears when isDirty with Blue bg and White text */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-700 bg-white font-semibold text-xs hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </button>
          )}

          {isDirty ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer animate-fadeIn"
            >
              <Save className="h-4 w-4 text-white" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs font-semibold shadow-xs">
              <Check className="h-3.5 w-3.5 text-blue-600" />
              Saved
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Simple Studio: Left Form & Right Exact Mobile App Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Simple & Non-Complicated Controls (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Card 1: Festival Master Status & Campaign Identity */}
          <div className="bg-white rounded-3xl border border-purple-200/70 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Festival Mode Activation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle festive theme live across the Dundu mobile app
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCfg((p) => ({ ...p, festival_enabled: !p.festival_enabled }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  cfg.festival_enabled ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    cfg.festival_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Festival Campaign Name
                </label>
                <Input
                  value={cfg.festival_name}
                  onChange={(e) => setCfg({ ...cfg, festival_name: e.target.value })}
                  placeholder="e.g. Diwali Mega Sale"
                  className="font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Top App Header Banner Text
                </label>
                <Input
                  value={cfg.festival_banner_text}
                  onChange={(e) => setCfg({ ...cfg, festival_banner_text: e.target.value })}
                  placeholder="e.g. Festive Special: Up to 50% Off Everything!"
                  className="text-slate-800 text-sm font-semibold"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Shown in the top announcement strip right above the mobile app header
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: App Colors & Preset Palettes */}
          <div className="bg-white rounded-3xl border border-purple-200/70 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 text-white shadow-xs">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Mobile App Theme Colors</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick a 1-click theme preset or customize colors
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quick Theme Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => handleApplyPreset(theme)}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs text-left transition-all cursor-pointer bg-slate-50/50 flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-slate-800 truncate mb-2">
                      {theme.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: theme.navbar }} title="Header" />
                      <span className="w-4 h-4 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: theme.bg }} title="Background" />
                      <span className="w-4 h-4 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: theme.btn }} title="Button" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Header Bar
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.festival_navbar_color || '#7C3AED'}
                    onChange={(e) => setCfg({ ...cfg, festival_navbar_color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                  />
                  <Input
                    value={cfg.festival_navbar_color}
                    onChange={(e) => setCfg({ ...cfg, festival_navbar_color: e.target.value })}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Page Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.festival_bg_color || '#FFF7ED'}
                    onChange={(e) => setCfg({ ...cfg, festival_bg_color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                  />
                  <Input
                    value={cfg.festival_bg_color}
                    onChange={(e) => setCfg({ ...cfg, festival_bg_color: e.target.value })}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Button Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.festival_popup_btn_color || '#E91E8C'}
                    onChange={(e) => setCfg({ ...cfg, festival_popup_btn_color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                  />
                  <Input
                    value={cfg.festival_popup_btn_color}
                    onChange={(e) => setCfg({ ...cfg, festival_popup_btn_color: e.target.value })}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Mobile App Popup Offer & Coupon */}
          <div className="bg-white rounded-3xl border border-pink-200/70 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Mobile Welcome Popup Offer</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modal banner shown when customers open the mobile app
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCfg((p) => ({ ...p, festival_popup_enabled: !p.festival_popup_enabled }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  cfg.festival_popup_enabled ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    cfg.festival_popup_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Popup Badge Text
                  </label>
                  <Input
                    value={cfg.festival_popup_badge_text}
                    onChange={(e) => setCfg({ ...cfg, festival_popup_badge_text: e.target.value })}
                    placeholder="e.g. LIMITED TIME OFFER"
                    className="font-bold text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Coupon Code
                  </label>
                  <Input
                    value={cfg.festival_popup_coupon}
                    onChange={(e) => setCfg({ ...cfg, festival_popup_coupon: e.target.value.toUpperCase() })}
                    placeholder="e.g. FESTIVE30"
                    className="font-mono text-xs font-bold uppercase tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Popup Heading
                </label>
                <Input
                  value={cfg.festival_popup_heading}
                  onChange={(e) => setCfg({ ...cfg, festival_popup_heading: e.target.value })}
                  placeholder="e.g. Grand Festival Sale is Live!"
                  className="font-extrabold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Popup Subtext
                </label>
                <Input
                  value={cfg.festival_popup_subtext}
                  onChange={(e) => setCfg({ ...cfg, festival_popup_subtext: e.target.value })}
                  placeholder="e.g. Get exclusive discounts on all orders today!"
                  className="text-slate-700 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Action Button Text
                  </label>
                  <Input
                    value={cfg.festival_popup_btn_text}
                    onChange={(e) => setCfg({ ...cfg, festival_popup_btn_text: e.target.value })}
                    placeholder="Shop Now"
                    className="font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Auto-Expiration (Optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={cfg.festival_popup_expires_at || ''}
                    onChange={(e) => setCfg({ ...cfg, festival_popup_expires_at: e.target.value })}
                    className="text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Bar (shows when isDirty) */}
          {isDirty && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-950">You have unsaved changes</p>
                  <p className="text-[11px] text-blue-700">Click below to publish the updated festival settings to the mobile app.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="px-4 py-2.5 rounded-xl border border-blue-300 text-blue-800 bg-white font-semibold text-xs hover:bg-blue-100/50 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4 text-white" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Right Column: Exact Mobile App Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-3xl border border-purple-200/80 p-6 shadow-sm flex flex-col items-center">
            {/* Preview Mode Selector */}
            <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Exact Mobile App Preview
                </span>
              </div>

              {/* Mode Switch: Home Screen vs Popup Offer */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('home')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === 'home'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Home Screen
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('popup')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === 'popup'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Popup Offer
                </button>
              </div>
            </div>

            {/* Smartphone Device Frame matching Dundu Mobile App */}
            <div className="my-5 relative w-[290px] h-[580px] rounded-[44px] border-[9px] border-slate-900 shadow-2xl overflow-hidden bg-slate-900 flex flex-col justify-between text-white select-none">
              {/* Dynamic Island / Speaker Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-end px-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
              </div>

              {/* Screen Interior */}
              <div
                className="relative w-full h-full flex flex-col justify-between overflow-hidden transition-colors"
                style={{ backgroundColor: cfg.festival_enabled ? cfg.festival_bg_color : '#FFFFFF' }}
              >
                {/* 1. Mobile Status Bar (9:41, Icons) */}
                <div
                  className="pt-3 px-6 pb-1 flex items-center justify-between text-[11px] font-bold z-20"
                  style={{
                    backgroundColor: cfg.festival_enabled ? cfg.festival_navbar_color : '#040d04',
                    color: cfg.festival_enabled ? cfg.festival_navbar_text_color : '#FFFFFF',
                  }}
                >
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span>5G</span>
                    <div className="w-4 h-2 rounded-xs border border-current flex items-center p-0.5">
                      <div className="w-full h-full bg-current rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* 2. Top Festive Banner Strip (matching mobile/src/components/ui/AppHeader.jsx) */}
                {cfg.festival_enabled && cfg.festival_banner_text && (
                  <div
                    className="py-1 px-3 text-center text-[10px] font-bold truncate z-20 border-b border-black/10"
                    style={{
                      backgroundColor: cfg.festival_navbar_color,
                      color: cfg.festival_navbar_text_color,
                      filter: 'brightness(0.92)',
                    }}
                  >
                    {cfg.festival_banner_text}
                  </div>
                )}

                {/* 3. Mobile AppHeader (matching Dundu mobile app) */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between z-20 shadow-xs"
                  style={{
                    backgroundColor: cfg.festival_enabled ? cfg.festival_navbar_color : '#040d04',
                    color: cfg.festival_enabled ? cfg.festival_navbar_text_color : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="font-extrabold text-sm tracking-wider uppercase font-serif">
                      DUNDU
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 opacity-90" />
                    <Bell className="h-4 w-4 opacity-90" />
                    <div className="relative">
                      <ShoppingBag className="h-4 w-4 opacity-90" />
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. App Main Body Content */}
                <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 text-slate-800">
                  {/* Category Circles */}
                  <div className="flex items-center justify-between px-1">
                    {['Women', 'Kids', 'Baby', 'Festive'].map((cat, i) => (
                      <div key={cat} className="flex flex-col items-center gap-1">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
                          i === 3
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                          {cat[0]}
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">{cat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Hero Festive Banner */}
                  <div
                    className="rounded-2xl p-4 text-white shadow-md space-y-2 relative overflow-hidden"
                    style={{
                      background: cfg.festival_enabled
                        ? `linear-gradient(135deg, ${cfg.festival_navbar_color}, #0F172A)`
                        : 'linear-gradient(135deg, #1E1B4B, #0F172A)',
                    }}
                  >
                    <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full">
                      <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                      Special Collection
                    </div>
                    <h3 className="text-sm font-black tracking-tight leading-tight">
                      {cfg.festival_name}
                    </h3>
                    <p className="text-[10px] text-white/80 leading-relaxed line-clamp-2">
                      {cfg.festival_popup_subtext}
                    </p>
                    <button
                      type="button"
                      className="px-3.5 py-1 rounded-xl text-[10px] font-black text-white shadow-sm"
                      style={{ backgroundColor: cfg.festival_popup_btn_color }}
                    >
                      Explore Deals
                    </button>
                  </div>

                  {/* Product Cards Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs space-y-1.5">
                      <div className="w-full h-16 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        Ethnic Saree
                      </div>
                      <p className="text-[10px] font-bold text-slate-800 truncate">Festive Silk Saree</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-900">₹1,499</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">30% OFF</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs space-y-1.5">
                      <div className="w-full h-16 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        Kids Kurta
                      </div>
                      <p className="text-[10px] font-bold text-slate-800 truncate">Festive Kurta Set</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-900">₹899</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">25% OFF</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Mobile Bottom Navigation Bar (matching Dundu mobile app tabs) */}
                <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-between text-slate-400 z-20">
                  <div className="flex flex-col items-center gap-0.5 text-purple-700">
                    <Home className="h-4 w-4" />
                    <span className="text-[8px] font-bold">Home</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Grid className="h-4 w-4" />
                    <span className="text-[8px] font-semibold">Categories</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Layers className="h-4 w-4" />
                    <span className="text-[8px] font-semibold">Combos</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="text-[8px] font-semibold">Bag</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <User className="h-4 w-4" />
                    <span className="text-[8px] font-semibold">Profile</span>
                  </div>
                </div>

                {/* 6. Exact FestivalPopupModal Overlay (matching mobile/src/components/ui/FestivalPopupModal.jsx) */}
                {previewMode === 'popup' && cfg.festival_popup_enabled && (
                  <div className="absolute inset-0 bg-black/75 z-40 flex items-center justify-center p-3 animate-fadeIn">
                    <div className="relative w-full rounded-2xl bg-white text-slate-900 shadow-2xl p-4 text-center overflow-hidden space-y-3">
                      {/* Top Decorative Ribbon */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ backgroundColor: cfg.festival_popup_btn_color }}
                      />

                      {/* Close Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewMode('home')}
                        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* Sparkle Icon */}
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mt-2 shadow-xs">
                        <Sparkles className="h-5 w-5" />
                      </div>

                      {/* Badge */}
                      {cfg.festival_popup_badge_text && (
                        <div className="inline-block">
                          <span
                            className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-xs"
                            style={{ backgroundColor: cfg.festival_popup_btn_color }}
                          >
                            {cfg.festival_popup_badge_text}
                          </span>
                        </div>
                      )}

                      {/* Heading & Subtext */}
                      <h4 className="text-xs font-black text-slate-900 leading-snug">
                        {cfg.festival_popup_heading}
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed px-1">
                        {cfg.festival_popup_subtext}
                      </p>

                      {/* Coupon Box with Copy Hint */}
                      {cfg.festival_popup_coupon && (
                        <div
                          onClick={() => handleCopyCode(cfg.festival_popup_coupon)}
                          className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 cursor-pointer hover:bg-emerald-100/70 transition-colors"
                        >
                          <p className="font-mono text-xs font-black text-emerald-950 tracking-wider">
                            {cfg.festival_popup_coupon}
                          </p>
                          <span className="text-[9px] font-bold text-emerald-700">
                            {copiedCoupon ? 'Copied! ✓' : 'Tap to copy'}
                          </span>
                        </div>
                      )}

                      {/* CTA Button */}
                      <button
                        type="button"
                        className="w-full py-2 px-3 rounded-xl text-white font-black text-xs shadow-md"
                        style={{ backgroundColor: cfg.festival_popup_btn_color }}
                      >
                        {cfg.festival_popup_btn_text || 'Shop Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="w-24 h-1 bg-slate-800 rounded-full mx-auto my-1.5" />
            </div>

            {/* Quick helper note */}
            <div className="w-full bg-purple-50 rounded-2xl p-3 border border-purple-100 flex items-center justify-between text-xs text-purple-900 font-semibold">
              <span>Preview Mode: {previewMode === 'home' ? 'App Storefront' : 'Modal Popup Offer'}</span>
              <button
                type="button"
                onClick={() => setPreviewMode(previewMode === 'home' ? 'popup' : 'home')}
                className="text-purple-700 underline font-bold cursor-pointer"
              >
                Switch to {previewMode === 'home' ? 'Popup' : 'Home'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
