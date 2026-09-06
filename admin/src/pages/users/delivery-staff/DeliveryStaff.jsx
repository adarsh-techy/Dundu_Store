import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { deliveryStaffApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import { formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

export default function DeliveryStaff() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [actioningId, setActioningId] = useState(null);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const { data, isLoading } = useQuery({ queryKey: ['admin-delivery-staff'], queryFn: deliveryStaffApi.list });
  const staff = data?.data?.staff || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await deliveryStaffApi.create(form);
      toast.success('Delivery staff account created');
      setShowModal(false);
      setForm({ name: '', phone: '', email: '', password: '' });
      qc.invalidateQueries(['admin-delivery-staff']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleToggleBlock = async (s) => {
    const verb = s.is_blocked ? 'unblock' : 'block';
    if (!confirm(`${verb === 'block' ? 'Block' : 'Unblock'} ${s.name}'s account?`)) return;
    setActioningId(s.id);
    try {
      await deliveryStaffApi.toggleBlock(s.id);
      toast.success(`Delivery staff ${verb}ed`);
      qc.invalidateQueries(['admin-delivery-staff']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActioningId(null); }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Permanently delete ${s.name}'s delivery staff account? This cannot be undone.`)) return;
    setActioningId(s.id);
    try {
      await deliveryStaffApi.remove(s.id);
      toast.success('Delivery staff deleted');
      qc.invalidateQueries(['admin-delivery-staff']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActioningId(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Delivery Staff</h1>
          <p className="text-xs text-gray-400 mt-0.5">Accounts that log into the mobile app's delivery role — hub pickup &amp; last-mile delivery for Dundu Delivery orders.</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add Delivery Staff</Button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>{['Name', 'Phone', 'Email', 'Joined', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.length === 0
                ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">No delivery staff yet</td></tr>
                : staff.map((s) => {
                  const busy = actioningId === s.id;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                            {s.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3">
                        <Badge color={s.is_blocked ? 'red' : 'green'}>{s.is_blocked ? 'Blocked' : 'Active'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" disabled={busy} onClick={() => handleToggleBlock(s)}
                            title={s.is_blocked ? 'Unblock' : 'Block'}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40">
                            {s.is_blocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </button>
                          <button type="button" disabled={busy} onClick={() => handleDelete(s)} title="Delete"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add Delivery Staff" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" value={form.name} onChange={set('name')} required />
              <Input label="Phone" value={form.phone} onChange={set('phone')} required />
              <Input label="Email (optional)" type="email" value={form.email} onChange={set('email')} />
              <Input label="Password" type="password" value={form.password} onChange={set('password')} required />
            </div>
            <p className="text-[10px] text-gray-400">They log into the same mobile app with these credentials and see the delivery screens instead of the shopping app.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>Create Account</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
