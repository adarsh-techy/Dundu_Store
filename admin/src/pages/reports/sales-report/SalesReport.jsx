import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  BarChart3, Calendar, RefreshCw, ShoppingBag, TrendingUp, Wallet,
  Clock, Award, PieChart, Banknote, Globe, CreditCard, Smartphone, Package,
} from 'lucide-react';
import { reportsApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';

/* ── Payment method display metadata — maps whatever payment_method values
   actually occur (cod / online today, plus legacy cash/upi/card from before
   the online↔offline split) to a friendly label, icon and color. ── */
const PAYMENT_META = {
  cod:    { label: 'Cash on Delivery', icon: Banknote,   color: 'amber' },
  online: { label: 'Online Payment',   icon: Globe,      color: 'indigo' },
  wallet: { label: 'Wallet',           icon: Wallet,     color: 'purple' },
  cash:   { label: 'Cash',             icon: Banknote,   color: 'amber' },
  upi:    { label: 'UPI',              icon: Smartphone, color: 'blue' },
  card:   { label: 'Card',             icon: CreditCard, color: 'purple' },
};
const getPaymentMeta = (method) => PAYMENT_META[method] || {
  label: method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Other',
  icon: CreditCard,
  color: 'gray',
};

const COLOR_TOKENS = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  bar: 'bg-indigo-500',  grad: 'from-indigo-50 to-white' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', bar: 'bg-emerald-500', grad: 'from-emerald-50 to-white' },
  blue:    { bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     bar: 'bg-sky-500',     grad: 'from-sky-50 to-white' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   bar: 'bg-amber-500',   grad: 'from-amber-50 to-white' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200',  bar: 'bg-purple-500',  grad: 'from-purple-50 to-white' },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',    bar: 'bg-gray-400',    grad: 'from-gray-50 to-white' },
};

