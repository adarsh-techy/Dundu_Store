import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeft, Package, Pencil, Gauge, CalendarDays } from 'lucide-react';
import { inventoryApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate, formatDateTime } from '../../../utils/format';
import Badge from './Badge';
import { RESULT_BADGE, SPEED_BADGE } from './badges';

const money = (n) => (n === null || n === undefined ? '—' : formatPrice(n));

function Box({ label, value, sub, tone = 'text-slate-900' }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`text-xl font-extrabold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const profitTone = (n) => (n === null ? 'text-slate-400' : n < 0 ? 'text-rose-600' : n > 0 ? 'text-emerald-600' : 'text-slate-500');

export default function StockCheckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-check', id],
    queryFn: () => inventoryApi.stockCheckProduct(id),
  });

  if (isLoading) return <Spinner />;
  const d = data?.data;
  if (isError || !d) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-sm text-slate-500">
        Product not found. <Link to="/stock-check" className="text-slate-900 font-semibold underline">Back to Stock Check</Link>
      </div>
    );
  }

  const p = d.product;
  const perPieceProfit = p.cost_price === null ? null : p.sell_price - p.cost_price;
  const chart = d.daily_sales.map((r) => ({ ...r, label: formatDate(r.date).replace(/ \d{4}$/, '') }));

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/stock-check')} title="Back" className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="h-5 w-5 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">{p.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
              {p.sku && <span>SKU {p.sku}</span>}
              {p.category && <span>· {p.category}</span>}
              <Badge map={RESULT_BADGE} value={p.result} />
              <Badge map={SPEED_BADGE} value={p.speed} />
              {p.is_hidden && <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-bold">Hidden</span>}
            </div>
          </div>
        </div>
        <Link to={`/products/${p.id}/edit`} className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 self-start md:self-auto">
          <Pencil className="h-3.5 w-3.5" /> Edit product / buy price
        </Link>
      </div>

      {/* Price per piece */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Box label="Buy price / piece" value={money(p.cost_price)} sub={p.cost_price === null ? 'Not set — edit the product to add it' : 'what we paid'} />
        <Box label="Sell price / piece" value={money(p.sell_price)} sub={p.offer_price ? `Offer price (MRP ${formatPrice(p.price)})` : 'what the customer pays'} />
        <Box label="Profit / piece" value={money(perPieceProfit)} tone={profitTone(perPieceProfit)} sub={perPieceProfit !== null && perPieceProfit < 0 ? 'Selling below buy price' : 'at current prices'} />
      </div>

      {/* Stock & money */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Box label="Purchased" value={`${p.purchased_qty} pcs`} sub="sold + balance" />
        <Box label="Purchase total" value={money(p.purchase_total)} sub="purchased × buy price" />
        <Box label="Sold" value={`${p.units_sold} pcs`} sub={`${p.orders_count} orders · ${p.buyers_count} buyers`} />
        <Box label="Balance" value={`${p.balance_qty} pcs`} tone={p.balance_qty === 0 ? 'text-rose-600' : 'text-slate-900'} sub={`Worth ${money(p.balance_value)} at buy price`} />
        <Box label="Revenue" value={money(p.revenue)} sub={`Cost of sold ${money(p.cost_of_sold)}`} />
        <Box label={p.profit !== null && p.profit < 0 ? 'Loss' : 'Profit'} value={money(p.profit)} tone={profitTone(p.profit)} sub={p.margin_pct !== null ? `${p.margin_pct}% margin` : 'needs buy price'} />
      </div>

      {/* Sales speed */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Gauge className="h-4 w-4" /> Sales speed</h2>
          {[
            ['Speed', <Badge key="s" map={SPEED_BADGE} value={p.speed} />],
            ['Sold in last 30 days', `${p.units_sold_30d} pcs`],
            ['Average per day (30 days)', `${p.per_day} pcs`],
            ['Stock lasts about', p.days_of_stock === null ? '—' : `${p.days_of_stock} days`],
            ['Sold out of purchased', `${p.sell_through_pct}%`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
              <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-900">{v}</span>
            </div>
          ))}
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pt-2"><CalendarDays className="h-4 w-4" /> Sale dates</h2>
          {[
            ['First sale', p.first_sale_at ? formatDate(p.first_sale_at) : '—'],
            ['Last sale', p.last_sale_at ? formatDate(p.last_sale_at) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
              <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-900">{v}</span>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">Fast = 1+ pc/day · Medium = 1 pc every 5 days or better · Slow = less</p>
        </div>

        <div className="xl:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Pieces sold per day — last 90 days</h2>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval={13} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(v, name) => (name === 'units' ? [`${v} pcs`, 'Sold'] : [v, name])}
                  labelFormatter={(_, pl) => (pl?.[0] ? formatDate(pl[0].payload.date) : '')}
                />
                <Bar dataKey="units" fill="#0f172a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Variants */}
      {d.variants.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <h2 className="text-sm font-bold text-slate-900 p-4 border-b border-slate-100">By size / colour</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Size</th><th className="px-4 py-2.5">Colour</th><th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5 text-right">Purchased</th><th className="px-4 py-2.5 text-right">Sold</th><th className="px-4 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{v.size || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">{v.color || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{v.sku || '—'}</td>
                    <td className="px-4 py-2.5 text-right">{v.purchased_qty}</td>
                    <td className="px-4 py-2.5 text-right">{v.units_sold}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${v.stock === 0 ? 'text-rose-600' : 'text-slate-900'}`}>{v.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales history */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Sales history</h2>
          <span className="text-xs text-slate-500">{d.sales.length === 200 ? 'Latest 200 sales' : `${d.sales.length} sales`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5">Sale date</th><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Variant</th><th className="px-4 py-2.5 text-right">Qty</th><th className="px-4 py-2.5 text-right">Price / pc</th>
                <th className="px-4 py-2.5 text-right">Revenue</th><th className="px-4 py-2.5 text-right">Cost</th><th className="px-4 py-2.5 text-right">Profit</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.sales.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-xs text-slate-400">No sales yet</td></tr>
              ) : d.sales.map((s, i) => (
                <tr key={`${s.order_id}-${i}`} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 text-slate-700">{formatDateTime(s.created_at)}</td>
                  <td className="px-4 py-2.5"><Link to={`/orders/${s.order_id}`} className="font-semibold text-slate-900 hover:underline">{s.order_number}</Link></td>
                  <td className="px-4 py-2.5 text-slate-700">{s.customer_name || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{s.variant_info ? (typeof s.variant_info === 'object' ? Object.values(s.variant_info).filter(Boolean).join(' / ') : s.variant_info) : '—'}</td>
                  <td className="px-4 py-2.5 text-right">{s.quantity}</td>
                  <td className="px-4 py-2.5 text-right">{formatPrice(s.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {formatPrice(s.revenue)}
                    {s.payment_method === 'replacement' && <span className="block text-[11px] text-amber-600">free replacement</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{money(s.cost)}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${profitTone(s.profit)}`}>{money(s.profit)}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-slate-600">{s.status.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
