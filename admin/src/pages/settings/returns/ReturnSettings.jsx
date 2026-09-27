import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw, Truck, ShieldAlert, AlertCircle, Coins, Sliders,
  CheckCircle2, ShieldCheck, XCircle, X
} from 'lucide-react';
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
        enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 hover:bg-slate-400'
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
  const [successModal, setSuccessModal] = useState(null);

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
    const willBeEnabled = !blockCodOnAbuse;
    try {
      await settingsApi.update({ return_abuse_block_cod: willBeEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setSuccessModal({
        target: 'cod',
        enabled: willBeEnabled,
        status: willBeEnabled ? 'success' : 'failed',
        threshold: form.return_abuse_threshold || settings.return_abuse_threshold || '3',
      });
    } catch (err) {
      setSuccessModal({
        target: 'cod',
        enabled: false,
        status: 'failed',
        isError: true,
        errorMessage: err.response?.data?.message || err.message || 'Server failed to update setting. Please try again.',
        threshold: form.return_abuse_threshold || settings.return_abuse_threshold || '3',
      });
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleBlockReturn() {
    setSaving('block-return');
    const willBeEnabled = !blockReturnOnAbuse;
    try {
      await settingsApi.update({ return_abuse_block_return: willBeEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setSuccessModal({
        target: 'return',
        enabled: willBeEnabled,
        status: willBeEnabled ? 'success' : 'failed',
        threshold: form.return_abuse_threshold || settings.return_abuse_threshold || '3',
      });
    } catch (err) {
      setSuccessModal({
        target: 'return',
        enabled: false,
        status: 'failed',
        isError: true,
        errorMessage: err.response?.data?.message || err.message || 'Server failed to update setting. Please try again.',
        threshold: form.return_abuse_threshold || settings.return_abuse_threshold || '3',
      });
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
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            blockCodOnAbuse ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <Truck className={`h-5 w-5 ${blockCodOnAbuse ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-bold text-xs text-slate-900">Block Cash on Delivery (COD)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Frequent returners are restricted to prepaid online payment methods</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                blockCodOnAbuse
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${blockCodOnAbuse ? 'bg-emerald-600 animate-pulse' : 'bg-rose-500'}`} />
                {blockCodOnAbuse ? 'ACTIVE' : 'DISABLED'}
              </span>
              <Toggle enabled={blockCodOnAbuse} onChange={handleToggleBlockCod} loading={saving === 'block-cod'} />
            </div>
          </div>

          {/* Block Returns toggle */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            blockReturnOnAbuse ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <RotateCcw className={`h-5 w-5 ${blockReturnOnAbuse ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-bold text-xs text-slate-900">Disallow Further Returns</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Subsequent return requests are blocked at the customer app level</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                blockReturnOnAbuse
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${blockReturnOnAbuse ? 'bg-emerald-600 animate-pulse' : 'bg-rose-500'}`} />
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

      {/* ── Classic Executive Success (Green) / Failed (Red) Centered Popup ── */}
      {successModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSuccessModal(null)}
        >
          <div
            className={`bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border text-center relative overflow-hidden animate-in zoom-in-95 duration-200 ${
              successModal.status === 'success'
                ? 'border-emerald-200 shadow-emerald-950/20'
                : 'border-rose-200 shadow-rose-950/20'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Color Accent Line */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 ${
                successModal.status === 'success'
                  ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600'
              }`}
            />

            {/* Top Close Button */}
            <button
              onClick={() => setSuccessModal(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Decorative Ambient Glow */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-2xl opacity-40 pointer-events-none ${
                successModal.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />

            {/* Centered Circular Icon Badge */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 shadow-sm relative z-10 ring-4 ${
                successModal.status === 'success'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 ring-emerald-100/60 shadow-emerald-500/10'
                  : 'bg-rose-50 text-rose-600 border-rose-200 ring-rose-100/60 shadow-rose-500/10'
              }`}
            >
              {successModal.status === 'success' ? (
                <ShieldCheck className="w-8 h-8" />
              ) : successModal.isError ? (
                <XCircle className="w-8 h-8" />
              ) : (
                <ShieldAlert className="w-8 h-8" />
              )}
            </div>

            {/* Policy Status Badge */}
            <div className="relative z-10 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                  successModal.status === 'success'
                    ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100/80 text-rose-800 border-rose-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    successModal.status === 'success'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                />
                {successModal.isError
                  ? 'UPDATE FAILED — SERVER ERROR'
                  : successModal.status === 'success'
                  ? 'SUCCESS — PROTECTION ACTIVE'
                  : 'FAILED / RESTRICTION DISABLED'}
              </span>
            </div>

            {/* Title & Description */}
            <h3
              className={`text-lg sm:text-xl font-black tracking-tight relative z-10 ${
                successModal.status === 'success' ? 'text-emerald-950' : 'text-rose-950'
              }`}
            >
              {successModal.isError
                ? 'Failed to Update Setting'
                : successModal.target === 'cod'
                ? successModal.enabled
                  ? 'COD Restriction Enabled'
                  : 'COD Restriction Disabled'
                : successModal.enabled
                ? 'Return Restriction Enabled'
                : 'Return Restriction Disabled'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed relative z-10">
              {successModal.isError
                ? successModal.errorMessage
                : successModal.target === 'cod'
                ? successModal.enabled
                  ? 'High-frequency returners are now automatically restricted to prepaid payment methods only.'
                  : 'Cash on Delivery (COD) is now available again for all customers, including frequent returners.'
                : successModal.enabled
                ? 'Customers with excessive return claims will be blocked from submitting further return requests.'
                : 'All customers can submit return requests normally.'}
            </p>

            {/* Executive Details Breakdown Card */}
            {!successModal.isError && (
              <div
                className={`border rounded-2xl p-4 text-left space-y-2.5 my-5 text-xs relative z-10 ${
                  successModal.status === 'success'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={successModal.status === 'success' ? 'text-emerald-900/70 font-medium' : 'text-rose-900/70 font-medium'}>
                    Trigger Threshold:
                  </span>
                  <span
                    className={`font-bold text-right ${
                      successModal.status === 'success' ? 'text-emerald-950' : 'text-rose-950'
                    }`}
                  >
                    ≥ {successModal.threshold} completed returns
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className={successModal.status === 'success' ? 'text-emerald-900/70 font-medium' : 'text-rose-900/70 font-medium'}>
                    Checkout Enforcement:
                  </span>
                  <span
                    className={`font-bold text-right px-2 py-0.5 rounded text-[11px] ${
                      successModal.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {successModal.target === 'cod'
                      ? successModal.enabled
                        ? 'COD payment option disabled'
                        : 'COD allowed for all'
                      : successModal.enabled
                      ? 'Return button blocked'
                      : 'Returns allowed for all'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className={successModal.status === 'success' ? 'text-emerald-900/70 font-medium' : 'text-rose-900/70 font-medium'}>
                    Permitted Payments:
                  </span>
                  <span
                    className={`font-bold text-right ${
                      successModal.status === 'success' ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {successModal.enabled ? 'Prepaid Only (UPI, Cards, Wallet)' : 'All Payment Methods (COD + Online)'}
                  </span>
                </div>
                <div
                  className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                    successModal.status === 'success'
                      ? 'border-emerald-200/80 text-emerald-800/80'
                      : 'border-rose-200/80 text-rose-800/80'
                  }`}
                >
                  <span>App & Web storefront</span>
                  <span className="font-semibold">Immediate Effect</span>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => setSuccessModal(null)}
              className={`w-full text-white font-bold text-xs py-3.5 px-5 rounded-xl shadow-lg transition-all cursor-pointer relative z-10 flex items-center justify-center gap-2 mt-4 active:scale-[0.99] ${
                successModal.status === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              {successModal.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-100" />
              )}
              <span>
                {successModal.status === 'success'
                  ? 'Understood & Apply Policy'
                  : 'Dismiss & Review Setting'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
