import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Truck, Tag, Wallet, ShieldCheck,
  CheckCircle2, RefreshCw, Save, Check
} from 'lucide-react';
import { settingsApi } from '../../../api';
import toast from 'react-hot-toast';

/* ── Simple Toggle Switch ── */
function ToggleSwitch({ enabled, onChange, loading }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-emerald-600' : 'bg-slate-300'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function PaymentMethods() {
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.get,
  });

  const settings = data?.data?.settings || {};
  const [savingKey, setSavingKey] = useState(null);

  // Delivery settings
  const [deliveryCharge, setDeliveryCharge] = useState('50');
  const [freeThreshold, setFreeThreshold] = useState('500');
  const [thresholdDirty, setThresholdDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setDeliveryCharge(String(settings.delivery_charge ?? '50'));
      setFreeThreshold(String(settings.free_delivery_threshold ?? '500'));
      setThresholdDirty(false);
    }
  }, [settings.delivery_charge, settings.free_delivery_threshold]);

  const codEnabled = settings.cod_enabled !== 'false' && settings.cod_enabled !== false;
  const couponFieldEnabled = settings.coupon_field_enabled !== 'false' && settings.coupon_field_enabled !== false;

  /* ── Toggle Cash on Delivery ── */
  async function handleToggleCod() {
    setSavingKey('cod');
    try {
      await settingsApi.update({ cod_enabled: !codEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Cash on Delivery ${!codEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update Cash on Delivery');
    } finally {
      setSavingKey(null);
    }
  }

  /* ── Toggle Coupon Code Box ── */
  async function handleToggleCoupon() {
    setSavingKey('coupon');
    try {
      await settingsApi.update({ coupon_field_enabled: !couponFieldEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Coupon box ${!couponFieldEnabled ? 'visible' : 'hidden'} at checkout`);
    } catch {
      toast.error('Failed to update coupon setting');
    } finally {
      setSavingKey(null);
    }
  }

  /* ── Save Delivery Charge & Free Threshold ── */
  async function handleSaveDelivery(e) {
    if (e?.preventDefault) e.preventDefault();
    setSavingKey('delivery');
    try {
      await settingsApi.update({
        delivery_charge: parseInt(deliveryCharge, 10) || 0,
        free_delivery_threshold: parseInt(freeThreshold, 10) || 0,
      });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Delivery settings saved');
      setThresholdDirty(false);
    } catch {
      toast.error('Failed to save delivery settings');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="max-w-4xl space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Payment & Checkout Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Control which payment methods and options customers see at checkout.
          </p>
        </div>

        <button
          onClick={() => {
            qc.invalidateQueries({ queryKey: ['admin-settings'] });
            toast.success('Refreshed');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Section 1: Payment Methods ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Payment Methods
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Cash on Delivery (COD) */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Cash on Delivery (COD)</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      codEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {codEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allow customers to pay cash when their order is delivered to their doorstep.
                </p>
              </div>
            </div>

            <ToggleSwitch
              enabled={codEnabled}
              onChange={handleToggleCod}
              loading={savingKey === 'cod'}
            />
          </div>

          {/* Online Payments (Razorpay) */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Online Payments (Razorpay)</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Always On
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accept payments via UPI (GPay, PhonePe, Paytm), Credit & Debit Cards, and NetBanking.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-400">Integrated</span>
          </div>

          {/* Digital Wallet */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Dundu Wallet</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Enabled
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customers can use their store wallet balance at checkout for instant payments and refunds.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-400">Automatic</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Checkout Options ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Checkout Options
          </h2>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Coupon Code Box</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    couponFieldEnabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {couponFieldEnabled ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Show the promo code box at checkout. Turn off to prevent shoppers from leaving your store to search for coupons.
              </p>
            </div>
          </div>

          <ToggleSwitch
            enabled={couponFieldEnabled}
            onChange={handleToggleCoupon}
            loading={savingKey === 'coupon'}
          />
        </div>
      </div>

      {/* ── Section 3: Delivery Charges ── */}
      <form
        onSubmit={handleSaveDelivery}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Shipping & Delivery Fees
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set standard delivery fee and the minimum order amount for free delivery.
            </p>
          </div>

          {thresholdDirty ? (
            <button
              type="submit"
              disabled={savingKey === 'delivery'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingKey === 'delivery' ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Standard Delivery Charge */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Standard Delivery Charge
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="0"
                value={deliveryCharge}
                onChange={(e) => {
                  setDeliveryCharge(e.target.value);
                  setThresholdDirty(true);
                }}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400">Charged when order is below free shipping amount.</p>
          </div>

          {/* Free Delivery Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Free Delivery for Orders Above
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="0"
                value={freeThreshold}
                onChange={(e) => {
                  setFreeThreshold(e.target.value);
                  setThresholdDirty(true);
                }}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400">Orders at or above this amount get free shipping automatically.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
