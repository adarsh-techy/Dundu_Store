import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, Search, X, RefreshCw, AlertTriangle, Package, Tag, PackagePlus, Ticket, Image, Megaphone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { trashApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';

const ICONS = { products: Package, categories: Tag, combos: PackagePlus, coupons: Ticket, banners: Image, announcements: Megaphone };
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function subtitle(type, item) {
  switch (type) {
    case 'products': return `${inr(item.price)} · stock ${item.stock ?? 0}`;
    case 'categories': return `${item.product_count || 0} product(s) still attached`;
    case 'combos': return item.offer_price ? `${inr(item.offer_price)} (was ${inr(item.price)})` : inr(item.price);
    case 'coupons': return `${item.discount_type === 'percentage' ? `${item.discount_value}% off` : `${inr(item.discount_value)} off`} · used ${item.used_count || 0}×`;
    case 'banners': return item.link || 'No link';
    default: return '';
  }
}

export default function Trash() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null); // { kind:'purge'|'empty', type, item }
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({ queryKey: ['admin-trash', search], queryFn: () => trashApi.list({ search: search.trim() || undefined }) });
  const d = data?.data || {};
  const counts = d.counts || {};
  const types = d.types || [];
  const totalCount = Object.values(counts).reduce((s, n) => s + n, 0);
  const retention = d.retention_days || 30;

  const rows = useMemo(() => {
    const out = [];
    for (const t of types) {
      if (tab !== 'all' && tab !== t.key) continue;
      for (const item of (d.items?.[t.key] || [])) out.push({ type: t.key, label: t.label, item });
    }
    return out.sort((a, b) => new Date(b.item.deleted_at) - new Date(a.item.deleted_at));
  }, [d, tab, types]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-trash'] });
    ['admin-combos', 'admin-products', 'categories', 'coupons', 'banners', 'announcements'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const restore = async (type, item) => {
    try { await trashApi.restore(type, item.id); toast.success('Restored'); invalidate(); }
    catch (e) { toast.error(e?.message || 'Could not restore'); }
  };

  const runConfirm = async () => {
    setBusy(true);
    try {
      if (confirm.kind === 'purge') {
        await trashApi.purge(confirm.type, confirm.item.id);
        toast.success('Deleted permanently');
      } else {
        const res = await trashApi.empty(confirm.type === 'all' ? undefined : confirm.type);
        toast.success(res?.message || 'Trash emptied');
      }
      invalidate();
      setConfirm(null);
    } catch (e) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-600" /> Trash</h1>
          <p className="text-xs text-gray-400 mt-0.5">Deleted products, categories, combos, coupons, banners and announcements land here. Restore anytime within {retention} days; after that they are removed automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {totalCount > 0 && (
            <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: 'empty', type: tab })}>
              <Trash2 className="h-3.5 w-3.5" /> Empty {tab === 'all' ? 'trash' : types.find((t) => t.key === tab)?.label.toLowerCase() + 's'}
            </Button>
          )}
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tab === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          All <span className="ml-1 opacity-70">{totalCount}</span>
        </button>
        {types.map((t) => {
          const Icon = ICONS[t.key] || Package;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tab === t.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}s <span className="ml-0.5 opacity-70">{counts[t.key] || 0}</span>
            </button>
          );
        })}
        <div className="relative ml-auto min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trash…" className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>}
        </div>
      </div>

      {isLoading ? <Spinner /> : rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-white text-gray-400">
          <Trash2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">{search ? 'Nothing in trash matches your search' : 'Trash is empty'}</p>
          <p className="text-sm mt-1">Items you delete from the catalogue and marketing pages will show up here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {rows.map(({ type, label, item }) => {
            const Icon = ICONS[type] || Package;
            const left = daysLeft(item.purge_at);
            return (
              <div key={`${type}-${item.id}`} className="flex items-center gap-3 px-4 py-3">
                {item.image
                  ? <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0 bg-gray-50" />
                  : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-gray-400" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-md">{item.name || '(untitled)'}</p>
                    <Badge color="gray">{label}</Badge>
                    {left <= 3 && <Badge color="red"><Clock className="h-3 w-3 mr-1" />{left === 0 ? 'Purges today' : `${left} day${left === 1 ? '' : 's'} left`}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle(type, item)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Deleted {fmt(item.deleted_at)}{item.deleted_by_name ? ` by ${item.deleted_by_name}` : ''} · auto-removed in {left} day{left === 1 ? '' : 's'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="xs" variant="outline" onClick={() => restore(type, item)}><RotateCcw className="h-3.5 w-3.5" /> Restore</Button>
                  <button onClick={() => setConfirm({ kind: 'purge', type, item })} title="Delete permanently" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <Modal title={confirm.kind === 'purge' ? 'Delete permanently?' : 'Empty trash?'} onClose={() => !busy && setConfirm(null)} size="sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><AlertTriangle className="h-5 w-5" /></div>
            <p className="text-sm text-gray-600">
              {confirm.kind === 'purge'
                ? <><b>{confirm.item.name}</b> will be removed for good. This cannot be undone.</>
                : <>Everything in {confirm.type === 'all' ? 'the trash' : `trashed ${types.find((t) => t.key === confirm.type)?.label.toLowerCase()}s`} will be removed for good. Items still referenced by orders or products are kept and reported.</>}
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={runConfirm}>{confirm.kind === 'purge' ? 'Delete forever' : 'Empty'}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
