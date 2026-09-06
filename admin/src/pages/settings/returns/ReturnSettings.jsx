import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Truck } from 'lucide-react';
import { settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

function Toggle({ enabled, onChange, loading }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
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
      toast.success(`COD block on frequent returners ${!blockCodOnAbuse ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(null); }
  }

  async function handleToggleBlockReturn() {
    setSaving('block-return');
    try {
      await settingsApi.update({ return_abuse_block_return: !blockReturnOnAbuse });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Return block on frequent returners ${!blockReturnOnAbuse ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(null); }
  }

  async function handleSaveCourierCharge() {
    setSaving('courier');
    try {
      await settingsApi.update({ return_courier_charge: form.return_courier_charge });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Return courier charge saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  }

  async function handleSaveThreshold() {
    setSaving('threshold');
    try {
      await settingsApi.update({ return_abuse_threshold: form.return_abuse_threshold });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Return threshold saved');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-indigo-500" />
          Return Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure return charges and abuse protection rules.
        </p>
      </div>

      {/* ── Charges ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Return Charges</h2>

        <div className="space-y-1.5 max-w-xs">
          <Input
            label="Courier Return Charge (₹)"
            type="number"
            min={0}
            value={form.return_courier_charge}
            onChange={(e) => setForm((p) => ({ ...p, return_courier_charge: e.target.value }))}
            placeholder="0"
          />
          <p className="text-xs text-gray-400">Deducted from the refund to cover courier pickup. Set to 0 for no charge.</p>
        </div>
        {courierChargeDirty && (
          <div className="flex justify-end">
            <Button size="sm" loading={saving === 'courier'} onClick={handleSaveCourierCharge}>
              Save Courier Charge
            </Button>
          </div>
        )}
      </div>

      {/* ── Abuse Protection ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Abuse Protection</h2>
          <p className="text-xs text-gray-400 mt-1">
            Once a customer's completed returns reach this count, apply the restrictions below.
          </p>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <Input
            label="Block after this many returns"
            type="number"
            min={1}
            value={form.return_abuse_threshold}
            onChange={(e) => setForm((p) => ({ ...p, return_abuse_threshold: e.target.value }))}
            placeholder="3"
          />
          <p className="text-xs text-gray-400">e.g. 3 means the 4th return attempt is blocked</p>
        </div>
        {thresholdDirty && (
          <div className="flex justify-end">
            <Button size="sm" loading={saving === 'threshold'} onClick={handleSaveThreshold}>
              Save Threshold
            </Button>
          </div>
        )}

        {/* Block COD toggle */}
        <div className={`flex items-center justify-between p-4 rounded-xl border ${
          blockCodOnAbuse ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <Truck className={`h-5 w-5 ${blockCodOnAbuse ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-semibold text-sm text-gray-800">Block Cash on Delivery</p>
              <p className="text-xs text-gray-500 mt-0.5">Frequent returners must pay online instead of COD</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              blockCodOnAbuse ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {blockCodOnAbuse ? 'On' : 'Off'}
            </span>
            <Toggle enabled={blockCodOnAbuse} onChange={handleToggleBlockCod} loading={saving === 'block-cod'} />
          </div>
        </div>

        {/* Block Returns toggle */}
        <div className={`flex items-center justify-between p-4 rounded-xl border ${
          blockReturnOnAbuse ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <RotateCcw className={`h-5 w-5 ${blockReturnOnAbuse ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-semibold text-sm text-gray-800">Block Further Returns</p>
              <p className="text-xs text-gray-500 mt-0.5">Frequent returners can no longer submit new return requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              blockReturnOnAbuse ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {blockReturnOnAbuse ? 'On' : 'Off'}
            </span>
            <Toggle enabled={blockReturnOnAbuse} onChange={handleToggleBlockReturn} loading={saving === 'block-return'} />
          </div>
        </div>

        <p className="text-xs text-gray-400 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          ⚠️ Toggle at least one option above — the threshold alone does nothing unless COD, returns, or both are set to block.
        </p>
      </div>
    </div>
  );
}
