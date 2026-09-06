import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { userApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const PERMISSIONS = [
  { key: 'orders', label: 'Orders' },
  { key: 'returns', label: 'Returns' },
  { key: 'loyalty', label: 'Loyalty Cards' },
  { key: 'reports', label: 'Sales Report' },
  { key: 'wallet', label: 'Wallets' },
];

function PermissionCheckboxes({ value, onChange }) {
  const toggle = (key) => onChange(
    value.includes(key) ? value.filter((p) => p !== key) : [...value, key]
  );
  return (
    <div className="grid grid-cols-2 gap-2">
      {PERMISSIONS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-300">
          <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)}
            className="rounded text-indigo-600 focus:ring-indigo-400" />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function Admins() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'admin', permissions: PERMISSIONS.map((p) => p.key) });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const isCreatingSuperAdmin = form.role === 'super_admin';

  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-admins'], queryFn: userApi.listAdmins });
  const admins = data?.data?.admins || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCreatingSuperAdmin && !form.permissions.length) return toast.error('Grant at least one permission');
    setLoading(true);
    try {
      await userApi.createAdmin(form);
      toast.success(isCreatingSuperAdmin ? 'Super admin created' : 'Admin created');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', password: '', role: 'admin', permissions: PERMISSIONS.map((p) => p.key) });
      qc.invalidateQueries(['admin-admins']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const startEditPermissions = (admin) => {
    setEditingAdmin(admin);
    setEditPermissions(admin.permissions || []);
  };

  const saveEditPermissions = async () => {
    if (!editPermissions.length) return toast.error('Grant at least one permission');
    setEditLoading(true);
    try {
      await userApi.updateAdminPermissions(editingAdmin.id, editPermissions);
      toast.success('Permissions updated');
      setEditingAdmin(null);
      qc.invalidateQueries(['admin-admins']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setEditLoading(false); }
  };

  const handleToggleBlock = async (admin) => {
    const verb = admin.is_blocked ? 'unblock' : 'block';
    if (!confirm(`${verb === 'block' ? 'Block' : 'Unblock'} ${admin.name}'s account?`)) return;
    setActioningId(admin.id);
    try {
      await userApi.blockAdmin(admin.id);
      toast.success(`Admin ${verb}ed`);
      qc.invalidateQueries(['admin-admins']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActioningId(null); }
  };

  const handleDelete = async (admin) => {
    if (!confirm(`Permanently delete ${admin.name}'s admin account? This cannot be undone.`)) return;
    setActioningId(admin.id);
    try {
      await userApi.deleteAdmin(admin.id);
      toast.success('Admin deleted');
      qc.invalidateQueries(['admin-admins']);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActioningId(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Accounts</h1>
          <p className="text-xs text-gray-400 mt-0.5">Online store admins &amp; super admins only — branch logins are managed from the offline app's Branches page.</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add Admin</Button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>{['Name', 'Email', 'Phone', 'Role', 'Permissions', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.length === 0
                ? <tr><td colSpan={7} className="text-center py-12 text-gray-400">No admins yet</td></tr>
                : admins.map((a) => {
                  const isSelf = a.id === currentUser?.id;
                  const busy = actioningId === a.id;
                  return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                          {a.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{a.name}</span>
                        {isSelf && <span className="text-[10px] text-gray-400">(you)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={a.role === 'super_admin' ? 'indigo' : 'blue'}>{a.role.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {a.role === 'super_admin' ? (
                        <span className="text-gray-400 text-xs">All access</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {(a.permissions || []).length === 0
                            ? <span className="text-xs text-red-500">None granted</span>
                            : PERMISSIONS.filter((p) => a.permissions.includes(p.key)).map((p) => (
                              <Badge key={p.key} color="gray">{p.label}</Badge>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={a.is_blocked ? 'red' : 'green'}>{a.is_blocked ? 'Blocked' : 'Active'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {a.role === 'admin' && (
                          <button type="button" onClick={() => startEditPermissions(a)} title="Edit permissions"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isSelf && (
                          <button type="button" disabled={busy} onClick={() => handleToggleBlock(a)}
                            title={a.is_blocked ? 'Unblock' : 'Block'}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40">
                            {a.is_blocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {!isSelf && (
                          <button type="button" disabled={busy} onClick={() => handleDelete(a)} title="Delete"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
        <Modal title="Add Admin" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Account Type</p>
              <div className="flex gap-2">
                {[
                  { key: 'admin', label: 'Admin' },
                  { key: 'super_admin', label: 'Super Admin' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: key }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.role === key
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {isCreatingSuperAdmin && (
                <p className="text-[10px] text-indigo-500 mt-1.5">Super admins get full access to every panel — no permission checklist needed.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" value={form.name} onChange={set('name')} required />
              <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
              <Input label="Phone" value={form.phone} onChange={set('phone')} />
              <Input label="Password" type="password" value={form.password} onChange={set('password')} required />
            </div>
            {!isCreatingSuperAdmin && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Permissions</p>
                <PermissionCheckboxes value={form.permissions} onChange={(v) => setForm((p) => ({ ...p, permissions: v }))} />
                <p className="text-[10px] text-gray-400 mt-1.5">Only these checked sections will be accessible to them.</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>{isCreatingSuperAdmin ? 'Create Super Admin' : 'Create Admin'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {editingAdmin && (
        <Modal title={`Edit Permissions — ${editingAdmin.name}`} onClose={() => setEditingAdmin(null)}>
          <div className="space-y-4">
            <PermissionCheckboxes value={editPermissions} onChange={setEditPermissions} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingAdmin(null)}>Cancel</Button>
              <Button type="button" loading={editLoading} onClick={saveEditPermissions}>Save Changes</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
