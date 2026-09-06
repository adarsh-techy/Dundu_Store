import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = data?.data?.settings || {};

  const [saving, setSaving] = useState(null);
  const [form, setForm] = useState({ offer_badge_color: '#e91e8c', offer_badge_text_color: '#ffffff' });
  const [hydrated, setHydrated] = useState(false);

  if (!isLoading && !hydrated && data) {
    setForm({
      offer_badge_color: settings.offer_badge_color || '#e91e8c',
      offer_badge_text_color: settings.offer_badge_text_color || '#ffffff',
    });
    setHydrated(true);
  }

  const offerBadgeColorsDirty = anyChanged(
    [form.offer_badge_color, settings.offer_badge_color || '#e91e8c'],
    [form.offer_badge_text_color, settings.offer_badge_text_color || '#ffffff']
  );

  async function handleSaveOfferBadgeColor() {
    setSaving('offer-badge-color');
    try {
      await settingsApi.update({
        offer_badge_color: form.offer_badge_color,
        offer_badge_text_color: form.offer_badge_text_color,
      });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Offer badge colors saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Quick links to sub-settings */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/payment-methods', emoji: '💳', label: 'Payment Methods', desc: 'COD & coupon field', color: 'blue' },
          { to: '/delivery-settings', emoji: '🚚', label: 'Delivery', desc: 'Charges & thresholds', color: 'green' },
          { to: '/return-settings', emoji: '🔄', label: 'Returns', desc: 'Charges & abuse rules', color: 'red' },
        ].map(({ to, emoji, label, desc, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`text-left p-4 rounded-2xl border border-${color}-200 bg-${color}-50 hover:bg-${color}-100 transition-colors shadow-sm`}
          >
            <div className="text-2xl mb-2">{emoji}</div>
            <p className="font-bold text-sm text-gray-800">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* ── Offer Badge Colors ── */}
      <section className="bg-pink-50 rounded-2xl border border-pink-300 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-pink-600">Offer Badge Colors</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Background and text color of the "% OFF" badge shown on product cards on the web store and mobile app.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Background</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.offer_badge_color}
                onChange={(e) => setForm((p) => ({ ...p, offer_badge_color: e.target.value }))}
                className="h-11 w-11 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
              />
              <Input
                value={form.offer_badge_color}
                onChange={(e) => setForm((p) => ({ ...p, offer_badge_color: e.target.value }))}
                placeholder="#e91e8c"
                className="max-w-[140px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Text</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.offer_badge_text_color}
                onChange={(e) => setForm((p) => ({ ...p, offer_badge_text_color: e.target.value }))}
                className="h-11 w-11 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
              />
              <Input
                value={form.offer_badge_text_color}
                onChange={(e) => setForm((p) => ({ ...p, offer_badge_text_color: e.target.value }))}
                placeholder="#ffffff"
                className="max-w-[140px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Preview</label>
            <span
              className="inline-block text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: /^#[0-9a-fA-F]{6}$/.test(form.offer_badge_color) ? form.offer_badge_color : '#e91e8c',
                color: /^#[0-9a-fA-F]{6}$/.test(form.offer_badge_text_color) ? form.offer_badge_text_color : '#ffffff',
              }}
            >
              25% OFF
            </span>
          </div>
        </div>
        {offerBadgeColorsDirty && (
          <div className="flex justify-end mt-4">
            <Button
              size="sm"
              loading={saving === 'offer-badge-color'}
              disabled={!/^#[0-9a-fA-F]{6}$/.test(form.offer_badge_color) || !/^#[0-9a-fA-F]{6}$/.test(form.offer_badge_text_color)}
              onClick={handleSaveOfferBadgeColor}
            >
              Save Badge Colors
            </Button>
          </div>
        )}
      </section>

      {/* ── App Update shortcut ── */}
      <section
        className="bg-purple-50 rounded-2xl border border-purple-300 shadow-sm p-6 cursor-pointer hover:bg-purple-100 transition-colors"
        onClick={() => navigate('/app-update')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-purple-500" />
            <div>
              <h2 className="text-lg font-bold text-pink-600">App Update</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Notify users when a new version is available — manual push or automatic version check.
              </p>
            </div>
          </div>
          <span className="text-purple-400 text-lg">→</span>
        </div>
      </section>
    </div>
  );
}
