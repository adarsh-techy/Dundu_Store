import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Ban, CheckCircle2, Trash2, Bike, Search, Phone, Mail,
  Calendar, Package, Truck, UserCheck, UserX, RefreshCw, X, Shield,
} from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [actioningId, setActioningId] = useState(null);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-delivery-staff'],
    queryFn: deliveryStaffApi.list,
  });
  const staff = data?.data?.staff || [];

  // Filtered staff based on search and status
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const matchSearch =
        !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search) ||
        s.email?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        !statusFilter ||
        (statusFilter === 'active' && !s.is_blocked) ||
        (statusFilter === 'blocked' && s.is_blocked);

      return matchSearch && matchStatus;
    });
  }, [staff, search, statusFilter]);

  // Overall fleet stats
  const stats = useMemo(() => {
    let active = 0;
    let blocked = 0;
    let totalDeliveries = 0;
    let totalPickups = 0;

    staff.forEach((s) => {
      if (s.is_blocked) blocked++;
      else active++;
      totalDeliveries += parseInt(s.total_deliveries || 0, 10);
      totalPickups += parseInt(s.total_pickups || 0, 10);
    });

    return { total: staff.length, active, blocked, totalDeliveries, totalPickups };
  }, [staff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await deliveryStaffApi.create(form);
      toast.success('Delivery staff account created successfully');
      setShowModal(false);
      setForm({ name: '', phone: '', email: '', password: '' });
      qc.invalidateQueries({ queryKey: ['admin-delivery-staff'] });
    } catch (err) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (s) => {
    const verb = s.is_blocked ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${verb} ${s.name}'s account?`)) return;
    setActioningId(s.id);
    try {
      await deliveryStaffApi.toggleBlock(s.id);
      toast.success(`Delivery agent ${verb}ed successfully`);
      qc.invalidateQueries({ queryKey: ['admin-delivery-staff'] });
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (s) => {
    if (
      !confirm(
        `Permanently delete ${s.name}'s delivery staff account? Associated order assignments will be unlinked. This cannot be undone.`
      )
    )
      return;
    setActioningId(s.id);
    try {
      await deliveryStaffApi.remove(s.id);
      toast.success('Delivery staff account deleted');
      qc.invalidateQueries({ queryKey: ['admin-delivery-staff'] });
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── 1. Top Executive Command Header ──────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Delivery Staff & Fleet
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {stats.total} Agent{stats.total !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage field personnel accounts, mobile delivery app authentication, and track dispatch fulfillment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Fleet"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl shadow-sm text-xs"
          >
            <Plus className="h-4 w-4" /> Add Delivery Agent
          </Button>
        </div>
      </div>

      {/* ── 2. Real-Time Fleet Metric Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{stats.total}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Agents</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">{stats.active}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Authorized</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-rose-700">{stats.blocked}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blocked / Suspended</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-indigo-700">{stats.totalDeliveries}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Dispatches</p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Strip ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name, phone, email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5">
          {[
            ['', 'All Fleet'],
            ['active', 'Active'],
            ['blocked', 'Blocked'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === val
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Full-Width Delivery Staff Table ───────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading delivery fleet records...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Delivery Agent</th>
                  <th className="px-5 py-3.5">Contact Number</th>
                  <th className="px-5 py-3.5">Email Address</th>
                  <th className="px-5 py-3.5 text-center">Hub Pickups</th>
                  <th className="px-5 py-3.5 text-center">Completed Deliveries</th>
                  <th className="px-5 py-3.5">Onboarded</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-slate-400 text-xs">
                      <Bike className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      No delivery staff found matching the filter criteria
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => {
                    const busy = actioningId === s.id;
                    const initials = s.name ? s.name.charAt(0).toUpperCase() : 'D';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{s.name}</p>
                              <span className="text-[10px] text-slate-400 font-medium">Field Rider</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {s.phone ? (
                            <a
                              href={`tel:${s.phone}`}
                              className="hover:text-emerald-700 hover:underline flex items-center gap-1.5"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              {s.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-slate-600">
                          {s.email ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {s.email}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 text-[11px]">
                            {s.total_pickups || 0}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                            {s.total_deliveries || 0}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                          {formatDate(s.created_at)}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              s.is_blocked
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.is_blocked ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                            />
                            {s.is_blocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleToggleBlock(s)}
                              title={s.is_blocked ? 'Unblock Agent' : 'Block Agent Access'}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                                s.is_blocked
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              {s.is_blocked ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDelete(s)}
                              title="Delete Agent"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* ── Add Delivery Staff Modal ── */}
      {showModal && (
        <Modal title="Onboard New Delivery Agent" onClose={() => setShowModal(false)} size="md">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-slate-600 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs mb-1">
                <Shield className="h-4 w-4 text-indigo-600" /> Mobile Delivery Role Credentials
              </div>
              Delivery agents log into the mobile app using their phone number and password to access warehouse hub scan-in, parcel pickup QR, and customer last-mile completion workflows.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Rahul Sharma"
                required
              />
              <Input
                label="Phone Number (Login ID) *"
                value={form.phone}
                onChange={set('phone')}
                placeholder="e.g. 9876543210"
                required
              />
              <Input
                label="Email Address (Optional)"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="e.g. rahul@example.com"
              />
              <Input
                label="Mobile App Password *"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Create strong password"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={loading} className="px-5 shadow-sm">
                Create Agent Account
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
