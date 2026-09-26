import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Coins, Clock, Sparkles, CheckCircle2,
  RefreshCw, Save, Check, Calendar, ArrowRight
} from 'lucide-react';
import { settingsApi } from '../../../api';
import StatCard from '../../../components/ui/StatCard';
import Spinner from '../../../components/ui/Spinner';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

export default function DeliverySettings() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.get,
  });
  const settings = data?.data?.settings || {};

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    delivery_charge: '',
    free_delivery_threshold: '',
    delivery_estimate_min_days: '',
    delivery_estimate_max_days: '',
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

  async function handleSave(e) {
    if (e?.preventDefault) e.preventDefault();
    if (Number(form.delivery_estimate_max_days) < Number(form.delivery_estimate_min_days)) {
      toast.error('Maximum delivery days cannot be less than minimum delivery days');
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
      toast.success('Delivery and shipping settings saved successfully');
    } catch {
      toast.error('Failed to save delivery settings');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-500">Loading delivery configuration...</p>
      </div>
    );
  }

  const charge = Number(form.delivery_charge) || 0;
  const threshold = Number(form.free_delivery_threshold) || 0;
  const minDays = form.delivery_estimate_min_days || '3';
  const maxDays = form.delivery_estimate_max_days || '7';

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Truck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Delivery & Shipping Configuration
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active on Checkout
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Set standard customer shipping charges, free shipping thresholds, and estimated transit days
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['admin-settings'] });
              toast.success('Settings refreshed');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            title="Refresh settings"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Executive KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Base Delivery Fee"
          value={`₹${charge}`}
          icon={Coins}
          color="indigo"
          sub="Charged on orders under threshold"
        />
        <StatCard
          title="Free Delivery Threshold"
          value={`₹${threshold}+`}
          icon={Truck}
          color="emerald"
          sub="Orders at or above get free delivery"
        />
        <StatCard
          title="Estimated Transit Time"
          value={`${minDays} - ${maxDays} Days`}
          icon={Clock}
          color="amber"
          sub="Customer-facing delivery ETA"
        />
        <StatCard
          title="Checkout Integration"
          value="Synchronized"
          icon={CheckCircle2}
          color="blue"
          sub="Live across Web & Mobile apps"
        />
      </div>

      {/* ── Main Settings Grid ──────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Delivery Charges & Free Shipping Threshold */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Shipping Fee & Free Delivery Threshold
                </h2>
                <p className="text-xs text-slate-500">Cart checkout freight fee calculation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Base Delivery Charge
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.delivery_charge}
                    onChange={(e) => setForm((p) => ({ ...p, delivery_charge: e.target.value }))}
                    placeholder="50"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Applied when order total is below threshold</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Free Shipping Minimum
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.free_delivery_threshold}
                    onChange={(e) => setForm((p) => ({ ...p, free_delivery_threshold: e.target.value }))}
                    placeholder="500"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Carts at or above this amount get free shipping</p>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wide text-[10px]">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Live Rule Summary
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Orders under <strong>₹{threshold}</strong> → customer pays <strong>₹{charge}</strong> delivery fee</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Orders <strong>₹{threshold}+</strong> → qualified for <strong className="text-emerald-700">FREE Delivery</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Server-side calculated at checkout</span>
            <span className="font-bold text-slate-600">Auto-Enforced</span>
          </div>
        </div>

        {/* Card 2: Transit Time Estimates */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Estimated Delivery Transit Days
                </h2>
                <p className="text-xs text-slate-500">Customer-facing delivery ETA badges</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Minimum Delivery Days
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.delivery_estimate_min_days}
                  onChange={(e) => setForm((p) => ({ ...p, delivery_estimate_min_days: e.target.value }))}
                  placeholder="3"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                />
                <p className="text-[11px] text-slate-400">Earliest delivery expectation</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Maximum Delivery Days
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.delivery_estimate_max_days}
                  onChange={(e) => setForm((p) => ({ ...p, delivery_estimate_max_days: e.target.value }))}
                  placeholder="7"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                />
                <p className="text-[11px] text-slate-400">Latest delivery expectation</p>
              </div>
            </div>

            {/* Live Customer Preview */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 text-[10px] uppercase tracking-wide">
                Customer-Facing Badge Preview
              </p>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Shown on product detail pages, cart summary, and order confirmation messages:
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs shadow-xs">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>
                  Estimated delivery in {minDays}
                  {Number(maxDays) > Number(minDays) ? ` - ${maxDays}` : ''} days
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Visible on Web & Mobile app</span>
            {dirty ? (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Current Configuration
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
