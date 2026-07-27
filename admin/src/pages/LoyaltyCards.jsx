import { useState, useRef, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search, Star, TrendingUp, Users, Gift, Phone, Store,
  Smartphone, RefreshCw, Plus, Pencil, Trash2, ExternalLink, X, AlertTriangle,
} from 'lucide-react';
import { loyaltyApi } from '../api';
import StatCard from '../components/ui/StatCard';

/* ── small modal shell ── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ── shared field ── */
function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400';

/* ══════════════════════════════════════════════════════════ */
export default function LoyaltyCards() {
  const [search, setSearch]           = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [editCard, setEditCard]       = useState(null);
  const [deleteCard, setDeleteCard]   = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const debounceRef                   = useRef(null);
  const loadMoreRef                   = useRef(null);
  const qc                            = useQueryClient();
  const navigate                      = useNavigate();
  const limit                         = 15;

  /* ── queries ── */
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['loyalty-cards', activeSearch],
    queryFn: ({ pageParam }) => loyaltyApi.list({ search: activeSearch, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.cards?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
  const { data: statsData } = useQuery({
    queryKey: ['loyalty-stats'],
    queryFn: () => loyaltyApi.list({ limit: 1000, page: 1 }),
  });

  const cards      = data?.pages.flatMap((p) => p.data?.cards || []) || [];
  const total      = data?.pages?.[0]?.data?.total || 0;
  const allCards   = statsData?.data?.cards || [];
  const totalSpent     = allCards.reduce((s, c) => s + Number(c.total_spent), 0);
  const redeemableCount = allCards.filter((c) => c.points >= 200).length;
  const appUserCount   = allCards.filter((c) => c.has_account).length;
  const walkInCount    = allCards.filter((c) => !c.has_account).length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['loyalty-cards'] });
    qc.invalidateQueries({ queryKey: ['loyalty-stats'] });
  };

  /* ── mutations ── */
  const syncMutation = useMutation({
    mutationFn: () => loyaltyApi.sync(),
    onSuccess: (res) => { invalidate(); toast.success(`Synced — ${res.data.total} cards`); },
    onError:   ()    => toast.error('Sync failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ phone, data }) => loyaltyApi.update(phone, data),
    onSuccess: () => { invalidate(); setEditCard(null); toast.success('Card updated'); },
    onError:   ()  => toast.error('Update failed'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => loyaltyApi.create(data),
    onSuccess: () => { invalidate(); setShowCreate(false); toast.success('Card created'); },
    onError:   ()  => toast.error('Failed to create card'),
  });

  const deleteMutation = useMutation({
    mutationFn: (phone) => loyaltyApi.remove(phone),
    onSuccess: () => { invalidate(); setDeleteCard(null); toast.success('Card deleted'); },
    onError:   ()  => toast.error('Delete failed'),
  });

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setActiveSearch(val); }, 300);
  };

  const confirmDelete = (card) => setDeleteCard(card);

  /* ── lazy-load next page as the sentinel scrolls into view ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Loyalty Cards</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{total} customer{total !== 1 ? 's' : ''}</span>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing…' : 'Sync'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Card
          </button>
        </div>
      </div>

      {/* ── stats ── */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title="Total Members"     value={statsData?.data?.total || 0}              icon={Users}      color="indigo" />
        <StatCard title="App Users"         value={appUserCount}                              icon={Smartphone} color="blue"   />
        <StatCard title="Walk-in Customers" value={walkInCount}                               icon={Store}      color="amber"  />
        <StatCard title="Can Redeem Now"    value={redeemableCount}                           icon={Gift}       color="rose"   />
        <StatCard title="Total Spent"       value={`₹${totalSpent.toLocaleString('en-IN')}`} icon={TrendingUp} color="green"  />
      </div>

      {/* ── search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search by phone or name..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* ── table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No loyalty cards found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-pink-100 text-xs text-pink-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-center">Points</th>
                <th className="px-4 py-3 text-right">Total Spent</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Member Since</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cards.map((card) => {
                const redeemable = Math.floor(card.points / 200);
                const remaining  = 200 - (card.points % 200);
                return (
                  <tr key={card.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${card.has_account ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                          {card.has_account
                            ? <Smartphone className="h-4 w-4 text-indigo-400" />
                            : <Store       className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {card.name || <span className="text-gray-400 italic text-xs">No name</span>}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Phone className="h-3 w-3" /> {card.phone}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {card.has_account ? (
                        <button
                          onClick={() => navigate(`/users/${card.user_id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-700 transition-colors"
                        >
                          <Smartphone className="h-3 w-3" /> App User
                          <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-red-600 px-2.5 py-1 rounded-full">
                          <Store className="h-3 w-3" /> Walk-in
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-gray-800">{card.points}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-gray-700">
                      ₹{Number(card.total_spent).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {redeemable > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                          <Gift className="h-3 w-3" /> ₹{redeemable * 200} ready
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-400">
                          {remaining} pts to redeem
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                      {new Date(card.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditCard(card)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit card"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(card)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Delete card"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── lazy-load sentinel ── */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {isFetchingNextPage && <span className="text-sm text-gray-400">Loading more…</span>}
        </div>
      )}
      {!hasNextPage && cards.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-300">— End of list — {cards.length} of {total}</div>
      )}

      {/* ── Delete Modal ── */}
      {deleteCard && (
        <DeleteModal
          card={deleteCard}
          onClose={() => setDeleteCard(null)}
          onConfirm={() => deleteMutation.mutate(deleteCard.phone)}
          deleting={deleteMutation.isPending}
        />
      )}

      {/* ── Edit Modal ── */}
      {editCard && (
        <EditModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSave={(data) => updateMutation.mutate({ phone: editCard.phone, data })}
          saving={updateMutation.isPending}
        />
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutate(data)}
          saving={createMutation.isPending}
        />
      )}
    </div>
  );
}

