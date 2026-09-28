import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  ArrowLeft, Package, Pencil, ArrowRight, ShoppingBag, Boxes, PackageCheck, Users,
  TrendingUp, TrendingDown, Zap, CalendarDays, CalendarClock, Hourglass, AlertTriangle, Receipt,
} from 'lucide-react';
import { inventoryApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate, formatDateTime } from '../../../utils/format';
import Badge from './Badge';
import { RESULT_BADGE } from './badges';

const money = (n) => (n === null || n === undefined ? '—' : formatPrice(n));
const signed = (n) => (n === null || n === undefined ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatPrice(Math.abs(n))}`);
const profitTone = (n) => (n === null || n === undefined ? 'text-slate-400' : n < 0 ? 'text-rose-600' : n > 0 ? 'text-emerald-600' : 'text-slate-500');

const HERO_LABEL = { profit: 'Total profit', loss: 'Total loss', break_even: 'Break-even' };
const PILL = 'bg-slate-50 text-slate-600 border-slate-200';

const SPEED_LEVEL = { none: 0, slow: 1, medium: 2, fast: 3 };

const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);

const variantText = (v) => {
  if (!v) return null;
  if (typeof v === 'object') return Object.values(v).filter(Boolean).join(' / ') || null;
  return String(v);
};

function Card({ className = '', children }) {
  return <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs ${className}`}>{children}</div>;
}

