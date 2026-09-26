import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Truck, ShieldAlert, AlertCircle, Coins, Sliders } from 'lucide-react';
import { settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

function Toggle({ enabled, onChange, loading }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-slate-900' : 'bg-slate-200'
      } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function ReturnSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = data?.data?.settings || {};
  const [saving, setSaving] = useState(null);
  const [form, setForm] = useState({ return_courier_charge: '', return_abuse_threshold: '' });
  const [hydrated, setHydrated] = useState(false);

  if (!isLoading && !hydrated && data) {
    setForm({
      return_courier_charge: settings.return_courier_charge ?? '0',
      return_abuse_threshold: settings.return_abuse_threshold ?? '3',
    });
    setHydrated(true);
  }

  const blockCodOnAbuse = settings.return_abuse_block_cod === 'true' || settings.return_abuse_block_cod === true;
  const blockReturnOnAbuse = settings.return_abuse_block_return === 'true' || settings.return_abuse_block_return === true;
  const thresholdDirty = anyChanged([form.return_abuse_threshold, settings.return_abuse_threshold ?? '3']);
  const courierChargeDirty = anyChanged([form.return_courier_charge, settings.return_courier_charge ?? '0']);

  async function handleToggleBlockCod() {
    setSaving('block-cod');
    try {
      await settingsApi.update({ return_abuse_block_cod: !blockCodOnAbuse });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`COD restriction for high returners ${!blockCodOnAbuse ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleBlockReturn() {
    setSaving('block-return');
    try {
      await settingsApi.update({ return_abuse_block_return: !blockReturnOnAbuse });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Return request restriction ${!blockReturnOnAbuse ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveCourierCharge() {
    setSaving('courier');
    try {
      await settingsApi.update({ return_courier_charge: form.return_courier_charge });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Return courier charge saved');
    } catch {
      toast.error('Failed to save charge');
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveThreshold() {
    setSaving('threshold');
    try {
      await settingsApi.update({ return_abuse_threshold: form.return_abuse_threshold });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Return threshold saved');
    } catch {
      toast.error('Failed to save threshold');
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-500">Loading return configuration...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Return & Refund Policies
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure reverse logistics courier fees, abuse prevention rules, and threshold triggers
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Reverse Logistics Courier Charges ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Coins className="h-5 w-5 text-slate-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Reverse Shipping Fee
              </h2>
              <p className="text-xs text-slate-400">Deduction applied to customer refund</p>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              label="Courier Return Pickup Charge (₹)"
              type="number"
              min={0}
              value={form.return_courier_charge}
              onChange={(e) => setForm((p) => ({ ...p, return_courier_charge: e.target.value }))}
              placeholder="0"
            />
            <p className="text-xs text-slate-500 leading-relaxed">
              This amount is automatically subtracted from the customer's gross order total during return calculation to offset reverse freight courier expenses. Set to 0 for free customer returns.
            </p>
          </div>

          {courierChargeDirty && (
            <div className="flex justify-end pt-2">
              <Button size="sm" loading={saving === 'courier'} onClick={handleSaveCourierCharge}>
                Save Courier Charge
              </Button>
            </div>
          )}
        </div>

        {/* ── Return Abuse Protection Rules ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <ShieldAlert className="h-5 w-5 text-slate-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Abuse Prevention & Limits
              </h2>
              <p className="text-xs text-slate-400">Automated guardrails against excessive claims</p>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              label="Trigger threshold (Number of completed returns)"
              type="number"
              min={1}
              value={form.return_abuse_threshold}
              onChange={(e) => setForm((p) => ({ ...p, return_abuse_threshold: e.target.value }))}
              placeholder="3"
            />
            <p className="text-xs text-slate-500 leading-relaxed">
              When a customer accounts for this many completed return claims, the automated restriction flags below take immediate effect.
            </p>
          </div>

          {thresholdDirty && (
            <div className="flex justify-end pt-2">
              <Button size="sm" loading={saving === 'threshold'} onClick={handleSaveThreshold}>
                Save Threshold
              </Button>
            </div>
          )}

          {/* Block COD toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <Truck className={`h-5 w-5 ${blockCodOnAbuse ? 'text-slate-900' : 'text-slate-400'}`} />
              <div>
                <p className="font-bold text-xs text-slate-900">Block Cash on Delivery (COD)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Frequent returners are restricted to prepaid online payment methods</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                blockCodOnAbuse ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                {blockCodOnAbuse ? 'ACTIVE' : 'DISABLED'}
              </span>
              <Toggle enabled={blockCodOnAbuse} onChange={handleToggleBlockCod} loading={saving === 'block-cod'} />
            </div>
          </div>

          {/* Block Returns toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <RotateCcw className={`h-5 w-5 ${blockReturnOnAbuse ? 'text-slate-900' : 'text-slate-400'}`} />
              <div>
                <p className="font-bold text-xs text-slate-900">Disallow Further Returns</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Subsequent return requests are blocked at the customer app level</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                blockReturnOnAbuse ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                {blockReturnOnAbuse ? 'ACTIVE' : 'DISABLED'}
              </span>
              <Toggle enabled={blockReturnOnAbuse} onChange={handleToggleBlockReturn} loading={saving === 'block-return'} />
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Enable at least one restriction toggle above for the return abuse threshold to enforce protective measures.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
