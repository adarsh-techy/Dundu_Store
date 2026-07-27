import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Truck, Package, Tag, Smartphone, RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { settingsApi } from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { anyChanged } from '../utils/dirty';
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

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = data?.data?.settings || {};

  const [saving, setSaving] = useState(null);
  const [form, setForm] = useState({ delivery_charge: '', free_delivery_threshold: '', return_courier_charge: '', return_abuse_threshold: '', offer_badge_color: '#e91e8c', offer_badge_text_color: '#ffffff' });

  const [hydrated, setHydrated] = useState(false);
  if (!isLoading && !hydrated && data) {
    setForm({
      delivery_charge: settings.delivery_charge ?? '50',
      free_delivery_threshold: settings.free_delivery_threshold ?? '500',
      return_courier_charge: settings.return_courier_charge ?? '0',
      return_abuse_threshold: settings.return_abuse_threshold ?? '3',
      offer_badge_color: settings.offer_badge_color || '#e91e8c',
      offer_badge_text_color: settings.offer_badge_text_color || '#ffffff',
    });
    setHydrated(true);
  }

  const codEnabled = settings.cod_enabled !== 'false' && settings.cod_enabled !== false;
  const couponFieldEnabled = settings.coupon_field_enabled !== 'false' && settings.coupon_field_enabled !== false;
  const blockCodOnAbuse = settings.return_abuse_block_cod === 'true' || settings.return_abuse_block_cod === true;
  const blockReturnOnAbuse = settings.return_abuse_block_return === 'true' || settings.return_abuse_block_return === true;
  const deliveryDirty = anyChanged(
    [form.delivery_charge, settings.delivery_charge ?? '50'],
    [form.free_delivery_threshold, settings.free_delivery_threshold ?? '500']
  );
  const returnAbuseThresholdDirty = anyChanged(
    [form.return_abuse_threshold, settings.return_abuse_threshold ?? '3']
  );
  const returnCourierChargeDirty = anyChanged(
    [form.return_courier_charge, settings.return_courier_charge ?? '0']
  );
  const offerBadgeColorsDirty = anyChanged(
    [form.offer_badge_color, settings.offer_badge_color || '#e91e8c'],
    [form.offer_badge_text_color, settings.offer_badge_text_color || '#ffffff']
  );

  async function handleToggleCod() {
    setSaving('cod');
    try {
      await settingsApi.update({ cod_enabled: !codEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Cash on Delivery ${!codEnabled ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(null); }
  }

  async function handleToggleCouponField() {
    setSaving('coupon');
    try {
      await settingsApi.update({ coupon_field_enabled: !couponFieldEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Coupon field ${!couponFieldEnabled ? 'shown' : 'hidden'} on checkout`);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(null); }
  }

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

  async function handleSaveReturnAbuseThreshold() {
    setSaving('return-threshold');
    try {
      await settingsApi.update({ return_abuse_threshold: form.return_abuse_threshold });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Return threshold saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  }

  async function handleSaveReturnCourierCharge() {
    setSaving('return-courier-charge');
    try {
      await settingsApi.update({ return_courier_charge: form.return_courier_charge });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Return courier charge saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  }

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
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* ── Payment Methods ── */}
      <section className="bg-blue-50 rounded-2xl border border-blue-300 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-pink-600">Payment Methods</h2>
        </div>

        <div className={`flex items-center justify-between p-4 rounded-xl border ${
          codEnabled ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center gap-3">
            <Truck className={`h-5 w-5 ${codEnabled ? 'text-green-600' : 'text-red-500'}`} />
            <div>
              <p className="font-semibold text-sm text-gray-800">Cash on Delivery (COD)</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {codEnabled
                  ? 'Customers can choose COD at checkout'
                  : '🚫 COD is blocked — customers cannot select it at checkout'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              codEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {codEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Toggle enabled={codEnabled} onChange={handleToggleCod} loading={saving === 'cod'} />
          </div>
        </div>

        <div className={`flex items-center justify-between p-4 rounded-xl border mt-3 ${
          couponFieldEnabled ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center gap-3">
            <Tag className={`h-5 w-5 ${couponFieldEnabled ? 'text-green-600' : 'text-red-500'}`} />
            <div>
              <p className="font-semibold text-sm text-gray-800">Coupon Code Field</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {couponFieldEnabled
                  ? 'Customers can enter coupon codes at checkout'
                  : '🚫 Coupon field is hidden — customers cannot apply coupons at checkout'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              couponFieldEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {couponFieldEnabled ? 'Visible' : 'Hidden'}
            </span>
            <Toggle enabled={couponFieldEnabled} onChange={handleToggleCouponField} loading={saving === 'coupon'} />
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          ⚠️ When COD is disabled, it will be hidden on both the web and mobile checkout pages immediately.
        </p>
      </section>

      {/* ── Delivery Charges ── */}
      <section className="bg-green-50 rounded-2xl border border-green-300 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-pink-600">Delivery Charges</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Orders below the free delivery threshold will be charged the delivery fee.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Input
              label="Delivery Charge (₹)"
              type="number"
              min={0}
              value={form.delivery_charge}
              onChange={(e) => setForm((p) => ({ ...p, delivery_charge: e.target.value }))}
              placeholder="50"
            />
            <p className="text-xs text-gray-400">Charged when order is below the threshold</p>
          </div>
          <div className="space-y-1">
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
        <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-medium">
          Current rule: orders below <strong>₹{form.free_delivery_threshold || 500}</strong> are charged <strong>₹{form.delivery_charge || 50}</strong> delivery · above is <strong>FREE</strong>
        </div>
        {deliveryDirty && (
          <div className="flex justify-end mt-4">
            <Button
              size="sm"
              loading={saving === 'delivery'}
              onClick={async () => {
                setSaving('delivery');
                try {
                  await settingsApi.update({
                    delivery_charge: form.delivery_charge,
                    free_delivery_threshold: form.free_delivery_threshold,
                  });
                  qc.invalidateQueries({ queryKey: ['admin-settings'] });
                  toast.success('Delivery settings saved');
                } catch { toast.error('Failed to save'); }
                finally { setSaving(null); }
              }}
            >
              Save Delivery Settings
            </Button>
          </div>
        )}
      </section>
      {/* ── Return Abuse Protection ── */}
      <section className="bg-red-50 rounded-2xl border border-red-300 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <RotateCcw className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-pink-600">Return Abuse Protection</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Once a customer's completed returns reach this number, apply the restriction(s) below to their account.
        </p>

        <div className="space-y-1 max-w-xs mb-4">
          <Input
            label="Courier Return Charge (₹)"
            type="number"
            min={0}
            value={form.return_courier_charge}
            onChange={(e) => setForm((p) => ({ ...p, return_courier_charge: e.target.value }))}
            placeholder="0"
          />
          <p className="text-xs text-gray-400">Deducted from the refund to cover courier pickup when a return is approved. Set to 0 for no charge.</p>
        </div>
        {returnCourierChargeDirty && (
          <div className="flex justify-end mb-5">
            <Button
              size="sm"
              loading={saving === 'return-courier-charge'}
              onClick={handleSaveReturnCourierCharge}
            >
              Save Courier Charge
            </Button>
          </div>
        )}

        <div className="space-y-1 max-w-xs mb-4">
          <Input
            label="Block after this many returns"
            type="number"
            min={1}
            value={form.return_abuse_threshold}
            onChange={(e) => setForm((p) => ({ ...p, return_abuse_threshold: e.target.value }))}
            placeholder="3"
          />
          <p className="text-xs text-gray-400">e.g. 3 means the 4th return attempt (or COD order) is blocked</p>
        </div>
        {returnAbuseThresholdDirty && (
          <div className="flex justify-end mb-5">
            <Button
              size="sm"
              loading={saving === 'return-threshold'}
              onClick={handleSaveReturnAbuseThreshold}
            >
              Save Threshold
            </Button>
          </div>
        )}

        <div className={`flex items-center justify-between p-4 rounded-xl border ${
          blockCodOnAbuse ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <Truck className={`h-5 w-5 ${blockCodOnAbuse ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-semibold text-sm text-gray-800">Block Cash on Delivery</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Frequent returners must pay online instead of COD
              </p>
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

        <div className={`flex items-center justify-between p-4 rounded-xl border mt-3 ${
          blockReturnOnAbuse ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <RotateCcw className={`h-5 w-5 ${blockReturnOnAbuse ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-semibold text-sm text-gray-800">Block Further Returns</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Frequent returners can no longer submit new return requests
              </p>
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

        <p className="text-xs text-gray-400 mt-3">
          ⚠️ Toggle at least one option above — the threshold alone does nothing unless COD, returns, or both are set to block.
        </p>
      </section>

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

      {/* ── App Update (shortcut) ── */}
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
