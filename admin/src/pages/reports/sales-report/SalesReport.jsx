import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart3,
  Calendar,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Clock,
  Award,
  CreditCard,
  Banknote,
  Globe,
  Smartphone,
  Package,
  Layers,
  Percent
} from 'lucide-react';
import { reportsApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';

const PAYMENT_META = {
  cod:     { label: 'Cash on Delivery', icon: Banknote },
  online:  { label: 'Online Payment (Razorpay)', icon: Globe },
  wallet:  { label: 'Dundu Wallet', icon: Wallet },
  cash:    { label: 'Cash Payment', icon: Banknote },
  upi:     { label: 'UPI Direct', icon: Smartphone },
  card:    { label: 'Credit / Debit Card', icon: CreditCard },
};

const getPaymentMeta = (method) => PAYMENT_META[method] || {
  label: method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Other',
  icon: CreditCard,
};

const formatINR = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function SalesReport() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yestStr = yestDate.toISOString().slice(0, 10);

  const [date, setDate] = useState(todayStr);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['daily-report', date],
    queryFn: () => reportsApi.daily(date),
  });

  const report = data?.data;
  const summary = report?.summary || {};
  const hourlyData = (report?.hourly || []).map((h) => ({
    hour: `${String(h.hour).padStart(2, '0')}:00`,
    revenue: parseFloat(h.revenue || 0),
    orders: parseInt(h.orders || 0, 10),
  }));
  const byPayment = report?.by_payment || [];
  const topProducts = report?.top_products || [];

  const orderCount = Number(summary.order_count || 0);
  const revenue = parseFloat(summary.revenue || 0);
  const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

  const peakHour = hourlyData.reduce(
    (best, h) => (h.revenue > (best?.revenue || 0) ? h : best),
    null
  );

  const fullDateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Daily Analytics
            </span>
            <span className="text-xs font-medium text-slate-500">
              {fullDateLabel}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            Daily Sales Report
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time breakdown of revenue, order volumes, hourly spikes, and payment collections.
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Date Pills */}
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDate(yestStr)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                date === yestStr
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                date === todayStr
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-slate-900 shadow-xs"
            />
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full flex items-center justify-center py-32 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <Spinner size="lg" />
        </div>
      ) : orderCount === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No Sales Recorded on {fullDateLabel}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There were no customer checkouts logged on this date. Select another date or view today's live activity.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDate(todayStr)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              View Today
            </button>
            <button
              type="button"
              onClick={() => setDate(yestStr)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              View Yesterday
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Gross Sales Revenue */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(revenue)}</p>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">Non-cancelled order totals</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            {/* KPI 2: Total Orders */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders Placed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{orderCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">Completed checkout baskets</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>

            {/* KPI 3: Average Order Value (AOV) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Basket (AOV)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(avgOrderValue)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Revenue ÷ order count</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                <Wallet className="h-6 w-6" />
              </div>
            </div>

            {/* KPI 4: Peak Trading Window */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peak Hour</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {peakHour ? peakHour.hour : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[130px]">
                  {peakHour ? `${formatINR(peakHour.revenue)} peak` : 'Even pace'}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Visual Charts Row: Hourly Sales & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Hourly Sales Bar Chart (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Revenue by Hour</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order volume distribution throughout the 24-hour day
                  </p>
                </div>
                {peakHour && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    Busiest: {peakHour.hour} ({formatINR(peakHour.revenue)})
                  </span>
                )}
              </div>

              {hourlyData.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  No hourly records for this date
                </div>
              ) : (
                <div className="w-full h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${v}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(val, name, item) => [
                          `${formatINR(val)} (${item.payload.orders || 0} orders)`,
                          'Sales Revenue',
                        ]}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '16px',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          padding: '10px 14px',
                        }}
                        itemStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#0F172A"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Payment Methods Split (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">Payment Methods Breakdown</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Share of collections by payment gateway & mode
                </p>
              </div>

              {byPayment.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  No payment records for this date
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {byPayment.map((p) => {
                    const meta = getPaymentMeta(p.payment_method);
                    const Icon = meta.icon;
                    const amount = parseFloat(p.amount || 0);
                    const pct = revenue > 0 ? Math.round((amount / revenue) * 100) : 0;
                    return (
                      <div key={p.payment_method} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-semibold text-slate-800">{meta.label}</span>
                            <span className="text-[11px] text-slate-400">({p.count} orders)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900">{formatINR(amount)}</span>
                            <span className="text-[11px] font-semibold text-slate-400 ml-1.5">
                              {pct}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-slate-900 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top Selling Products Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Top Selling Products</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Best performing items ranked by total sales revenue for {fullDateLabel}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {topProducts.length} Products Sold
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No product sales logged on this date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3.5 px-6 w-16 text-center">Rank</th>
                      <th className="py-3.5 px-6">Product Title</th>
                      <th className="py-3.5 px-6 text-center">Units Sold</th>
                      <th className="py-3.5 px-6 text-right">Revenue Contribution</th>
                      <th className="py-3.5 px-6 text-right w-36">Sales Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.map((p, idx) => {
                      const prodRev = parseFloat(p.revenue || 0);
                      const sharePct = revenue > 0 ? Math.round((prodRev / revenue) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                                idx === 0
                                  ? 'bg-slate-900 text-white'
                                  : idx === 1
                                  ? 'bg-slate-200 text-slate-800'
                                  : idx === 2
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <p className="font-semibold text-slate-900">{p.product_name}</p>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="font-bold text-slate-800">{p.qty_sold}</span>
                            <span className="text-xs text-slate-400 ml-1">pcs</span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span className="font-bold text-slate-900">{formatINR(prodRev)}</span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {sharePct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
