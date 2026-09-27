import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Megaphone, Timer,
  Bell, BellOff, Clock, Search, X, RefreshCw,
  CheckCircle2, Smartphone, Save, Radio
} from 'lucide-react';
import { announcementApi, settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

const EMPTY = {
  text: '',
  bg_color: '#E91E8C',
  text_color: '#ffffff',
  sort_order: 0,
  scheduled_time: '',
};

function fmt12(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const PRESETS = [
  { label: 'Dundu Pink', bg: '#E91E8C', text: '#ffffff' },
  { label: 'Royal Violet', bg: '#581c87', text: '#ffffff' },
  { label: 'Indigo', bg: '#4338ca', text: '#ffffff' },
  { label: 'Emerald', bg: '#065f46', text: '#ffffff' },
  { label: 'Crimson', bg: '#991b1b', text: '#ffffff' },
  { label: 'Amber', bg: '#b45309', text: '#ffffff' },
  { label: 'Slate Navy', bg: '#0f172a', text: '#ffffff' },
];

const TEXT_SUGGESTIONS = [
  '🎉 Buy 1 Get 1 Free on selected collections — Limited period!',
  '⚡ Free Express Delivery on all orders above ₹499!',
  '✨ New Festive Season Drop just released — Explore fresh styles!',
  '🎁 Flat 30% OFF across top collection. Use code DUNDU30',
  '👗 Exclusive Maternity & Newborn collection now live in-store!',
  '🌟 Extra 10% instant discount on prepaid UPI payments at checkout.',
];

export default function Announcements() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [intervalVal, setIntervalVal] = useState('');
  const [savingInterval, setSavingInterval] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewMode, setPreviewMode] = useState('ticker'); // 'ticker' | 'popup'
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState(null);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // Query Announcements
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: announcementApi.list,
  });
  const announcements = data?.data?.announcements || [];

  // Query Settings for Popup Interval
  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.get,
  });
  const currentInterval = settingsData?.data?.settings?.popup_interval_minutes ?? '10';
  const intervalDirty = intervalVal !== '' && anyChanged([intervalVal, currentInterval]);

  useEffect(() => {
    if (currentInterval && !intervalVal) setIntervalVal(String(currentInterval));
  }, [currentInterval]);

  // Set default selected announcement for preview
  useEffect(() => {
    if (announcements.length > 0 && !selectedAnnouncementId) {
      const activeOne = announcements.find((a) => a.is_active) || announcements[0];
      setSelectedAnnouncementId(activeOne.id);
    }
  }, [announcements, selectedAnnouncementId]);

  // Save Interval
  const saveInterval = async () => {
    const val = parseInt(intervalVal, 10);
    if (isNaN(val) || val < 0) return toast.error('Enter a valid interval in minutes (0 to disable)');
    setSavingInterval(true);
    try {
      await settingsApi.update({ popup_interval_minutes: val });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Popup display interval saved successfully');
    } catch {
      toast.error('Failed to save popup interval');
    } finally {
      setSavingInterval(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, sort_order: announcements.length + 1 });
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      text: a.text,
      bg_color: a.bg_color,
      text_color: a.text_color,
      sort_order: a.sort_order,
      scheduled_time: a.scheduled_time || '',
    });
    setSelectedAnnouncementId(a.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return toast.error('Announcement message text is required');
    setLoading(true);
    try {
      if (editing) {
        await announcementApi.update(editing.id, form);
        toast.success('Announcement updated successfully');
      } else {
        await announcementApi.create(form);
        toast.success('Announcement created successfully');
      }
      setShowModal(false);
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
    } catch {
      toast.error('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Single Active Announcement
  const handleToggleActive = async (a) => {
    try {
      await announcementApi.toggle(a.id);
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      setSelectedAnnouncementId(a.id);
      toast.success(
        a.is_active
          ? 'Announcement paused — no active ticker on app'
          : `Activated "${a.text.slice(0, 30)}..." as the single active ticker`
      );
    } catch {
      toast.error('Failed to update announcement status');
    }
  };

  const handleTogglePopup = async (a) => {
    try {
      await announcementApi.togglePopup(a.id);
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success(a.show_popup ? 'Popup modal disabled' : 'Popup modal enabled on mobile app');
    } catch {
      toast.error('Failed to toggle popup');
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm('Delete this announcement? This action cannot be reversed.')) return;
    try {
      await announcementApi.remove(a.id);
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Announcement deleted');
      if (selectedAnnouncementId === a.id) setSelectedAnnouncementId(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const q = search.trim().toLowerCase();
      if (q && !a.text.toLowerCase().includes(q)) return false;
      if (statusFilter === 'active' && !a.is_active) return false;
      if (statusFilter === 'inactive' && a.is_active) return false;
      if (statusFilter === 'popup' && !a.show_popup) return false;
      return true;
    });
  }, [announcements, search, statusFilter]);

  // Aggregate metrics
  const activeAnnouncement = useMemo(() => announcements.find((a) => a.is_active), [announcements]);
  const activeCount = activeAnnouncement ? 1 : 0;
  const popupAnnouncement = useMemo(() => announcements.find((a) => a.show_popup), [announcements]);
  const popupCount = popupAnnouncement ? 1 : 0;

  // Active item for preview
  const previewAnnouncement = useMemo(() => {
    if (showModal && form.text) {
      return {
        id: 'draft',
        text: form.text,
        bg_color: form.bg_color,
        text_color: form.text_color,
        is_active: true,
        show_popup: true,
      };
    }
    // Prioritize currently active announcement, then selected, then first
    return (
      activeAnnouncement ||
      announcements.find((a) => a.id === selectedAnnouncementId) ||
      announcements[0] || {
        text: 'Free express delivery on all orders above ₹499! Shop our festive collection now.',
        bg_color: '#E91E8C',
        text_color: '#ffffff',
      }
    );
  }, [announcements, selectedAnnouncementId, showModal, form, activeAnnouncement]);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Inline CSS for Continuous Mobile Marquee Ticker ── */}
      <style>{`
        @keyframes dunduMobileTicker {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-dundu-ticker {
          display: flex;
          width: max-content;
          animation: dunduMobileTicker 14s linear infinite;
        }
        .animate-dundu-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ─── 1. Clean Executive Header ────────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Megaphone className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Announcements & Top Header Ticker
              </h1>
              <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                {announcements.length} Total
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeCount === 1 ? '1 Live Active Ticker' : '0 Active (Paused)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Only 1 announcement is active on the mobile app header at any time. Activating one replaces any previously active ticker.
            </p>
          </div>
        </div>

        {/* Top Actions: Refresh + Save + Add Announcement */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
          <button
            onClick={() => {
              refetch();
              toast.success('Announcements refreshed');
            }}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh announcements"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {intervalDirty && (
            <button
              onClick={saveInterval}
              disabled={savingInterval}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              {savingInterval ? 'Saving...' : 'Save Interval'}
            </button>
          )}

          <Button
            size="sm"
            onClick={openCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs rounded-xl px-4 py-2 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Announcement
          </Button>
        </div>
      </div>

      {/* ─── 2. Clean Executive KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Tickers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{announcements.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Stored messages</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Megaphone className="h-5 w-5" />
          </div>
        </div>

        {/* Active Live */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Ticker</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {activeCount} <span className="text-xs font-normal text-slate-400">/ 1 max</span>
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {activeCount === 1 ? '1 active on mobile header' : 'No ticker active'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Popup Modals */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Popup Modal</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{popupCount}</p>
            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
              {popupCount === 1 ? 'Modal enabled on app open' : 'No popup active'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5" />
          </div>
        </div>

        {/* Popup Frequency */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Popup Frequency</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {currentInterval} <span className="text-sm font-semibold text-slate-400">mins</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cooldown between popups</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <Timer className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ─── 3. Two-Column Layout: Controls & Single-Active List (Left) + Exact Mobile App Preview (Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Simplified Studio Controls & Announcement Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Frequency Interval Setting Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 flex items-center justify-center shrink-0">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer Popup Repeat Interval
                </h3>
                <p className="text-xs text-slate-500">
                  Defines how many minutes must elapse before the welcome modal reappears to the same customer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <input
                  type="number"
                  min={0}
                  value={intervalVal}
                  onChange={(e) => setIntervalVal(e.target.value)}
                  className="w-14 text-sm font-black text-slate-900 text-center bg-transparent focus:outline-none"
                  placeholder="10"
                />
                <span className="text-xs font-bold text-slate-500">mins</span>
              </div>
              {intervalDirty && (
                <button
                  type="button"
                  onClick={saveInterval}
                  disabled={savingInterval}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {savingInterval ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search announcement copy…"
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

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs self-stretch sm:self-auto overflow-x-auto">
              {[
                { id: 'all', label: `All (${announcements.length})` },
                { id: 'active', label: `Active (${activeCount})` },
                { id: 'popup', label: `Popups (${popupCount})` },
                { id: 'inactive', label: 'Paused' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Single-Active Announcement Notice */}
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
            <span>
              ℹ️ <strong>Rule:</strong> Only 1 announcement active at a time. Selecting an announcement sets it as the live ticker.
            </span>
            <span className="font-semibold text-emerald-700">
              {activeAnnouncement ? '1 Currently Live' : 'None Active'}
            </span>
          </div>

          {/* Announcements Ledger */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center">
              <Spinner size="lg" />
              <p className="mt-3 text-xs text-slate-400 font-medium">Loading store announcements...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Megaphone className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-slate-800">No announcements found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {search || statusFilter !== 'all'
                  ? 'No announcements match your filter selection.'
                  : 'Click "Add Announcement" above to configure your promotional announcement.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnnouncements.map((a) => {
                const isSelectedForPreview = selectedAnnouncementId === a.id;
                const isActive = a.is_active;

                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAnnouncementId(a.id)}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden cursor-pointer ${
                      isActive
                        ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                        : isSelectedForPreview
                        ? 'border-slate-400 ring-1 ring-slate-400/30 shadow-2xs'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Visual Color Ticker Bar Preview */}
                    <div
                      className="px-4 py-2.5 text-xs font-bold text-center tracking-wide flex items-center justify-between"
                      style={{ backgroundColor: a.bg_color, color: a.text_color }}
                    >
                      <span className="truncate flex-1 text-left">{a.text}</span>
                      {isActive && (
                        <span className="text-[10px] uppercase font-black bg-white/30 backdrop-blur-xs px-2.5 py-0.5 rounded-full shrink-0 ml-2">
                          Live On Mobile App
                        </span>
                      )}
                    </div>

                    {/* Controls Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white">
                      {/* Left: Radio / Single-Active Ticker Switch */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 1-At-A-Time Active Ticker Radio Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(a);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <span>{isActive ? 'Active Ticker (Live)' : 'Set as Active Ticker'}</span>
                        </button>

                        {/* Popup Modal Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePopup(a);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            a.show_popup
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                              : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                          }`}
                        >
                          {a.show_popup ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                          <span>{a.show_popup ? 'Popup On' : 'Popup Off'}</span>
                        </button>

                        {/* Schedule Time Badge */}
                        {a.scheduled_time && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> From {fmt12(a.scheduled_time)}
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(a);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Edit announcement"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(a);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
            {/* Preview View Mode Switcher */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Mobile View Preview
                </span>
              </div>

              {/* View Mode Switcher: Ticker vs Popup */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewMode('ticker')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    previewMode === 'ticker'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Header Ticker
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('popup')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    previewMode === 'popup'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Welcome Popup
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

              {/* 5. Scrollable Screen Content (Contains AnnouncementBar + Banners + Products) */}
              <div className="flex-1 bg-white overflow-y-auto relative scrollbar-hide">
                {/* ── EXACT ANNOUNCEMENT BAR (Height: 32px, Marquee Animation) ── */}
                {previewAnnouncement && (
                  <div
                    className="h-8 overflow-hidden flex items-center shadow-xs shrink-0 relative z-10"
                    style={{
                      backgroundColor: previewAnnouncement.bg_color || '#E91E8C',
                    }}
                  >
                    <div
                      className="animate-dundu-ticker whitespace-nowrap text-xs font-bold tracking-wide select-none"
                      style={{ color: previewAnnouncement.text_color || '#ffffff' }}
                    >
                      <span className="px-4">{previewAnnouncement.text}</span>
                      <span className="px-4">•</span>
                      <span className="px-4">{previewAnnouncement.text}</span>
                      <span className="px-4">•</span>
                      <span className="px-4">{previewAnnouncement.text}</span>
                    </div>
                  </div>
                )}

                {/* Banner Carousel (HomeScreen.jsx lines 455-473) */}
                <div className="w-full h-[165px] bg-[#2A1A2E] relative overflow-hidden flex flex-col justify-between p-4 text-white">
                  {/* Banner Badge */}
                  <span className="self-end bg-[#E91E8C] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                    FLAT 40% OFF
                  </span>
                  <div>
                    <h4 className="text-base font-black tracking-tight leading-tight">
                      Festive Mega Collection
                    </h4>
                    <p className="text-xs text-white/80 mt-0.5">
                      Explore handpicked festive styles for family
                    </p>
                  </div>
                  {/* Carousel Dots */}
                  <div className="flex items-center justify-center gap-1.5 self-center">
                    <div className="w-4 h-1.5 rounded-full bg-[#E91E8C]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                  </div>
                </div>

                {/* New Arrivals Section */}
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

                {/* ── EXACT WELCOME POPUP MODAL (WelcomePopup.jsx) ── */}
                {previewMode === 'popup' && (
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-2xs flex items-center justify-center p-5 z-40 animate-in fade-in duration-200">
                    <div
                      className="w-full rounded-[24px] p-6 shadow-2xl relative text-center animate-in zoom-in-95 duration-200"
                      style={{
                        backgroundColor: previewAnnouncement?.bg_color || '#E91E8C',
                        color: previewAnnouncement?.text_color || '#ffffff',
                      }}
                    >
                      {/* Close ✕ Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewMode('ticker')}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-bold cursor-pointer"
                        style={{ color: previewAnnouncement?.text_color || '#ffffff' }}
                      >
                        ✕
                      </button>

                      {/* Brand Title */}
                      <p
                        className="text-[11px] font-black tracking-[4px] uppercase opacity-75 mb-2"
                        style={{ color: previewAnnouncement?.text_color || '#ffffff' }}
                      >
                        DUNDU
                      </p>

                      {/* Announcement Text */}
                      <h3
                        className="text-lg font-black leading-snug px-1"
                        style={{ color: previewAnnouncement?.text_color || '#ffffff' }}
                      >
                        {previewAnnouncement?.text}
                      </h3>

                      {/* Button Row */}
                      <div className="mt-5 space-y-2">
                        <button
                          type="button"
                          className="w-full py-2.5 rounded-full font-black text-xs shadow-md transition-all active:scale-95"
                          style={{
                            backgroundColor: previewAnnouncement?.text_color || '#ffffff',
                            color: previewAnnouncement?.bg_color || '#E91E8C',
                          }}
                        >
                          Shop Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('ticker')}
                          className="w-full py-2 rounded-full font-semibold text-xs border-2 opacity-85 transition-all"
                          style={{
                            borderColor: previewAnnouncement?.text_color || '#ffffff',
                            color: previewAnnouncement?.text_color || '#ffffff',
                          }}
                        >
                          Maybe Later
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

              {/* 7. iOS Home Indicator Bar */}
              <div className="bg-[#0F0F0F] pb-1.5 pt-0.5 text-center shrink-0 z-20">
                <div className="w-28 h-1 bg-white/30 rounded-full mx-auto"></div>
              </div>
            </div>

            {/* Note below preview */}
            <p className="text-[11px] text-slate-400 text-center max-w-xs">
              Live mobile rendering reflects exact header height (52px), search bar (#000), 32px continuous marquee ticker, and home tabs.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 4. Simplified Add / Edit Announcement Modal ───────────────────── */}
      {showModal && (
        <Modal
          size="lg"
          title={editing ? 'Edit Announcement & Ticker' : 'Create New Announcement'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Copy Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Quick 1-Click Copy Suggestions
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TEXT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, text: s }))}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all truncate max-w-[240px] cursor-pointer ${
                      form.text === s
                        ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                    title={s}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <textarea
                value={form.text}
                onChange={set('text')}
                rows={3}
                placeholder="e.g. Free express delivery on all orders above ₹499! Shop our new festive collection now."
                className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 bg-slate-50/50 focus:bg-white resize-none font-medium leading-relaxed"
                required
              />
            </div>

            {/* Color Palette Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Brand Color Palette
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, bg_color: p.bg, text_color: p.text }))}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer shadow-2xs"
                    style={{
                      backgroundColor: p.bg,
                      color: p.text,
                      borderColor: form.bg_color === p.bg ? '#000000' : 'transparent',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.bg_color}
                      onChange={set('bg_color')}
                      className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={form.bg_color}
                      onChange={set('bg_color')}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.text_color}
                      onChange={set('text_color')}
                      className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={form.text_color}
                      onChange={set('text_color')}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Ticker Bar Swatch */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Real-Time Ticker Swatch
              </label>
              <div
                className="rounded-xl overflow-hidden py-2.5 px-4 text-xs font-bold text-center shadow-xs"
                style={{ backgroundColor: form.bg_color, color: form.text_color }}
              >
                {form.text || 'Your announcement message will display here...'}
              </div>
            </div>

            {/* Scheduled Time Window */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Daily Scheduled Time{' '}
                <span className="text-slate-400 normal-case font-normal">(Optional — activate only after this time)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={form.scheduled_time}
                  onChange={set('scheduled_time')}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-900 bg-white"
                />
                {form.scheduled_time && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    Live daily from {fmt12(form.scheduled_time)} onwards
                  </span>
                )}
                {form.scheduled_time && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scheduled_time: '' }))}
                    className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Clear Time
                  </button>
                )}
              </div>
            </div>

            <Input
              label="Carousel Priority Order (Lower number = Shown first)"
              type="number"
              value={form.sort_order}
              onChange={set('sort_order')}
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl px-4">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-5 cursor-pointer"
              >
                {editing ? 'Save Changes' : 'Create Announcement'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
