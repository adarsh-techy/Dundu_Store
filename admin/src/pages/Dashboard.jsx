import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, IndianRupee,
  AlertTriangle, Clock, Package, Users, UserCheck, ShoppingCart, RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { dashboardApi } from '../api';
import Spinner from '../components/ui/Spinner';
import { formatPrice, formatDate } from '../utils/format';

const statusColor = {
  pending:   'bg-amber-100 text-amber-700',
  packed:    'bg-blue-100 text-blue-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  returned:  'bg-gray-100 text-gray-600',
  return_requested: 'bg-orange-100 text-orange-700',
};

function KpiCard({ title, value, sub, icon: Icon, from, to, onClick }) {
  const cls = `rounded-2xl p-5 bg-gradient-to-br ${from} ${to} text-white shadow-sm ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`;
  return (
    <div className={cls} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{title}</p>
          <p className="text-3xl font-extrabold mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
        </div>
        <div className="bg-white/20 rounded-xl p-2.5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 rounded-xl px-4 py-3 border ${color} hover:opacity-90 transition-opacity text-left`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs mt-0.5 opacity-80">{label}</p>
      </div>
    </button>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-2.5 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-indigo-600">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-base font-extrabold text-gray-800 tracking-tight">{children}</h2>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', date],
    queryFn: () => dashboardApi.get(date),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const d = data?.data || {};

  const chartData = (d.revenue_chart || []).map((r) => ({
    date:   new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    online: parseFloat(r.revenue),
  }));

  const totalOnline = chartData.reduce((s, r) => s + r.online, 0);

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isToday = date === todayStr;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Good day, Admin</h1>
          <p className="text-sm text-gray-400 mt-0.5">{displayDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={todayStr}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 text-gray-700"
          />
          {!isToday && (
            <button onClick={() => setDate(todayStr)} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">Today</button>
          )}
          <span className="text-xs bg-pink-50 text-pink-600 border border-pink-200 px-3 py-1 rounded-full font-semibold">Dundu Dashboard</span>
        </div>
      </div>

      {/* Online Store KPIs */}
      <div>
        <SectionHeading>Overview</SectionHeading>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Total Revenue"
            value={formatPrice(d.total_sales || 0)}
            sub="All-time paid"
            icon={IndianRupee}
            from="from-indigo-500" to="to-indigo-700"
          />
          <KpiCard
            title="Total Orders"
            value={d.total_orders ?? 0}
            sub="All-time"
            icon={ShoppingBag}
            from="from-indigo-400" to="to-violet-600"
          />
          <KpiCard
            title="Today's Revenue"
            value={formatPrice(d.today_sales || 0)}
            sub="Today's online sales"
            icon={TrendingUp}
            from="from-violet-500" to="to-indigo-700"
          />
          <KpiCard
            title="Today's Orders"
            value={d.today_orders ?? 0}
            sub="Orders placed today"
            icon={Package}
            from="from-indigo-500" to="to-purple-600"
          />
        </div>
      </div>

      {/* Mini Alert Stats */}
      <div className="flex gap-3">
        <MiniStat
          label="Pending Orders"
          value={d.pending_orders ?? 0}
          icon={Clock}
          color="bg-amber-50 border-amber-200 text-amber-700"
          onClick={() => navigate('/orders?status=pending')}
        />
        <MiniStat
          label="Low Stock Items"
          value={d.low_stock ?? 0}
          icon={AlertTriangle}
          color="bg-red-50 border-red-200 text-red-600"
          onClick={() => navigate('/products?low_stock=1')}
        />
        <MiniStat
          label="Total Returns"
          value={d.total_returns ?? 0}
          icon={RotateCcw}
          color="bg-orange-50 border-orange-200 text-orange-700"
          onClick={() => navigate('/returns')}
        />
        <MiniStat
          label="Today's Returns"
          value={d.today_returns ?? 0}
          icon={RotateCcw}
          color="bg-red-50 border-red-200 text-red-600"
          onClick={() => navigate('/returns')}
        />
      </div>

      {/* Customer Insights */}
      <div>
        <SectionHeading>Customer Insights</SectionHeading>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <MiniStat
            label="Total Users"
            value={d.total_users ?? 0}
            icon={Users}
            color="bg-violet-50 border-violet-200 text-violet-700"
            onClick={() => navigate('/users')}
          />
          <MiniStat
            label="Today's Logins"
            value={d.today_logins ?? 0}
            icon={UserCheck}
            color="bg-emerald-50 border-emerald-200 text-emerald-700"
          />
          <MiniStat
            label="Planning to Order"
            value={d.cart_users ?? 0}
            icon={ShoppingCart}
            color="bg-blue-50 border-blue-200 text-blue-700"
            onClick={() => navigate('/carts')}
          />
          <MiniStat
            label="Return-Based Users"
            value={d.return_users ?? 0}
            icon={RotateCcw}
            color="bg-red-50 border-red-200 text-red-700"
            onClick={() => navigate('/returns')}
          />
        </div>
      </div>

      {/* Revenue Chart + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Revenue — Last 30 Days</h2>
              <p className="text-xs text-gray-400 mt-0.5">Daily paid online order totals</p>
            </div>
            <p className="font-semibold text-indigo-600 text-xs">{formatPrice(totalOnline)}</p>
          </div>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="online" stroke="#6366f1" strokeWidth={2.5} fill="url(#onlineGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Top Products</h2>
          {(!d.top_products || d.top_products.length === 0) ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>
          ) : (
            <div className="space-y-3">
              {d.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      : <Package className="h-4 w-4 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.units_sold} sold · {p.stock} left</p>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">#{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div>
        <SectionHeading>Order Status Breakdown</SectionHeading>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {(!d.order_status_breakdown || d.order_status_breakdown.length === 0) ? (
            <div className="h-24 flex items-center justify-center text-gray-300 text-sm">No data</div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {d.order_status_breakdown.map((s) => {
                const total = d.order_status_breakdown.reduce((sum, x) => sum + parseInt(x.count), 0);
                const pct = total > 0 ? Math.round((parseInt(s.count) / total) * 100) : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColor[s.status] || 'bg-gray-100 text-gray-600'}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-gray-700">{s.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category Sales */}
      <div>
        <SectionHeading>Category Sales</SectionHeading>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Bar Chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-800 mb-1">Revenue by Category</p>
            <p className="text-xs text-gray-400 mb-4">All-time paid orders</p>
            {(!d.category_sales || d.category_sales.every(c => parseFloat(c.revenue) === 0)) ? (
              <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No sales data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.category_sales.filter(c => parseFloat(c.revenue) > 0)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={42} />
                  <Tooltip
                    formatter={(value, name) => [formatPrice(value), 'Revenue']}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {(d.category_sales.filter(c => parseFloat(c.revenue) > 0)).map((_, i) => {
                      const colors = ['#6366f1','#ec4899','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ef4444','#14b8a6'];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ranked Table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-800 mb-4">Ranking</p>
            {(!d.category_sales || d.category_sales.length === 0) ? (
              <p className="text-xs text-gray-300 text-center py-8">No data</p>
            ) : (
              <div className="space-y-3">
                {d.category_sales.map((c, i) => {
                  const colors = ['bg-indigo-500','bg-pink-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-blue-500','bg-red-500','bg-teal-500'];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full ${colors[i % colors.length]} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{c.category}</p>
                        <p className="text-[10px] text-gray-400">{c.orders} orders · {c.units_sold} units</p>
                      </div>
                      <span className="text-xs font-bold text-gray-700 shrink-0">{formatPrice(c.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Best Sellers */}
      <div>
        <SectionHeading>Best Sellers</SectionHeading>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Category',     key: 'top_categories',     color: 'text-indigo-600', bg: 'bg-indigo-50',  bar: 'bg-indigo-400' },
            { label: 'Sub-Category', key: 'top_sub_categories', color: 'text-pink-600',   bg: 'bg-pink-50',    bar: 'bg-pink-400'   },
            { label: 'Type',         key: 'top_types',          color: 'text-violet-600', bg: 'bg-violet-50',  bar: 'bg-violet-400' },
            { label: 'Pattern',      key: 'top_patterns',       color: 'text-teal-600',   bg: 'bg-teal-50',    bar: 'bg-teal-400'   },
          ].map(({ label, key, color, bg, bar }) => {
            const rows = d[key] || [];
            const max = rows[0]?.units_sold || 1;
            return (
              <div key={key} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${color}`}>{label}</p>
                {rows.length === 0 ? (
                  <p className="text-xs text-gray-300 py-4 text-center">No data</p>
                ) : (
                  <div className="space-y-2.5">
                    {rows.map((r, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[70%]">{r.name}</span>
                          <span className="text-[10px] font-bold text-gray-500">{r.units_sold} sold</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${bar} rounded-full`} style={{ width: `${Math.round((r.units_sold / max) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Recent Orders</h2>
          <button onClick={() => navigate('/orders')} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View all →</button>
        </div>
        {(!d.recent_orders || d.recent_orders.length === 0) ? (
          <div className="py-12 text-center text-gray-300 text-sm">No orders yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Order', 'Customer', 'Phone', 'Date', 'Amount', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-pink-700 bg-pink-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {d.recent_orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3 font-semibold text-indigo-600 text-xs">#{o.order_number}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(o.user_name || 'W')[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700 truncate max-w-[100px]">{o.user_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{o.user_phone || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{formatDate(o.created_at)}</td>
                  <td className="px-5 py-3 text-xs font-bold text-gray-800">{formatPrice(o.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor[o.status] || 'bg-gray-100 text-gray-500'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
