import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Search,
  X,
  Copy,
  Check,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Percent,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { couponApi, settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input, { Select } from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatDate, formatDateTime } from '../../../utils/format';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_value: '',
  max_discount: '',
  usage_limit: '',
  per_user_limit: '',
  expires_at: '',
  is_active: true,
};

const COUPON_PRESETS = [
  {
    label: 'WELCOME10',
    desc: '10% off • min ₹299',
    code: 'WELCOME10',
    discount_type: 'percentage',
    discount_value: '10',
    min_order_value: '299',
    max_discount: '300',
    usage_limit: '',
    per_user_limit: '1',
  },
  {
    label: 'FESTIVE20',
    desc: '20% off • cap ₹500 • min ₹799',
    code: 'FESTIVE20',
    discount_type: 'percentage',
    discount_value: '20',
    min_order_value: '799',
    max_discount: '500',
    usage_limit: '1000',
    per_user_limit: '1',
  },
  {
    label: 'FLAT100',
    desc: '₹100 flat • min ₹499',
    code: 'FLAT100',
    discount_type: 'fixed',
    discount_value: '100',
    min_order_value: '499',
    max_discount: '',
    usage_limit: '500',
    per_user_limit: '1',
  },
  {
    label: 'MEGA500',
    desc: '₹500 flat • min ₹1,999',
    code: 'MEGA500',
    discount_type: 'fixed',
    discount_value: '500',
    min_order_value: '1999',
    max_discount: '',
    usage_limit: '200',
    per_user_limit: '1',
  },
];

function toFormValues(coupon) {
  return {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: String(coupon.discount_value),
    min_order_value: coupon.min_order_value > 0 ? String(coupon.min_order_value) : '',
    max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
    usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
    per_user_limit: coupon.per_user_limit ? String(coupon.per_user_limit) : '',
    expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 16) : '',
    is_active: coupon.is_active,
  };
}

