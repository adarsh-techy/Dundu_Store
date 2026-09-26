import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Users,
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  Trash2,
  Search,
  X,
  Mail,
  Phone,
  Calendar,
  Lock,
  Check,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  RotateCcw,
  CreditCard,
  BarChart3,
  Wallet,
  Receipt,
  Shield,
} from 'lucide-react';
import { userApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime } from '../../../utils/format';

const PERMISSIONS = [
  {
    key: 'orders',
    label: 'Orders & Dispatch',
    desc: 'View, accept, dispatch, and manage online customer orders',
    icon: ShoppingBag,
  },
  {
    key: 'returns',
    label: 'Returns & Refunds',
    desc: 'Review return claims, coordinate reverse pickup, and issue refunds',
    icon: RotateCcw,
  },
  {
    key: 'reports',
    label: 'Finance & Analytics',
    desc: 'Access revenue metrics, profit reports, and financial breakdowns',
    icon: BarChart3,
  },
  {
    key: 'loyalty',
    label: 'Loyalty & Stamp Cards',
    desc: 'Manage customer loyalty stamps, reward tiers, and card policies',
    icon: CreditCard,
  },
  {
    key: 'wallet',
    label: 'Customer Wallets',
    desc: 'Inspect customer wallet balances and post manual ledger adjustments',
    icon: Wallet,
  },
  {
    key: 'billing',
    label: 'POS & Counter Billing',
    desc: 'Access offline cash register and physical branch checkout',
    icon: Receipt,
  },
];

