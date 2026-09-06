import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, Wallet as WalletIcon, Users, TrendingUp, Plus, Minus,
  History, Phone, Mail, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import { walletApi } from '../../../api';
import StatCard from '../../../components/ui/StatCard';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const REASON_LABELS = {
  order_payment: 'Paid at checkout',
  order_refund: 'Order cancelled — refund',
  return_refund: 'Return approved — refund',
  admin_credit: 'Admin credit',
  admin_debit: 'Admin debit',
};

export default function Wallets() {
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [adjustUser, setAdjustUser] = useState(null);
  const [historyUser, setHistoryUser] = useState(null);
  const debounceRef = useRef(null);
  const loadMoreRef = useRef(null);
  const qc = useQueryClient();
  const limit = 15;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['wallets', activeSearch],
    queryFn: ({ pageParam }) => walletApi.list({ search: activeSearch, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.wallets?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });

  const wallets = data?.pages.flatMap((p) => p.data?.wallets || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;
  const totalBalance = data?.pages?.[0]?.data?.total_balance || 0;
  const walletCount = data?.pages?.[0]?.data?.wallet_count || 0;

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(val), 300);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['wallets'] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Wallets</h1>
        <span className="text-sm text-gray-400">{total} customer{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Customers with a Wallet" value={walletCount} icon={Users} color="indigo" />
        <StatCard title="Total Balance Held" value={`₹${Number(totalBalance).toLocaleString('en-IN')}`} icon={WalletIcon} color="green" />
        <StatCard title="Average Balance" value={`₹${walletCount ? Math.round(totalBalance / walletCount).toLocaleString('en-IN') : 0}`} icon={TrendingUp} color="blue" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search by name, email or phone..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-12">
            <WalletIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No customers found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-pink-100 text-xs text-pink-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wallets.map((w) => (
                <tr key={w.user_id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{w.name || <span className="text-gray-400 italic text-xs">No name</span>}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      {w.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{w.phone}</span>}
                      {w.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{w.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ₹{Number(w.balance).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setHistoryUser(w)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="View transaction history"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setAdjustUser(w)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Credit or debit wallet"
                      >
                        <WalletIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && <span className="text-sm text-gray-400">Loading more…</span>}
        </div>
      )}
      {!hasNextPage && wallets.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {wallets.length} of {total}</div>
      )}

      {adjustUser && (
        <AdjustModal user={adjustUser} onClose={() => setAdjustUser(null)} onDone={invalidate} />
      )}
      {historyUser && (
        <HistoryModal user={historyUser} onClose={() => setHistoryUser(null)} />
      )}
    </div>
  );
}

/* ── Credit / Debit modal ── */
function AdjustModal({ user, onClose, onDone }) {
  const [type, setType] = useState('credit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => walletApi.adjust(user.user_id, { type, amount: parseFloat(amount), note }),
    onSuccess: () => {
      onDone();
      onClose();
      toast.success(type === 'credit' ? 'Wallet credited' : 'Wallet debited');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Adjustment failed'),
  });

  const handleSave = () => {
    if (!(parseFloat(amount) > 0)) return toast.error('Enter a valid amount');
    if (!note.trim()) return toast.error('A note is required, e.g. reason for the adjustment');
    mutation.mutate();
  };

  return (
    <Modal title={`Adjust Wallet — ${user.name || user.phone || user.email}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-xs text-gray-400">Current balance: <strong className="text-gray-700">₹{Number(user.balance).toLocaleString('en-IN')}</strong></p>

        <div className="flex gap-2">
          {[
            { key: 'credit', label: 'Credit (add money)', icon: ArrowUpCircle },
            { key: 'debit', label: 'Debit (remove money)', icon: ArrowDownCircle },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                type === t.key
                  ? t.key === 'credit' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-500 text-white border-red-500'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <Input label="Amount (₹)" type="number" min="0.01" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />

        <Input label="Note (required)" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Goodwill credit for delayed delivery" />

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} fullWidth>Cancel</Button>
          <Button
            variant={type === 'credit' ? 'success' : 'danger'}
            onClick={handleSave}
            loading={mutation.isPending}
            fullWidth
          >
            {type === 'credit' ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {mutation.isPending ? 'Saving…' : `Confirm ${type === 'credit' ? 'Credit' : 'Debit'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Transaction history modal ── */
function HistoryModal({ user, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-transactions', user.user_id],
    queryFn: () => walletApi.getTransactions(user.user_id, { limit: 50 }),
  });
  const transactions = data?.data?.transactions || [];

  return (
    <Modal title={`Transaction History — ${user.name || user.phone || user.email}`} onClose={onClose} size="lg">
      {isLoading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading…</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">No transactions yet</div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-3">
                {t.type === 'credit'
                  ? <ArrowUpCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  : <ArrowDownCircle className="h-5 w-5 text-red-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-gray-800">{REASON_LABELS[t.reason] || t.reason}</p>
                  {t.note && <p className="text-xs text-gray-400 mt-0.5">{t.note}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(t.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-400">Balance: ₹{Number(t.balance_after).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
