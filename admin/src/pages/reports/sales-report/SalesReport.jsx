import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsApi, branchApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import useAuthStore from '../../../store/auth.store';

function StatCard({ label, value, sub, color = 'indigo' }) {
  const colors = { indigo: 'bg-indigo-50 text-indigo-700', green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700' };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899'];

export default function SalesReport() {
  const { isSuperAdmin } = useAuthStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');

  const { data: branchData } = useQuery({ queryKey: ['admin-branches'], queryFn: branchApi.list, enabled: isSuperAdmin() });
  const branches = branchData?.data?.branches || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daily-report', date, branchId],
    queryFn: () => reportsApi.daily(date, branchId || undefined),
  });
  const report = data?.data;
  const summary = report?.summary || {};
  const hourlyData = (report?.hourly || []).map((h) => ({ hour: `${String(h.hour).padStart(2, '0')}:00`, revenue: parseFloat(h.revenue) }));
  const byPayment = report?.by_payment || [];
  const topProducts = report?.top_products || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Daily Sales Report</h1>
        <div className="flex gap-3 flex-wrap">
          {isSuperAdmin() && branches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={() => refetch()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? <Spinner /> : !report ? null : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Orders" value={summary.order_count || 0} color="indigo" />
            <StatCard label="Revenue" value={`₹${parseFloat(summary.revenue || 0).toFixed(0)}`} color="green" />
            <StatCard label="Cash" value={`₹${parseFloat(summary.cash_revenue || 0).toFixed(0)}`} color="amber" />
            <StatCard label="UPI" value={`₹${parseFloat(summary.upi_revenue || 0).toFixed(0)}`} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Hourly chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Hour</h2>
              {hourlyData.length === 0
                ? <p className="text-gray-400 text-sm text-center py-8">No data for this date</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>

            {/* Payment split */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Methods</h2>
              {byPayment.length === 0
                ? <p className="text-gray-400 text-sm text-center py-8">No data</p>
                : (
                  <div className="space-y-3">
                    {byPayment.map((p, i) => (
                      <div key={p.payment_method} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm capitalize text-gray-700">{p.payment_method}</span>
                          <span className="text-xs text-gray-400">({p.count})</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">₹{parseFloat(p.amount).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Top Products</h2>
            </div>
            {topProducts.length === 0
              ? <p className="text-gray-400 text-sm text-center py-8">No product data</p>
              : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-right">Units Sold</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.product_name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{p.qty_sold}</td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-600">₹{parseFloat(p.revenue).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}
    </div>
  );
}
