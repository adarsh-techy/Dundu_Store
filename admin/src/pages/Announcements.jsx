import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, Megaphone, Timer, Bell, BellOff } from 'lucide-react';
import { announcementApi, settingsApi } from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { anyChanged } from '../utils/dirty';
import toast from 'react-hot-toast';

const EMPTY = { text: '', bg_color: '#e91e8c', text_color: '#ffffff', sort_order: 0, scheduled_time: '' };

function fmt12(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const PRESETS = [
  { label: 'Pink', bg: '#e91e8c', text: '#ffffff' },
  { label: 'Black', bg: '#111111', text: '#ffffff' },
  { label: 'Gold', bg: '#b8860b', text: '#ffffff' },
  { label: 'Green', bg: '#16a34a', text: '#ffffff' },
  { label: 'Purple', bg: '#7c3aed', text: '#ffffff' },
  { label: 'Red', bg: '#dc2626', text: '#ffffff' },
];

const TEXT_SUGGESTIONS = [
  '🎁 Buy 1 Get 1 Free on all Sarees! Limited time only.',
  '🚚 Free shipping on orders above ₹999!',
  '✨ New arrivals just dropped — Shop now!',
  '🔥 Flat 30% OFF on selected styles. Use code DUNDU30',
  '👗 Exclusive maternity & newborn collection now live!',
  '🎀 Festival special offers — Up to 50% off!',
  '💳 Extra 10% off on online payments. Shop now!',
  '⏰ Flash sale ends tonight — Grab your picks!',
  '🌸 Summer collection is here — Fresh styles await!',
  '🎉 Grand sale — Prices starting at ₹299!',
];

export default function Announcements() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [intervalVal, setIntervalVal] = useState('');
  const [savingInterval, setSavingInterval] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const { data, isLoading } = useQuery({ queryKey: ['admin-announcements'], queryFn: announcementApi.list });
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
    const val = parseInt(intervalVal);
    if (!val || val < 1) return toast.error('Enter a valid number of minutes (min 1)');
    setSavingInterval(true);
    try {
      await settingsApi.update({ popup_interval_minutes: val });
      qc.invalidateQueries(['admin-settings']);
      toast.success('Popup interval saved');
    } catch { toast.error('Failed to save'); }
    finally { setSavingInterval(false); }
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (a) => { setEditing(a); setForm({ text: a.text, bg_color: a.bg_color, text_color: a.text_color, sort_order: a.sort_order, scheduled_time: a.scheduled_time || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return toast.error('Text is required');
    setLoading(true);
    try {
      if (editing) {
        await announcementApi.update(editing.id, form);
        toast.success('Updated');
      } else {
        await announcementApi.create(form);
        toast.success('Announcement created');
      }
      setShowModal(false);
      qc.invalidateQueries(['admin-announcements']);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (a) => {
    try {
      await announcementApi.toggle(a.id);
      qc.invalidateQueries(['admin-announcements']);
    } catch { toast.error('Failed'); }
  };

  const handleTogglePopup = async (a) => {
    try {
      await announcementApi.togglePopup(a.id);
      qc.invalidateQueries(['admin-announcements']);
      toast.success(a.show_popup ? 'Popup disabled' : 'Popup enabled — will show to customers!');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (a) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementApi.remove(a.id);
      qc.invalidateQueries(['admin-announcements']);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-400 mt-0.5">Promotional strips shown to customers (Buy 1 Get 1, gifts, etc.)</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add</Button>
      </div>

      {/* Popup interval setting */}
      <div className="bg-pink-50 rounded-2xl border border-pink-300 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800">Popup Interval</h2>
          <span className="text-xs text-gray-400 ml-1">— how often the offer popup appears to customers</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={intervalVal}
            onChange={(e) => setIntervalVal(e.target.value)}
            className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            placeholder="10"
          />
          <span className="text-sm text-gray-500">minutes</span>
          {intervalDirty && (
            <Button size="sm" onClick={saveInterval} loading={savingInterval}>Save</Button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">Current: every <strong>{currentInterval}</strong> min. Set to 0 to disable.</p>
      </div>

      {isLoading ? <Spinner /> : announcements.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Preview bar */}
              <div className="px-5 py-3 text-sm font-semibold text-center tracking-wide"
                style={{ backgroundColor: a.bg_color, color: a.text_color }}>
                {a.text}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {a.is_active ? 'Active' : 'Inactive'}
                </span>
                {a.show_popup && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Bell className="h-3 w-3" /> Popup On
                  </span>
                )}
                {a.scheduled_time && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Timer className="h-3 w-3" /> {fmt12(a.scheduled_time)}
                  </span>
                )}
                <span className="text-xs text-gray-400">Order #{a.sort_order}</span>
                <div className="ml-auto flex items-center gap-2">
                  {/* Popup toggle button */}
                  <button
                    onClick={() => handleTogglePopup(a)}
                    title={a.show_popup ? 'Disable popup' : 'Show as popup to customers'}
                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
                      a.show_popup
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'text-gray-400 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                  >
                    {a.show_popup ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    <span className="hidden sm:inline">{a.show_popup ? 'Popup On' : 'Show Popup'}</span>
                  </button>
                  <button onClick={() => handleToggle(a)} title={a.is_active ? 'Deactivate' : 'Activate'}
                    className={`p-1.5 rounded-lg transition-colors ${a.is_active ? 'text-green-600 hover:bg-red-50 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}>
                    {a.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(a)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Announcement' : 'New Announcement'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1.5">Announcement Text</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TEXT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, text: s }))}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors truncate max-w-[220px] ${
                      form.text === s
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
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
                placeholder="e.g. 🎁 Buy 1 Get 1 Free on all Sarees! Limited time only."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                required
              />
            </div>

            {/* Color presets */}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">Color Theme</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button"
                    onClick={() => setForm((f) => ({ ...f, bg_color: p.bg, text_color: p.text }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                    style={{
                      backgroundColor: p.bg, color: p.text,
                      borderColor: form.bg_color === p.bg ? '#6366f1' : 'transparent',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Background</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.bg_color} onChange={set('bg_color')}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                    <input type="text" value={form.bg_color} onChange={set('bg_color')}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Text</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.text_color} onChange={set('text_color')}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                    <input type="text" value={form.text_color} onChange={set('text_color')}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1.5">Preview</label>
              <div className="rounded-xl overflow-hidden py-2.5 px-4 text-sm font-semibold text-center"
                style={{ backgroundColor: form.bg_color, color: form.text_color }}>
                {form.text || 'Your announcement text here...'}
              </div>
            </div>

            {/* Schedule time */}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1.5">
                Schedule Time <span className="text-gray-400 normal-case font-normal">(optional — show only after this time each day)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={form.scheduled_time}
                  onChange={set('scheduled_time')}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                {form.scheduled_time && (
                  <span className="text-sm font-semibold text-amber-600">
                    Shows from {fmt12(form.scheduled_time)} onwards
                  </span>
                )}
                {form.scheduled_time && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, scheduled_time: '' }))}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>

            <Input label="Sort Order (lower = first)" type="number" value={form.sort_order} onChange={set('sort_order')} />

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>{editing ? 'Save' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