function SectionTitle({ icon: Icon, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Icon className="h-4 w-4" /></div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function FlowStep({ icon: Icon, label, qty, money: amount, moneyLabel, alert }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl p-3 sm:p-4 border border-slate-200 bg-slate-50/60">
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center bg-white border border-slate-200 text-slate-600"><Icon className="h-4 w-4" /></div>
        <p className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className={`text-2xl sm:text-3xl font-black mt-2 ${alert ? 'text-rose-600' : 'text-slate-900'} sm:mt-3 tabular-nums`}>{qty}<span className="text-xs sm:text-sm font-bold text-slate-400 ml-1">pcs</span></p>
      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">{moneyLabel} <span className="block sm:inline font-bold text-slate-700">{money(amount)}</span></p>
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold">{formatDate(r.date)}</p>
      <p className="mt-0.5">{r.units} pcs sold</p>
      {r.revenue > 0 && <p className="text-slate-300">{formatPrice(r.revenue)}</p>}
    </div>
  );
}

export default function StockCheckDetail() {
  const { id } = useParams();
  const [range, setRange] = useState(30);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-check', id],
    queryFn: () => inventoryApi.stockCheckProduct(id),
  });

  const d = data?.data;
  const chart = useMemo(
    () => (d?.daily_sales || []).slice(-range).map((r) => ({ ...r, label: formatDate(r.date).replace(/ \d{4}$/, '') })),
    [d, range]
  );

  if (isLoading) return <Spinner />;
  if (isError || !d) {
    return (
      <Card className="p-12 text-center">
        <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Product not found.</p>
        <Link to="/stock-check" className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-slate-900 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Stock Check
        </Link>
      </Card>
    );
  }

  const p = d.product;
  const heroLabel = HERO_LABEL[p.result] || 'Profit';
  const perPiece = p.cost_price === null ? null : p.sell_price - p.cost_price;
  const costShare = p.cost_price === null || !p.sell_price ? null : Math.min(100, Math.round((p.cost_price / p.sell_price) * 100));
  const soldPct = p.purchased_qty ? (p.units_sold / p.purchased_qty) * 100 : 0;
  const rangeUnits = chart.reduce((t, r) => t + r.units, 0);
  const lastSaleDays = daysSince(p.last_sale_at);
  const level = SPEED_LEVEL[p.speed] ?? 0;

  return (
    <div className="w-full space-y-5 pb-16">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <Card>
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-200 p-1 shrink-0">
            <div className="w-full h-full rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
              {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="h-10 w-10 text-slate-300" />}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight break-words">{p.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {p.category && <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">{p.category}</span>}
              {p.sku && <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-mono">{p.sku}</span>}
              <Badge map={RESULT_BADGE} value={p.result} />
              {p.is_hidden && <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-bold">Hidden</span>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-3 text-right">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{heroLabel}</p>
              <p className={`text-2xl font-black tabular-nums ${profitTone(p.profit)}`}>{signed(p.profit)}</p>
              <p className="text-[11px] text-slate-500">{p.margin_pct !== null ? `${p.margin_pct}% margin on sales` : p.cost_price === null ? 'Set a buy price to see profit' : 'No sales yet'}</p>
            </div>
            <Link to={`/products/${p.id}/edit`} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit product
            </Link>
          </div>
        </div>
      </Card>

      {p.cost_price === null && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            This product has no <b>Buy Price</b>, so purchase total, cost and profit can't be calculated.{' '}
            <Link to={`/products/${p.id}/edit`} className="underline font-bold">Add it now</Link>
          </p>
        </div>
      )}

      {/* ── Stock flow + price per piece ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="xl:col-span-8 p-5 sm:p-6">
          <SectionTitle icon={Boxes} title="Stock flow" sub="Everything we bought, what went out, and what is left" />
          <div className="flex flex-row items-stretch gap-2 sm:gap-3">
            <FlowStep icon={PackageCheck} label="Purchased" qty={p.purchased_qty} money={p.purchase_total} moneyLabel="Cost" />
            <div className="hidden sm:flex items-center text-slate-300"><ArrowRight className="h-5 w-5" /></div>
            <FlowStep icon={ShoppingBag} label="Sold" qty={p.units_sold} money={p.revenue} moneyLabel="Revenue" />
            <div className="hidden sm:flex items-center text-slate-300"><ArrowRight className="h-5 w-5" /></div>
            <FlowStep icon={Boxes} label="Balance" qty={p.balance_qty} money={p.balance_value} moneyLabel="Worth" alert={p.balance_qty === 0} />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
              <span>{p.sell_through_pct}% sold</span>
              <span>{Math.round((100 - p.sell_through_pct) * 10) / 10}% still in stock</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="h-full bg-slate-800 rounded-full transition-all duration-700" style={{ width: `${soldPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <Receipt className="h-4 w-4 text-slate-400" />
              <div><p className="text-lg font-black text-slate-900">{p.orders_count}</p><p className="text-[11px] text-slate-500">Orders</p></div>
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-slate-400" />
              <div><p className="text-lg font-black text-slate-900">{p.buyers_count}</p><p className="text-[11px] text-slate-500">Buyers</p></div>
            </div>
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-4 w-4 text-slate-400" />
              <div><p className="text-lg font-black text-slate-900">{money(p.cost_of_sold)}</p><p className="text-[11px] text-slate-500">Cost of sold</p></div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-4 p-5 sm:p-6 flex flex-col">
          <SectionTitle icon={Receipt} title="Price per piece" sub="At current prices" />
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-xs font-bold text-slate-500">Buy price</span>
              <span className="text-lg font-black text-slate-900 tabular-nums">{money(p.cost_price)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-xs font-bold text-slate-500">
                Sell price
                {p.offer_price && <span className="block text-[10px] font-medium text-slate-400 line-through">{formatPrice(p.price)}</span>}
              </span>
              <span className="text-lg font-black text-slate-900 tabular-nums">{money(p.sell_price)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl px-4 py-3 border border-slate-200">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                {perPiece !== null && perPiece < 0 ? <TrendingDown className="h-4 w-4 text-slate-500" /> : <TrendingUp className="h-4 w-4 text-slate-500" />}
                {perPiece !== null && perPiece < 0 ? 'Loss / piece' : 'Profit / piece'}
              </span>
              <span className={`text-xl font-black tabular-nums ${profitTone(perPiece)}`}>{signed(perPiece)}</span>
            </div>
          </div>
          {costShare !== null && (
            <div className="mt-4">
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                <div className={`h-full ${costShare >= 100 ? 'bg-rose-500' : 'bg-slate-700'}`} style={{ width: `${costShare}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Buy price is <b className="text-slate-700">{Math.round((p.cost_price / p.sell_price) * 100)}%</b> of the sell price
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Sales speed + chart ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="xl:col-span-4 p-5 sm:p-6">
          <div>
            <SectionTitle icon={Zap} title="Sales speed" sub="Based on the last 30 days" />
            <p className="text-4xl font-black text-slate-900 tabular-nums">{p.per_day}<span className="text-base font-bold text-slate-400 ml-1.5">pcs / day</span></p>
            <p className="text-xs text-slate-400 mt-1">{p.units_sold_30d} pcs sold in the last 30 days</p>

            <div className="flex gap-1.5 mt-4">
              {['Slow', 'Medium', 'Fast'].map((l, i) => (
                <div key={l} className="flex-1">
                  <div className={`h-2 rounded-full ${i < level ? 'bg-slate-800' : 'bg-slate-100'}`} />
                  <p className={`text-[10px] font-bold mt-1 ${i + 1 === level ? 'text-slate-900' : 'text-slate-400'}`}>{l}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                [Hourglass, 'Stock lasts about', p.days_of_stock === null ? '—' : `${p.days_of_stock} days`],
                [CalendarDays, 'First sale', p.first_sale_at ? formatDate(p.first_sale_at) : '—'],
                [CalendarClock, 'Last sale', p.last_sale_at ? `${formatDate(p.last_sale_at)}${lastSaleDays !== null ? ` · ${lastSaleDays === 0 ? 'today' : `${lastSaleDays}d ago`}` : ''}` : '—'],
              ].map(([Icon, k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs text-slate-500"><Icon className="h-3.5 w-3.5" />{k}</span>
                  <span className="text-xs font-bold text-slate-900 text-right">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-4">Fast = 1+ pc/day · Medium = 1 pc every 5 days or better</p>
          </div>
        </Card>

        <Card className="xl:col-span-8 p-5 sm:p-6">
          <SectionTitle
            icon={TrendingUp}
            title="Sales trend"
            sub={`${rangeUnits} pcs sold in the last ${range} days`}
            right={
              <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-bold">
                {[7, 30, 90].map((n) => (
                  <button key={n} onClick={() => setRange(n)}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${range === n ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>
                    {n}d
                  </button>
                ))}
              </div>
            }
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                  interval={range === 7 ? 0 : range === 30 ? 4 : 14} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="units" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Variants ──────────────────────────────────────────────────── */}
      {d.variants.length > 0 && (
        <Card className="p-5 sm:p-6">
          <SectionTitle icon={Boxes} title="Sizes & colours" sub="Purchased, sold and balance for each variant" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {d.variants.map((v) => {
              const pct = v.purchased_qty ? (v.units_sold / v.purchased_qty) * 100 : 0;
              return (
                <div key={v.id} className="rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {v.size && <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 text-xs font-black">{v.size}</span>}
                      {v.color && <span className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold">{v.color}</span>}
                      {!v.size && !v.color && <span className="text-xs font-bold text-slate-500">Default</span>}
                    </div>
                    {v.stock === 0 && <span className="text-[10px] font-bold text-rose-600">Sold out</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    {[['Bought', v.purchased_qty, 'text-slate-900'], ['Sold', v.units_sold, 'text-slate-900'], ['Left', v.stock, v.stock === 0 ? 'text-rose-600' : 'text-slate-900']].map(([k, n, c]) => (
                      <div key={k}><p className={`text-lg font-black tabular-nums ${c}`}>{n}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{k}</p></div>
                    ))}
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3">
                    <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  {v.sku && <p className="text-[10px] text-slate-400 font-mono mt-2 truncate">{v.sku}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Sales history ─────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6 pb-1 sm:pb-1">
          <SectionTitle icon={Receipt} title="Sales history"
            sub={d.sales.length === 200 ? 'Latest 200 sales' : `${d.sales.length} sale${d.sales.length === 1 ? '' : 's'}`} />
        </div>
        {d.sales.length === 0 ? (
          <div className="py-14 text-center">
            <ShoppingBag className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No sales yet</p>
          </div>
        ) : (
          <>
          <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
            {d.sales.map((s, i) => (
              <div key={`${s.order_id}-${i}`} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                  {(s.customer_name || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-slate-900 truncate">{s.customer_name || 'Guest'}</p>
                    <p className={`text-sm font-bold tabular-nums ${profitTone(s.profit)}`}>{signed(s.profit)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-slate-500 truncate">
                      <Link to={`/orders/${s.order_id}`} className="font-mono font-bold text-slate-900 hover:underline">{s.order_number}</Link>
                      {' · '}{formatDate(s.created_at)}{variantText(s.variant_info) ? ` · ${variantText(s.variant_info)}` : ''}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold capitalize shrink-0 ${PILL}`}>
                      {s.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {s.quantity} × {formatPrice(s.unit_price)} = <b className="text-slate-700">{formatPrice(s.revenue)}</b>
                    {s.payment_method === 'replacement' && <span className="text-slate-500 font-bold"> · Free replacement</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-y border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Customer</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Sale date</th>
                  <th className="px-5 py-3 text-right">Qty × Price</th><th className="px-5 py-3 text-right">Revenue</th>
                  <th className="px-5 py-3 text-right">Profit</th><th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.sales.map((s, i) => (
                  <tr key={`${s.order_id}-${i}`} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center">
                          {(s.customer_name || '?').trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{s.customer_name || 'Guest'}</p>
                          {variantText(s.variant_info) && <p className="text-[11px] text-slate-500">{variantText(s.variant_info)}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/orders/${s.order_id}`} className="font-mono text-xs font-bold text-slate-900 hover:underline">{s.order_number}</Link>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{formatDateTime(s.created_at)}</td>
                    <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{s.quantity} × {formatPrice(s.unit_price)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className="font-semibold text-slate-900">{formatPrice(s.revenue)}</span>
                      {s.payment_method === 'replacement' && <span className="block text-[10px] font-bold text-slate-500">Free replacement</span>}
                    </td>
                    <td className={`px-5 py-3 text-right font-bold tabular-nums ${profitTone(s.profit)}`}>{signed(s.profit)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold capitalize ${PILL}`}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