function PermissionGrid({ value, onChange }) {
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((p) => p !== key) : [...value, key]);

  const selectAll = () => onChange(PERMISSIONS.map((p) => p.key));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Assigned Permissions ({value.length} of {PERMISSIONS.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Select All
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PERMISSIONS.map(({ key, label, desc, icon: Icon }) => {
          const checked = value.includes(key);
          return (
            <label
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                checked
                  ? 'border-indigo-600 bg-indigo-50/40 text-slate-900 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50/50'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                  checked
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                  <Icon className={`w-3.5 h-3.5 ${checked ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {desc}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function Admins() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin',
    permissions: PERMISSIONS.map((p) => p.key),
  });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const isCreatingSuperAdmin = form.role === 'super_admin';

  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-admins'],
    queryFn: userApi.listAdmins,
  });
  const admins = data?.data?.admins || [];

  // Filtered admins list
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = (a.name || '').toLowerCase().includes(q);
        const matchesEmail = (a.email || '').toLowerCase().includes(q);
        const matchesPhone = (a.phone || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      if (statusFilter === 'active' && a.is_blocked) return false;
      if (statusFilter === 'blocked' && !a.is_blocked) return false;
      return true;
    });
  }, [admins, search, roleFilter, statusFilter]);

  // Metric aggregates
  const superCount = admins.filter((a) => a.role === 'super_admin').length;
  const adminCount = admins.filter((a) => a.role === 'admin').length;
  const activeCount = admins.filter((a) => !a.is_blocked).length;
  const blockedCount = admins.filter((a) => a.is_blocked).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCreatingSuperAdmin && !form.permissions.length) {
      return toast.error('Grant at least one permission to the admin account');
    }
    setLoading(true);
    try {
      await userApi.createAdmin(form);
      toast.success(isCreatingSuperAdmin ? 'Super Administrator created' : 'Administrator created');
      setShowModal(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'admin',
        permissions: PERMISSIONS.map((p) => p.key),
      });
      qc.invalidateQueries(['admin-admins']);
    } catch (err) {
      toast.error(err.message || 'Failed to create administrator account');
    } finally {
      setLoading(false);
    }
  };

  const startEditPermissions = (admin) => {
    setEditingAdmin(admin);
    setEditPermissions(admin.permissions || []);
  };

  const saveEditPermissions = async () => {
    if (!editPermissions.length) {
      return toast.error('Grant at least one permission');
    }
    setEditLoading(true);
    try {
      await userApi.updateAdminPermissions(editingAdmin.id, editPermissions);
      toast.success('Permissions updated successfully');
      setEditingAdmin(null);
      qc.invalidateQueries(['admin-admins']);
    } catch (err) {
      toast.error(err.message || 'Failed to update permissions');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleBlock = async (admin) => {
    const verb = admin.is_blocked ? 'unblock' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${verb} ${admin.name}'s account?`)) return;
    setActioningId(admin.id);
    try {
      await userApi.blockAdmin(admin.id);
      toast.success(`Account ${admin.is_blocked ? 'unblocked' : 'suspended'}`);
      qc.invalidateQueries(['admin-admins']);
    } catch (err) {
      toast.error(err.message || 'Failed to toggle account status');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (admin) => {
    if (
      !window.confirm(
        `Permanently delete ${admin.name}'s administrator account? This action cannot be reversed.`
      )
    )
      return;
    setActioningId(admin.id);
    try {
      await userApi.deleteAdmin(admin.id);
      toast.success('Administrator account deleted');
      qc.invalidateQueries(['admin-admins']);
    } catch (err) {
      toast.error(err.message || 'Failed to delete administrator account');
    } finally {
      setActioningId(null);
    }
  };

  // Color generator for avatar initials
  const getAvatarBg = (name, isSuper) => {
    if (isSuper) return 'bg-slate-900 text-amber-400';
    const colors = [
      'bg-indigo-600 text-white',
      'bg-blue-600 text-white',
      'bg-emerald-600 text-white',
      'bg-violet-600 text-white',
      'bg-teal-600 text-white',
    ];
    if (!name) return colors[0];
    const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return colors[code % colors.length];
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Admin Accounts & Access Governance
              </h1>
              <p className="text-xs text-slate-500">
                Manage portal administrators, role privileges, and modular operational permissions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            title="Refresh accounts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Administrator
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Admins</p>
            <p className="text-xl font-bold text-slate-900">{admins.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Super Admins</p>
            <p className="text-xl font-bold text-slate-900">{superCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Operational Admins</p>
            <p className="text-xl font-bold text-slate-900">{adminCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Accounts</p>
            <p className="text-xl font-bold text-slate-900">
              {activeCount} <span className="text-xs font-normal text-slate-400">({blockedCount} blocked)</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin name, email, or phone…"
            className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-slate-50/50 hover:bg-white transition-all text-slate-800 placeholder-slate-400"
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
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-700 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admins</option>
            <option value="admin">Operational Admins</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="blocked">Blocked Only</option>
          </select>

          <div className="text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-2 rounded-xl">
            {filteredAdmins.length} of {admins.length}
          </div>
        </div>
      </div>

      {/* ── Administrators Table ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-400 font-medium">Loading administrator directory...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-14 text-center">#</th>
                  <th className="px-5 py-3.5">Administrator</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Permission Scope</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last Login / Joined</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <UserCog className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-800">No administrators found</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        {search || roleFilter !== 'all' || statusFilter !== 'all'
                          ? 'No administrator accounts match your current filter selections.'
                          : 'Get started by creating your first sub-administrator account using the button above.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((a, idx) => {
                    const isSelf = a.id === currentUser?.id;
                    const isSuper = a.role === 'super_admin';
                    const busy = actioningId === a.id;
                    const initials = (a.name || 'Admin')
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join('');

                    return (
                      <tr
                        key={a.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelf ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        <td className="px-5 py-4 text-center text-xs font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${getAvatarBg(
                                a.name,
                                isSuper
                              )}`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                <span>{a.name || 'Unnamed Admin'}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                {a.email && <span>{a.email}</span>}
                                {a.email && a.phone && <span>•</span>}
                                {a.phone && <span>{a.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-amber-300 shadow-2xs">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                              Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <UserCog className="w-3.5 h-3.5" />
                              Operational Admin
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                              <Shield className="w-3.5 h-3.5 text-emerald-600" />
                              Master Access (All Modules)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(a.permissions || []).length === 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  No permissions granted
                                </span>
                              ) : (
                                PERMISSIONS.filter((p) => (a.permissions || []).includes(p.key)).map(
                                  (p) => (
                                    <span
                                      key={p.key}
                                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                                    >
                                      {p.label}
                                    </span>
                                  )
                                )
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {a.is_blocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                              <Ban className="w-3 h-3" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {a.last_login_at ? (
                            <div>
                              <span className="font-medium text-slate-800 block">
                                {formatDateTime(a.last_login_at)}
                              </span>
                              <span className="text-[11px] text-slate-400">Last Session</span>
                            </div>
                          ) : a.created_at ? (
                            <div>
                              <span className="font-medium text-slate-700 block">
                                {formatDate(a.created_at)}
                              </span>
                              <span className="text-[11px] text-slate-400">Joined</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isSuper && (
                              <button
                                type="button"
                                onClick={() => startEditPermissions(a)}
                                title="Edit permissions"
                                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {!isSelf && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleToggleBlock(a)}
                                title={a.is_blocked ? 'Activate account' : 'Suspend account'}
                                className={`p-2 rounded-xl border border-transparent transition-colors disabled:opacity-40 ${
                                  a.is_blocked
                                    ? 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'
                                    : 'text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                                }`}
                              >
                                {a.is_blocked ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Ban className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}

                            {!isSelf && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDelete(a)}
                                title="Permanently delete admin"
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
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

      {/* ── Create Admin Modal ── */}
      {showModal && (
        <Modal
          size="lg"
          title="Create Administrator Account"
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Type Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                Administrator Role Privilege
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, role: 'admin' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    form.role === 'admin'
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <UserCog className="w-4 h-4 text-indigo-600" />
                    <span>Operational Admin</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Custom modular permissions; restricted to selected sections only.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, role: 'super_admin' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    form.role === 'super_admin'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        form.role === 'super_admin' ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    <span>Super Admin</span>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      form.role === 'super_admin' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Unrestricted master access to all financial, catalog & admin controls.
                  </p>
                </button>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. Rachel Adams"
                value={form.name}
                onChange={set('name')}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. rachel@dundu.store"
                value={form.email}
                onChange={set('email')}
                required
              />
              <Input
                label="Phone Number"
                placeholder="e.g. +91 98765 43210"
                value={form.phone}
                onChange={set('phone')}
              />
              <Input
                label="Access Password"
                type="password"
                placeholder="Create strong login password"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>

            {/* Modular Permissions Section */}
            {!isCreatingSuperAdmin && (
              <div className="pt-2 border-t border-slate-100">
                <PermissionGrid
                  value={form.permissions}
                  onChange={(v) => setForm((p) => ({ ...p, permissions: v }))}
                />
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5"
              >
                {isCreatingSuperAdmin ? 'Create Super Admin' : 'Create Administrator'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Permissions Modal ── */}
      {editingAdmin && (
        <Modal
          size="lg"
          title={`Edit Permissions — ${editingAdmin.name}`}
          onClose={() => setEditingAdmin(null)}
        >
          <div className="space-y-5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">{editingAdmin.name}</p>
                <p className="text-[11px] text-slate-400">{editingAdmin.email}</p>
              </div>
              <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md">
                Operational Admin
              </span>
            </div>

            <PermissionGrid
              value={editPermissions}
              onChange={setEditPermissions}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAdmin(null)}
                className="rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={editLoading}
                onClick={saveEditPermissions}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5"
              >
                Save Permission Updates
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
