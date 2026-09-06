import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { couponApi, settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input, { Select } from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  code: '', discount_type: 'percentage', discount_value: '',
  min_order_value: '', max_discount: '', usage_limit: '', expires_at: '', is_active: true,
};

function toFormValues(coupon) {
  return {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: String(coupon.discount_value),
    min_order_value: coupon.min_order_value > 0 ? String(coupon.min_order_value) : '',
    max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
    usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
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

  const { data, isLoading } = useQuery({ queryKey: ['admin-coupons'], queryFn: couponApi.list });
  const { data: settingsData } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = settingsData?.data?.settings || {};
  const couponFieldEnabled = settings.coupon_field_enabled !== 'false' && settings.coupon_field_enabled !== false;

  async function handleToggleCouponField() {
    setTogglingField(true);
    try {
      await settingsApi.update({ coupon_field_enabled: !couponFieldEnabled });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Coupon field ${!couponFieldEnabled ? 'shown' : 'hidden'} on checkout`);
    } catch { toast.error('Failed to update'); }
    finally { setTogglingField(false); }
  }
  const coupons = data?.data?.coupons || [];
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

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
      if (editTarget) {
        await couponApi.update(editTarget.id, form);
        toast.success('Coupon updated');
      } else {
        await couponApi.create(form);
        toast.success('Coupon created');
      }
      closeModal();
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    setDeletingId(coupon.id);
    try {
      await couponApi.remove(coupon.id);
      toast.success('Coupon deleted');
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-pink-600">Coupons</h1>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Coupon</Button>
      </div>

      {/* Coupon field visibility toggle */}
      <div className={`flex items-center justify-between p-4 rounded-2xl border ${
        couponFieldEnabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          <Tag className={`h-5 w-5 ${couponFieldEnabled ? 'text-green-600' : 'text-red-500'}`} />
          <div>
            <p className="font-semibold text-sm text-gray-800">Coupon Field on Checkout</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {couponFieldEnabled
                ? 'Customers can enter coupon codes at checkout'
                : '🚫 Hidden — customers cannot apply coupons at checkout'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            couponFieldEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {couponFieldEnabled ? 'Visible' : 'Hidden'}
          </span>
          <button
            type="button"
            onClick={handleToggleCouponField}
            disabled={togglingField}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              couponFieldEnabled ? 'bg-green-500' : 'bg-gray-300'
            } ${togglingField ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 ${
              couponFieldEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-green-50 text-xs text-pink-700 uppercase tracking-wide">
              <tr>{['Code', 'Discount', 'Min Order', 'Used', 'Expires', 'Status', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.length === 0
                ? <tr><td colSpan={7} className="text-center py-12 text-gray-400">No coupons yet</td></tr>
                : coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold tracking-wider text-indigo-700">{c.code}</td>
                    <td className="px-4 py-3">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}
                      {c.max_discount ? <span className="text-xs text-gray-400 ml-1">(max ₹{c.max_discount})</span> : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.min_order_value > 0 ? `₹${c.min_order_value}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                    <td className="px-4 py-3 text-gray-500">{c.expires_at ? formatDate(c.expires_at) : 'Never'}</td>
                    <td className="px-4 py-3">
                      <Badge color={c.is_active ? 'green' : 'red'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editTarget ? 'Edit Coupon' : 'Create Coupon'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Coupon Code" value={form.code} onChange={set('code')} placeholder="SAVE20" required className="uppercase" />
              <Select label="Discount Type" value={form.discount_type} onChange={set('discount_type')}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </Select>
              <Input label="Discount Value" type="number" value={form.discount_value} onChange={set('discount_value')} required />
              <Input label="Min Order (₹)" type="number" value={form.min_order_value} onChange={set('min_order_value')} />
              <Input label="Max Discount (₹)" type="number" value={form.max_discount} onChange={set('max_discount')} />
              <Input label="Usage Limit" type="number" value={form.usage_limit} onChange={set('usage_limit')} />
              <div className="col-span-2">
                <Input label="Expires At" type="datetime-local" value={form.expires_at} onChange={set('expires_at')} />
              </div>
              {editTarget && (
                <div className="col-span-2 flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-500">{form.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" loading={loading}>{editTarget ? 'Save Changes' : 'Create Coupon'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