/* ── Delete Modal ── */
function DeleteModal({ card, onClose, onConfirm, deleting }) {
  const [typed, setTyped] = useState('');
  const isActive = card.has_account;

  return (
    <Modal title="Delete Loyalty Card" onClose={onClose}>
      <div className="space-y-4">
        {/* Active user warning */}
        {isActive && (
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Active App User</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This customer has a Dundu account and may currently be using the app.
                Deleting their loyalty card will permanently remove all accumulated points
                and purchase history.
              </p>
            </div>
          </div>
        )}

        {/* Card summary */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium text-gray-800">{card.name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone</span>
            <span className="font-mono text-gray-700">{card.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Points</span>
            <span className="font-bold text-amber-600">{card.points} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Spent</span>
            <span className="font-semibold text-gray-700">₹{Number(card.total_spent).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
          <p className="text-sm text-red-700 font-medium">This action is permanent and cannot be undone.</p>
          <p className="text-xs text-red-600 mt-1">All loyalty points and history for this card will be erased.</p>
        </div>

        {/* Text confirmation */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 font-mono tracking-widest"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={typed !== 'DELETE' || deleting}
            className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete Card'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Edit Modal ── */
function EditModal({ card, onClose, onSave, saving }) {
  const [name, setName]           = useState(card.name || '');
  const [pointsDelta, setPointsDelta] = useState('');
  const [mode, setMode]           = useState('adjust'); // 'adjust' | 'set'
  const [pointsSet, setPointsSet] = useState(String(card.points));
  const [totalSpent, setTotalSpent] = useState(String(card.total_spent));

  const handleSave = () => {
    const payload = { name: name.trim() || null, total_spent: parseFloat(totalSpent) || 0 };
    if (mode === 'set')    payload.points      = parseInt(pointsSet) || 0;
    else if (pointsDelta)  payload.points_delta = parseInt(pointsDelta);
    onSave(payload);
  };

  return (
    <Modal title={`Edit — ${card.name || card.phone}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
        </Field>

        <Field label="Points adjustment">
          <div className="flex gap-2 mb-2">
            {['adjust', 'set'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${mode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {m === 'adjust' ? '± Adjust' : 'Set exact'}
              </button>
            ))}
          </div>
          {mode === 'adjust' ? (
            <input className={inp} type="number" value={pointsDelta}
              onChange={(e) => setPointsDelta(e.target.value)}
              placeholder="e.g. +50 to add, -20 to deduct (blank = no change)" />
          ) : (
            <input className={inp} type="number" min="0" value={pointsSet}
              onChange={(e) => setPointsSet(e.target.value)} placeholder="Exact points value" />
          )}
          <p className="text-xs text-gray-400 mt-1">Current: <strong>{card.points} pts</strong></p>
        </Field>

        <Field label="Total Spent (₹)">
          <input className={inp} type="number" min="0" step="0.01"
            value={totalSpent} onChange={(e) => setTotalSpent(e.target.value)} />
        </Field>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Create Modal ── */
function CreateModal({ onClose, onSave, saving }) {
  const [phone, setPhone]         = useState('');
  const [name, setName]           = useState('');
  const [points, setPoints]       = useState('0');
  const [totalSpent, setTotalSpent] = useState('0');

  const handleSave = () => {
    if (!phone.replace(/\D/g, '')) { alert('Enter a valid phone number'); return; }
    onSave({ phone: phone.replace(/\D/g, ''), name: name.trim() || null, points: parseInt(points) || 0, total_spent: parseFloat(totalSpent) || 0 });
  };

  return (
    <Modal title="New Loyalty Card" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Phone *">
          <input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
        </Field>
        <Field label="Name">
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name (optional)" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starting Points">
            <input className={inp} type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} />
          </Field>
          <Field label="Total Spent (₹)">
            <input className={inp} type="number" min="0" step="0.01" value={totalSpent} onChange={(e) => setTotalSpent(e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Card'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