export default function Coupons() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [togglingField, setTogglingField] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: couponApi.list,
  });
  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.get,
  });

  const settings = settingsData?.data?.settings || {};
  const couponFieldEnabled =
    settings.coupon_field_enabled !== 'false' && settings.coupon_field_enabled !== false;

  const coupons = data?.data?.coupons || [];

  async function handleToggleCouponField() {
    setTogglingField(true);
    try {
      await settingsApi.update({ coupon_field_enabled: !couponFieldEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(
        `Checkout coupon field is now ${!couponFieldEnabled ? 'Visible' : 'Hidden'}`
      );
    } catch {
      toast.error('Failed to update checkout setting');
    } finally {
      setTogglingField(false);
    }
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DUNDU';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((p) => ({ ...p, code }));
  }

  const applyPreset = (preset) => {
    setForm((p) => ({
      ...p,
      code: preset.code,
      discount_type: preset.discount_type,
      discount_value: preset.discount_value,
      min_order_value: preset.min_order_value,
      max_discount: preset.max_discount,
      usage_limit: preset.usage_limit,
      per_user_limit: preset.per_user_limit,
    }));
  };

  const setExpiryDays = (days) => {
    if (days === null) {
      setForm((p) => ({ ...p, expires_at: '' }));
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setForm((p) => ({ ...p, expires_at: formatted }));
  };

  function handleCopy(code) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied code "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(coupon) {
    setEditTarget(coupon);
    setForm(toFormValues(coupon));
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTarget(null);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discount_value: parseFloat(form.discount_value) || 0,
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
        per_user_limit: form.per_user_limit ? parseInt(form.per_user_limit, 10) : null,
        expires_at: form.expires_at || null,
      };

      if (editTarget) {
        await couponApi.update(editTarget.id, payload);
        toast.success('Coupon updated successfully');
      } else {
        await couponApi.create(payload);
        toast.success('Coupon created successfully');
      }
      closeModal();
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Permanently delete coupon "${coupon.code}"? This action cannot be reversed.`))
      return;
    setDeletingId(coupon.id);
    try {
      await couponApi.remove(coupon.id);
      toast.success('Coupon deleted');
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete coupon');
    } finally {
      setDeletingId(null);
    }
  };

  // Quick toggle active state for coupon
  const handleToggleActive = async (coupon) => {
    try {
      await couponApi.update(coupon.id, {
        ...coupon,
        is_active: !coupon.is_active,
      });
      toast.success(`Coupon "${coupon.code}" ${!coupon.is_active ? 'activated' : 'paused'}`);
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    } catch {
      toast.error('Failed to update coupon status');
    }
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q && !c.code.toLowerCase().includes(q)) return false;

      const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
      if (statusFilter === 'active' && (!c.is_active || isExpired)) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;
      if (statusFilter === 'expired' && !isExpired) return false;

      if (typeFilter !== 'all' && c.discount_type !== typeFilter) return false;

      return true;
    });
  }, [coupons, search, statusFilter, typeFilter]);

  // Aggregate metrics
  const activeCount = coupons.filter(
    (c) => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())
  ).length;
  const totalUses = coupons.reduce((sum, c) => sum + (parseInt(c.used_count, 10) || 0), 0);
  const totalDiscountGiven = coupons.reduce(
    (sum, c) => sum + (parseFloat(c.total_discount_given) || 0),
    0
  );
  const totalCouponRevenue = coupons.reduce(
    (sum, c) => sum + (parseFloat(c.total_order_revenue) || 0),
    0
  );

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Ticket className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Coupons & Promotional Codes
                </h1>
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                  {coupons.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage percentage and flat discount vouchers, checkout restrictions, and redemption rules
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            title="Refresh coupons"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* ── Checkout Field Governance Banner ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              couponFieldEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
          >
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-slate-900">Checkout Coupon Input Field</p>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  couponFieldEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {couponFieldEnabled ? 'Customer Visible' : 'Disabled / Hidden'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {couponFieldEnabled
                ? 'Customers can enter discount promo codes in the order summary step on both web and app.'
                : 'The coupon entry box is hidden from checkout; codes cannot be manually applied by customers.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleToggleCouponField}
            disabled={togglingField}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              couponFieldEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            } ${togglingField ? 'opacity-60 cursor-not-allowed' : ''}`}
            title="Toggle customer checkout coupon field"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                couponFieldEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Codes</p>
            <p className="text-xl font-bold text-slate-900">{coupons.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Live</p>
            <p className="text-xl font-bold text-slate-900">
              {activeCount} <span className="text-xs font-normal text-slate-400">codes</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Redemptions</p>
            <p className="text-xl font-bold text-slate-900">{totalUses.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Discounts Given</p>
            <p className="text-xl font-bold text-slate-900">₹{Math.round(totalDiscountGiven).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupon code…"
            className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-slate-50/50 hover:bg-white transition-all text-slate-800 placeholder-slate-400 uppercase font-mono text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Paused Only</option>
            <option value="expired">Expired Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-700 cursor-pointer"
          >
            <option value="all">All Discount Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Flat Fixed (₹)</option>
          </select>

          <div className="text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-2 rounded-xl">
            {filteredCoupons.length} of {coupons.length}
          </div>
        </div>
      </div>

      {/* ── Coupons Ledger Table ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-400 font-medium">Loading coupon vouchers...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-14 text-center">#</th>
                  <th className="px-5 py-3.5">Coupon Code</th>
                  <th className="px-5 py-3.5">Discount Value</th>
                  <th className="px-5 py-3.5">Threshold / Min Cart</th>
                  <th className="px-5 py-3.5 text-center">Usage / Cap</th>
                  <th className="px-5 py-3.5">Expiry Date</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Ticket className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-800">No coupons found</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        {search || statusFilter !== 'all' || typeFilter !== 'all'
                          ? 'No coupons match your filter criteria. Try clearing search or status filters.'
                          : 'Get started by creating your first promotional coupon voucher using the button above.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((c, idx) => {
                    const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                    const isPercentage = c.discount_type === 'percentage';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-5 py-4 text-center text-xs font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg tracking-wider">
                              {c.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(c.code)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Copy coupon code"
                            >
                              {copiedCode === c.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-baseline gap-1.5">
                            <span className="inline-flex items-center gap-1 font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                              {isPercentage ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                            </span>
                            {c.max_discount > 0 && isPercentage && (
                              <span className="text-[11px] text-slate-400">
                                (Max ₹{c.max_discount})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs">
                          {c.min_order_value > 0 ? (
                            <span className="font-semibold text-slate-800">
                              ₹{c.min_order_value}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No minimum</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center text-xs">
                          <div className="font-semibold text-slate-800">
                            {c.used_count || 0}
                            <span className="text-slate-400 font-normal">
                              {c.usage_limit ? ` / ${c.usage_limit} uses` : ' uses'}
                            </span>
                          </div>
                          {c.per_user_limit > 0 && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {c.per_user_limit} per user
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs">
                          {c.expires_at ? (
                            <div>
                              <span
                                className={`font-medium block ${
                                  isExpired ? 'text-rose-600 line-through' : 'text-slate-700'
                                }`}
                              >
                                {formatDate(c.expires_at)}
                              </span>
                              {isExpired ? (
                                <span className="text-[10px] text-rose-500 font-semibold">Expired</span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Valid</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Never expires</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                              Expired
                            </span>
                          ) : c.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Click to pause coupon"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Click to activate coupon"
                            >
                              Paused
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="Edit coupon"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              disabled={deletingId === c.id}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                              title="Delete coupon"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create / Edit Coupon Modal ── */}
      {showModal && (
        <Modal
          size="lg"
          title={editTarget ? `Edit Coupon — ${editTarget.code}` : 'Create Promotional Coupon'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── 1. Live Interactive Ticket Mockup Preview ── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-4 border border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/15 shrink-0 text-amber-300 shadow-2xs">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black tracking-widest text-amber-400 bg-white/10 px-2.5 py-0.5 rounded-lg border border-amber-400/30 truncate">
                        {form.code || 'COUPONCODE'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          form.is_active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {form.is_active ? 'Live at Checkout' : 'Paused / Draft'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 mt-1 truncate">
                      {form.discount_type === 'percentage'
                        ? `${form.discount_value || '0'}% OFF ${
                            form.max_discount ? `(Up to ₹${Number(form.max_discount).toLocaleString()})` : ''
                          }`
                        : `FLAT ₹${Number(form.discount_value || 0).toLocaleString()} OFF`}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-[11px] text-slate-300 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-4 shrink-0">
                  <p className="text-white font-medium">
                    {form.min_order_value && Number(form.min_order_value) > 0
                      ? `Min. Order: ₹${Number(form.min_order_value).toLocaleString()}`
                      : 'No min order required'}
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    {form.expires_at
                      ? `Valid till: ${new Date(form.expires_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : 'Never expires'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── 2. Section 1: Coupon Code & Presets ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Coupon Code *
                </label>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Code</span>
                </button>
              </div>
              <Input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. FESTIVE20 or FLAT100"
                required
                className="font-mono uppercase tracking-widest font-black text-sm"
              />

              {/* 1-Click Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Presets:</span>
                {COUPON_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
                    title={p.desc}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px] text-slate-400">({p.desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── 3. Section 2: Discount Mechanism & Value ── */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 space-y-3.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Discount Mechanism & Amount
              </label>

              {/* Mechanism Toggle Cards */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, discount_type: 'percentage' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    form.discount_type === 'percentage'
                      ? 'border-indigo-600 bg-white text-indigo-900 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-white/60 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                    <span>Percentage (%)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deducts a percentage from cart subtotal (e.g. 10%, 20%).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, discount_type: 'fixed', max_discount: '' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    form.discount_type === 'fixed'
                      ? 'border-indigo-600 bg-white text-indigo-900 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-white/60 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <span>Flat Rupee Off (₹)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deducts a fixed amount directly from cart total (e.g. ₹100).
                  </p>
                </button>
              </div>

              {/* Stable 2-Column Amount Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <Input
                    label={form.discount_type === 'percentage' ? 'Discount Percentage (%) *' : 'Flat Discount (₹) *'}
                    type="number"
                    min="1"
                    max={form.discount_type === 'percentage' ? '100' : undefined}
                    placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
                    value={form.discount_value}
                    onChange={set('discount_value')}
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {form.discount_type === 'percentage'
                      ? 'Value between 1% and 100%.'
                      : 'Exact rupee amount to subtract from total.'}
                  </p>
                </div>

                <div>
                  {form.discount_type === 'percentage' ? (
                    <div>
                      <Input
                        label="Maximum Discount Cap (₹) (Optional)"
                        type="number"
                        placeholder="e.g. 500 (Leave empty for no limit)"
                        value={form.max_discount}
                        onChange={set('max_discount')}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Protects against huge discounts on large orders.
                      </p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center bg-white p-3 rounded-xl border border-slate-200/80">
                      <p className="text-xs font-bold text-slate-700">Flat Rupee Guarantee</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cart will receive exactly ₹{form.discount_value || '0'} discount regardless of cart size.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 4. Section 3: Cart Subtotal & Usage Limits ── */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 space-y-3.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Cart Conditions & Usage Limits
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Minimum Cart Subtotal */}
                <div>
                  <Input
                    label="Minimum Cart Subtotal (₹)"
                    type="number"
                    placeholder="e.g. 499 (0 for no minimum)"
                    value={form.min_order_value}
                    onChange={set('min_order_value')}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {['0', '499', '999', '1499'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, min_order_value: v === '0' ? '' : v }))}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          (v === '0' && !form.min_order_value) || form.min_order_value === v
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {v === '0' ? 'None' : `₹${v}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Per Customer Limit */}
                <div>
                  <Input
                    label="Max Uses Per Customer"
                    type="number"
                    placeholder="e.g. 1 use per customer"
                    value={form.per_user_limit}
                    onChange={set('per_user_limit')}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[
                      { label: '1 Use', val: '1' },
                      { label: '2 Uses', val: '2' },
                      { label: 'Unlimited', val: '' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, per_user_limit: opt.val }))}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          form.per_user_limit === opt.val
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Storewide Limit & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Total Storewide Limit */}
                <div>
                  <Input
                    label="Storewide Usage Quota (Optional)"
                    type="number"
                    placeholder="e.g. 1000 (Empty for unlimited)"
                    value={form.usage_limit}
                    onChange={set('usage_limit')}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[
                      { label: '100', val: '100' },
                      { label: '500', val: '500' },
                      { label: '1,000', val: '1000' },
                      { label: 'Unlimited', val: '' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, usage_limit: opt.val }))}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          form.usage_limit === opt.val
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiration Date */}
                <div>
                  <Input
                    label="Expiration Date & Time"
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={set('expires_at')}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setExpiryDays(7)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer"
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpiryDays(30)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer"
                    >
                      +30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpiryDays(null)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer ${
                        !form.expires_at
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Never Expires
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. Active Status Switch ── */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Coupon Live Status</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {form.is_active
                    ? 'Active — eligible shoppers can redeem this code at checkout.'
                    : 'Paused — code is saved as a draft and cannot be redeemed.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  form.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    form.is_active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl px-4">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5"
              >
                {editTarget ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
