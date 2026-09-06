import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Truck, Tag } from 'lucide-react';
import { settingsApi } from '../../../api';
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

export default function PaymentMethods() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = data?.data?.settings || {};
  const [saving, setSaving] = useState(null);

  const codEnabled = settings.cod_enabled !== 'false' && settings.cod_enabled !== false;
  const couponFieldEnabled = settings.coupon_field_enabled !== 'false' && settings.coupon_field_enabled !== false;

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

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-indigo-500" />
          Payment Methods
        </h1>
        <p className="text-sm text-gray-500 mt-1">Control which payment options are available to customers at checkout.</p>
      </div>

      {/* Cash on Delivery */}
      <div className={`flex items-center justify-between p-5 rounded-2xl border shadow-sm ${
        codEnabled ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${codEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
            <Truck className={`h-5 w-5 ${codEnabled ? 'text-green-600' : 'text-red-500'}`} />
          </div>
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

      {/* Coupon Code Field */}
      <div className={`flex items-center justify-between p-5 rounded-2xl border shadow-sm ${
        couponFieldEnabled ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${couponFieldEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
            <Tag className={`h-5 w-5 ${couponFieldEnabled ? 'text-green-600' : 'text-red-500'}`} />
          </div>
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

      <p className="text-xs text-gray-400 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
        ⚠️ When COD is disabled, it will be hidden on both the web and mobile checkout pages immediately.
      </p>
    </div>
  );
}
