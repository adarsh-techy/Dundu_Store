import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Megaphone,
  Timer,
  Bell,
  BellOff,
  Clock,
  Sparkles,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Layers,
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
  bg_color: '#0f172a',
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
  { label: 'Slate Navy', bg: '#0f172a', text: '#ffffff' },
  { label: 'Indigo', bg: '#4338ca', text: '#ffffff' },
  { label: 'Emerald', bg: '#065f46', text: '#ffffff' },
  { label: 'Crimson', bg: '#991b1b', text: '#ffffff' },
  { label: 'Amber', bg: '#b45309', text: '#ffffff' },
  { label: 'Royal Violet', bg: '#581c87', text: '#ffffff' },
];

const TEXT_SUGGESTIONS = [
  'Buy 1 Get 1 Free on selected Sarees — Limited period offer!',
  'Free express delivery on all orders above ₹499!',
  'New Festive Drop just released — Explore fresh styles now!',
  'Flat 30% OFF across top collection. Use code DUNDU30',
  'Exclusive maternity and newborn collection now live in-store!',
  'Festival mega sale — Flat discounts and bonus loyalty points!',
  'Extra 10% instant discount on prepaid UPI payments at checkout.',
  'Flash promotion ends tonight at midnight — Grab your favourites!',
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

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: announcementApi.list,
  });
  const announcements = data?.data?.announcements || [];

  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.get,
  });
  const currentInterval = settingsData?.data?.settings?.popup_interval_minutes ?? '10';
  const intervalDirty = intervalVal !== '' && anyChanged([intervalVal, currentInterval]);

  useEffect(() => {
    if (currentInterval && !intervalVal) setIntervalVal(String(currentInterval));
  }, [currentInterval]);

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
      qc.invalidateQueries(['admin-announcements']);
    } catch {
      toast.error('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (a) => {
    try {
      await announcementApi.toggle(a.id);
      qc.invalidateQueries(['admin-announcements']);
      toast.success(a.is_active ? 'Announcement paused' : 'Announcement activated');
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleTogglePopup = async (a) => {
    try {
      await announcementApi.togglePopup(a.id);
      qc.invalidateQueries(['admin-announcements']);
      toast.success(a.show_popup ? 'Popup disabled' : 'Popup enabled for customer app');
    } catch {
      toast.error('Failed to toggle popup');
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm('Delete this announcement? This action cannot be reversed.')) return;
    try {
      await announcementApi.remove(a.id);
      qc.invalidateQueries(['admin-announcements']);
      toast.success('Announcement deleted');
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
  const activeCount = announcements.filter((a) => a.is_active).length;
  const popupCount = announcements.filter((a) => a.show_popup).length;
  const scheduledCount = announcements.filter((a) => a.scheduled_time).length;

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Megaphone className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Announcements & Top Header Ticker
                </h1>
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                  {announcements.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Broadcast promotional notifications, flash sale alerts, and customer popup banners across platforms
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            title="Refresh announcements"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Announcement
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Tickers</p>
            <p className="text-xl font-bold text-slate-900">{announcements.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Live</p>
            <p className="text-xl font-bold text-slate-900">
              {activeCount} <span className="text-xs font-normal text-slate-400">tickers</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Popup Alerts</p>
            <p className="text-xl font-bold text-slate-900">{popupCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Popup Interval</p>
            <p className="text-xl font-bold text-slate-900">
              {currentInterval} <span className="text-xs font-normal text-slate-400">min</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Popup Interval Frequency Governance Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Customer Popup Frequency Trigger</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Defines how many minutes must elapse before promotional popup modals reappear to browsing shoppers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={intervalVal}
              onChange={(e) => setIntervalVal(e.target.value)}
              className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-slate-50/50 text-slate-800 font-semibold text-center"
              placeholder="10"
            />
            <span className="text-xs font-semibold text-slate-500">minutes</span>
          </div>

          {intervalDirty && (
            <Button
              size="sm"
              onClick={saveInterval}
              loading={savingInterval}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4"
            >
              Save Interval
            </Button>
          )}
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcement message…"
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
            <option value="all">All Announcements</option>
            <option value="active">Active Only</option>
            <option value="inactive">Paused Only</option>
            <option value="popup">Popup Alerts Only</option>
          </select>

          <div className="text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-2 rounded-xl">
            {filteredAnnouncements.length} of {announcements.length}
          </div>
        </div>
      </div>

      {/* ── Announcements Cards Ledger ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-400 font-medium">Loading store announcements...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-800">No announcements found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {search || statusFilter !== 'all'
              ? 'No announcements match your current filter selection.'
              : 'Add your first promotional announcement ticker to inform customers of active promotions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAnnouncements.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              {/* Preview Bar */}
              <div
                className="px-6 py-3 text-sm font-semibold text-center tracking-wide shadow-inner flex items-center justify-center gap-2"
                style={{ backgroundColor: a.bg_color, color: a.text_color }}
              >
                <span>{a.text}</span>
              </div>

              {/* Actions & Metadata Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      a.is_active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        a.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {a.is_active ? 'Active on Ticker' : 'Paused'}
                  </span>

                  {a.show_popup && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
                      <Bell className="h-3 w-3" /> Popup Enabled
                    </span>
                  )}

                  {a.scheduled_time && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-amber-600" /> Active from {fmt12(a.scheduled_time)}
                    </span>
                  )}

                  <span className="text-xs font-semibold text-slate-400 ml-1">
                    Priority #{a.sort_order}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Toggle Popup Button */}
                  <button
                    onClick={() => handleTogglePopup(a)}
                    title={a.show_popup ? 'Disable popup broadcast' : 'Enable customer popup broadcast'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      a.show_popup
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'text-slate-600 border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    {a.show_popup ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    <span>{a.show_popup ? 'Popup On' : 'Popup Off'}</span>
                  </button>

                  {/* Toggle Active Button */}
                  <button
                    onClick={() => handleToggle(a)}
                    title={a.is_active ? 'Pause ticker' : 'Activate ticker'}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      a.is_active
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100'
                        : 'text-slate-400 border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    {a.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => openEdit(a)}
                    title="Edit announcement"
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(a)}
                    title="Delete announcement"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <Modal
          size="lg"
          title={editing ? 'Edit Store Announcement' : 'Create Store Announcement'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Suggestions */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                Quick Preset Copy Suggestions
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {TEXT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, text: s }))}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border transition-colors truncate max-w-[240px] cursor-pointer ${
                      form.text === s
                        ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:border-slate-300 hover:text-slate-900'
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
                rows={2}
                placeholder="e.g. Free express delivery on all orders above ₹499! Shop our new collection now."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white resize-none text-slate-800"
                required
              />
            </div>

            {/* Color Palette Presets */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                Color Palette Theme
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, bg_color: p.bg, text_color: p.text }))}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: p.bg,
                      color: p.text,
                      borderColor: form.bg_color === p.bg ? '#4f46e5' : 'transparent',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
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
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
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

            {/* Live Banner Preview */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                Real-Time Ticker Preview
              </label>
              <div
                className="rounded-xl overflow-hidden py-3 px-4 text-sm font-semibold text-center shadow-xs"
                style={{ backgroundColor: form.bg_color, color: form.text_color }}
              >
                {form.text || 'Your announcement message will display here...'}
              </div>
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                Schedule Activation Window{' '}
                <span className="text-slate-400 normal-case font-normal">(Optional — activate only after this time)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={form.scheduled_time}
                  onChange={set('scheduled_time')}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white"
                />
                {form.scheduled_time && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
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
              label="Carousel Priority Order (Lower = Shown First)"
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
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5"
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
