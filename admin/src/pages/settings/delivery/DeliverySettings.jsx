import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

export default function DeliverySettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = data?.data?.settings || {};

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    delivery_charge: '', free_delivery_threshold: '',
    delivery_estimate_min_days: '', delivery_estimate_max_days: '',
  });
  const [hydrated, setHydrated] = useState(false);

  if (!isLoading && !hydrated && data) {
    setForm({
      delivery_charge: settings.delivery_charge ?? '50',
      free_delivery_threshold: settings.free_delivery_threshold ?? '500',
      delivery_estimate_min_days: settings.delivery_estimate_min_days ?? '3',
      delivery_estimate_max_days: settings.delivery_estimate_max_days ?? '7',
    });
    setHydrated(true);
  }

  const dirty = anyChanged(
    [form.delivery_charge, settings.delivery_charge ?? '50'],
    [form.free_delivery_threshold, settings.free_delivery_threshold ?? '500'],
    [form.delivery_estimate_min_days, settings.delivery_estimate_min_days ?? '3'],
    [form.delivery_estimate_max_days, settings.delivery_estimate_max_days ?? '7']
  );

  async function handleSave() {
    if (Number(form.delivery_estimate_max_days) < Number(form.delivery_estimate_min_days)) {
      toast.error('Max delivery days cannot be less than min delivery days');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.update({
        delivery_charge: form.delivery_charge,
        free_delivery_threshold: form.free_delivery_threshold,
        delivery_estimate_min_days: form.delivery_estimate_min_days,
        delivery_estimate_max_days: form.delivery_estimate_max_days,
      });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Delivery settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const charge = Number(form.delivery_charge) || 50;
  const threshold = Number(form.free_delivery_threshold) || 500;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-indigo-500" />
          Delivery Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Set delivery charges and the free delivery order threshold.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Input
              label="Delivery Charge (₹)"
              type="number"
              min={0}
              value={form.delivery_charge}
              onChange={(e) => setForm((p) => ({ ...p, delivery_charge: e.target.value }))}
              placeholder="50"
            />
            <p className="text-xs text-gray-400">Charged when order is below the free delivery threshold</p>
          </div>
          <div className="space-y-1.5">
            <Input
              label="Free Delivery Above (₹)"
              type="number"
              min={0}
              value={form.free_delivery_threshold}
              onChange={(e) => setForm((p) => ({ ...p, free_delivery_threshold: e.target.value }))}
              placeholder="500"
            />
            <p className="text-xs text-gray-400">Orders at or above this amount get free delivery</p>
          </div>
        </div>

        {/* Live preview banner */}
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-700 font-medium space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 mb-2">📦 Current Delivery Rule</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Orders below <strong>₹{threshold}</strong> → charged <strong>₹{charge}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Orders ₹{threshold}+ → <strong className="text-green-700">FREE delivery</strong>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Delivery Time Estimate</h2>
          <p className="text-xs text-gray-500 mb-4">
            Shown to customers at checkout and on order confirmation (web, mobile &amp; WhatsApp).
          </p>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Input
                label="Minimum Days"
                type="number"
                min={0}
                value={form.delivery_estimate_min_days}
                onChange={(e) => setForm((p) => ({ ...p, delivery_estimate_min_days: e.target.value }))}
                placeholder="3"
              />
            </div>
            <div className="space-y-1.5">
              <Input
                label="Maximum Days"
                type="number"
                min={0}
                value={form.delivery_estimate_max_days}
                onChange={(e) => setForm((p) => ({ ...p, delivery_estimate_max_days: e.target.value }))}
                placeholder="7"
              />
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
            🚚 Customers will see: "Estimated delivery in {form.delivery_estimate_min_days || 3}
            {Number(form.delivery_estimate_max_days) > Number(form.delivery_estimate_min_days) ? `-${form.delivery_estimate_max_days}` : ''} days"
          </div>
        </div>

        {dirty && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button size="sm" loading={saving} onClick={handleSave}>
              Save Delivery Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