const formatINR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/* ── KPI Card (soft tinted background) ── */
function KpiCard({ label, value, sub, icon: Icon, color = 'indigo' }) {
  const c = COLOR_TOKENS[color] || COLOR_TOKENS.indigo;
  return (
    <div className={`bg-gradient-to-br ${c.grad} rounded-3xl p-5 border ${c.border} shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
        {Icon && (
          <div className={`p-2 rounded-xl bg-white ${c.text} border ${c.border} shadow-xs shrink-0`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 mt-3 tracking-tight">{value}</p>
      {sub && <p className={`text-[11px] mt-1 font-semibold ${c.text}`}>{sub}</p>}
    </div>
  );
}

export default function SalesReport() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yestStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['daily-report', date],
    queryFn: () => reportsApi.daily(date),
  });
  const report = data?.data;
  const summary = report?.summary || {};
  const hourlyData = (report?.hourly || []).map((h) => ({ hour: `${String(h.hour).padStart(2, '0')}:00`, revenue: parseFloat(h.revenue) }));
  const byPayment = report?.by_payment || [];
  const topProducts = report?.top_products || [];

  const orderCount = Number(summary.order_count || 0);
  const revenue = parseFloat(summary.revenue || 0);
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

  const peakHour = hourlyData.reduce((best, h) => (h.revenue > (best?.revenue || 0) ? h : best), null);
  const topPaymentEntry = byPayment.reduce((best, p) => (parseFloat(p.amount) > parseFloat(best?.amount || 0) ? p : best), null);

  const fullDateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-6 pb-8">
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-emerald-50/60 p-6 sm:p-8 rounded-3xl border border-indigo-100 shadow-[0_8px_30px_rgb(79,70,229,0.08)]">
        <div className="absolute -top-20 -right-16 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-14 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-white/80 backdrop-blur-sm border border-indigo-200 text-indigo-600 rounded-2xl shadow-xs shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daily Sales Report</h1>
              <p className="text-xs text-gray-600 font-medium mt-0.5">{fullDateLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm p-1 rounded-xl border border-indigo-200">
              <button
                type="button"
                onClick={() => setDate(yestStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  date === yestStr ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-indigo-50'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  date === todayStr ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-indigo-50'
                }`}
              >
                Today
              </button>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayStr}
                className="pl-8 pr-3 py-2 bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl border border-gray-200/90 py-16 flex items-center justify-center">
          <Spinner />
        </div>
      ) : !report || orderCount === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/90 py-16 text-center">
          <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-bold text-sm">No sales recorded on {fullDateLabel}</p>
          <p className="text-xs text-gray-400 mt-1">Try picking a different date, or check back after orders come in.</p>
        </div>
      ) : (
        <>
          {/* KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total Orders" value={orderCount} sub={`Placed on ${shortDateLabel}`} icon={ShoppingBag} color="indigo" />
            <KpiCard label="Total Revenue" value={formatINR(revenue)} sub="Across all payment methods" icon={TrendingUp} color="emerald" />
            <KpiCard label="Avg Order Value" value={formatINR(avgOrderValue)} sub="Revenue ÷ orders" icon={Wallet} color="blue" />
          </div>

          {/* Key Insights strip */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Key Insights</span>
            {peakHour && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Busiest hour: <strong className="text-gray-900">{peakHour.hour}</strong> ({formatINR(peakHour.revenue)})
              </span>
            )}
            {topPaymentEntry && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                Top payment method: <strong className="text-gray-900">{getPaymentMeta(topPaymentEntry.payment_method).label}</strong>
                {' '}({revenue > 0 ? Math.round((parseFloat(topPaymentEntry.amount) / revenue) * 100) : 0}%)
              </span>
            )}
            {topProducts[0] && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Package className="h-3.5 w-3.5 text-emerald-500" />
                Best seller: <strong className="text-gray-900">{topProducts[0].product_name}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Hourly chart */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/90 p-6">
              <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Revenue by Hour</h2>
                  <p className="text-[11px] text-gray-400">When orders came in throughout the day</p>
                </div>
              </div>
              {hourlyData.length === 0
                ? <p className="text-gray-400 text-sm text-center py-12">No hourly data for this date</p>
                : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `₹${v}`} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v) => [formatINR(v), 'Revenue']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                        cursor={{ fill: '#eef2ff' }}
                      />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>

            {/* Payment split */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/90 p-6">
              <div className="flex items-center gap-3 pb-3 mb-4 border-b border-gray-100">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-xl border border-pink-200">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Payment Methods</h2>
                  <p className="text-[11px] text-gray-400">Share of the day's revenue</p>
                </div>
              </div>
              {byPayment.length === 0
                ? <p className="text-gray-400 text-sm text-center py-12">No data</p>
                : (
                  <div className="space-y-4">
                    {byPayment.map((p) => {
                      const meta = getPaymentMeta(p.payment_method);
                      const c = COLOR_TOKENS[meta.color] || COLOR_TOKENS.gray;
                      const amount = parseFloat(p.amount);
                      const pct = revenue > 0 ? Math.round((amount / revenue) * 100) : 0;
                      return (
                        <div key={p.payment_method}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                              <span className={`p-1 rounded-lg ${c.bg} ${c.text}`}>
                                <meta.icon className="w-3 h-3" />
                              </span>
                              {meta.label}
                              <span className="text-[10px] text-gray-400 font-medium">({p.count})</span>
                            </span>
                            <span className="text-xs font-black text-gray-900">{formatINR(amount)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/90 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Top Products</h2>
                <p className="text-[11px] text-gray-400">Best sellers for {shortDateLabel}</p>
              </div>
            </div>
            {topProducts.length === 0
              ? <p className="text-gray-400 text-sm text-center py-12">No product data</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">#</th>
                        <th className="px-4 py-3 text-left">Product</th>
                        <th className="px-4 py-3 text-right">Units Sold</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {topProducts.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                              i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-800">{p.product_name}</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-medium">{p.qty_sold}</td>
                          <td className="px-4 py-3 text-right font-black text-indigo-600">{formatINR(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </>
      )}
    </div>
  );
}
