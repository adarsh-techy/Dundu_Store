import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Search, RefreshCw, Download, Package, ShoppingCart, Boxes,
  IndianRupee, TrendingUp, TrendingDown, ChevronRight,
} from 'lucide-react';
import { inventoryApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate } from '../../../utils/format';
import Badge from './Badge';
import { RESULT_BADGE, SPEED_BADGE } from './badges';

const money = (n) => (n === null || n === undefined ? '—' : formatPrice(n));

function StatCard({ icon: Icon, label, value, sub, tone = 'text-slate-900' }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className={`text-xl font-extrabold mt-1.5 ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const FILTERS = [
  { key: 'all',          label: 'All' },
  { key: 'profit',       label: 'Profit' },
  { key: 'loss',         label: 'Loss' },
  { key: 'no_sales',     label: 'No sales' },
  { key: 'cost_missing', label: 'Buy price missing' },
];

const SORTS = {
  profit:  { label: 'Most profit',   fn: (a, b) => (b.profit ?? -Infinity) - (a.profit ?? -Infinity) },
  loss:    { label: 'Most loss',     fn: (a, b) => (a.profit ?? Infinity) - (b.profit ?? Infinity) },
  sold:    { label: 'Most sold',     fn: (a, b) => b.units_sold - a.units_sold },
  balance: { label: 'Most balance',  fn: (a, b) => b.balance_qty - a.balance_qty },
  name:    { label: 'Name (A–Z)',    fn: (a, b) => a.name.localeCompare(b.name) },
};

export default function StockCheck() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('profit');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['stock-check'],
    queryFn: () => inventoryApi.stockCheck(),
  });

  const d = data?.data || {};
  const s = d.summary || {};

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (d.products || [])
      .filter((p) => {
        if (filter === 'cost_missing') { if (p.cost_price !== null) return false; }
        else if (filter !== 'all' && p.result !== filter) return false;
        if (!q) return true;
        return [p.name, p.sku, p.category].some((v) => v && v.toLowerCase().includes(q));
      })
      .sort(SORTS[sort].fn);
  }, [d.products, filter, sort, search]);

  const exportCsv = () => {
    const head = ['Product', 'SKU', 'Category', 'Buy price/pc', 'Sell price/pc', 'Purchased qty', 'Purchase total',
      'Sold qty', 'Orders', 'Buyers', 'Balance qty', 'Revenue', 'Profit', 'Result', 'Sold last 30 days', 'Speed', 'First sale', 'Last sale'];
    const lines = rows.map((p) => [
      p.name, p.sku || '', p.category || '', p.cost_price ?? '', p.sell_price, p.purchased_qty, p.purchase_total ?? '',
      p.units_sold, p.orders_count, p.buyers_count, p.balance_qty, p.revenue, p.profit ?? '', RESULT_BADGE[p.result]?.label,
      p.units_sold_30d, SPEED_BADGE[p.speed]?.label, p.first_sale_at ? formatDate(p.first_sale_at) : '', p.last_sale_at ? formatDate(p.last_sale_at) : '',
    ]);
    const csv = [head, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-check-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Stock Check</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Purchased vs sold vs balance for every product, with buy price, sale price and profit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={() => refetch()} disabled={isFetching} title="Refresh" className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Package} label="Purchased" value={`${s.purchased_qty ?? 0} pcs`} sub={`${s.products ?? 0} products`} />
        <StatCard icon={IndianRupee} label="Purchase total" value={money(s.purchase_total)} sub="at buy price" />
        <StatCard icon={ShoppingCart} label="Sold" value={`${s.units_sold ?? 0} pcs`} sub={`Revenue ${money(s.revenue)}`} />
        <StatCard icon={Boxes} label="Balance" value={`${s.balance_qty ?? 0} pcs`} sub={`Worth ${money(s.balance_value)} at buy price`} />
        <StatCard
          icon={(s.profit ?? 0) < 0 ? TrendingDown : TrendingUp}
          label="Profit on sold"
          value={money(s.profit)}
          tone={(s.profit ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}
          sub={`${s.profit_products ?? 0} profit · ${s.loss_products ?? 0} loss`}
        />
        <StatCard icon={Package} label="Not selling" value={s.no_sales_products ?? 0} sub={`${s.cost_missing_products ?? 0} without buy price`} />
      </div>

      {s.cost_missing_products > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-xl px-4 py-2.5">
          {s.cost_missing_products} product(s) have no buy price, so their purchase total and profit can't be worked out.
          Set it in the product's edit page (Buy Price) or from Finance &amp; Profit.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/70 text-xs font-bold overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer ${filter === f.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, category..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 w-56"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium cursor-pointer focus:outline-none"
            >
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto bg-pink-100/20">
          <table className="w-full text-left text-sm text-pink-800">
            <thead>
              <tr className="bg-pink-100/40 border-b border-pink-100 text-[11px] font-bold text-pink-800 uppercase tracking-wider whitespace-nowrap">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Buy / pc</th>
                <th className="px-4 py-3 text-right">Sell / pc</th>
                <th className="px-4 py-3 text-right">Purchased</th>
                <th className="px-4 py-3 text-right">Purchase total</th>
                <th className="px-4 py-3 text-right">Sold</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-pink-800/70 text-xs">
                    <Package className="h-9 w-9 text-pink-200 mx-auto mb-2" />
                    No products match
                  </td>
                </tr>
              ) : rows.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/stock-check/${p.id}`)} className="hover:bg-pink-100/40 cursor-pointer whitespace-nowrap">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-pink-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-pink-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate max-w-[220px]">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {p.sku && <span className="text-[11px] text-pink-800/70">{p.sku}</span>}
                          <Badge map={RESULT_BADGE} value={p.result} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-right">{money(p.cost_price)}</td>
                  <td className="px-4 py-3 text-right">{money(p.sell_price)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{p.purchased_qty}</td>
                  <td className="px-4 py-3 text-right">{money(p.purchase_total)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold">{p.units_sold}</span>
                    <span className="block text-[11px] text-pink-800/70">{p.buyers_count} buyer{p.buyers_count === 1 ? '' : 's'}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${p.balance_qty === 0 ? 'text-rose-600' : ''}`}>
                    {p.balance_qty}
                  </td>
                  <td className="px-4 py-3 text-right">{money(p.revenue)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${p.profit === null ? 'text-pink-800/50' : p.profit < 0 ? 'text-rose-600' : p.profit > 0 ? 'text-emerald-600' : ''}`}>
                    {money(p.profit)}
                    {p.margin_pct !== null && <span className="block text-[11px] font-medium">{p.margin_pct}%</span>}
                  </td>
                  <td className="px-2 py-3 text-pink-300"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
