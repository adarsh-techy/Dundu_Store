import { useState, useRef, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, Star, TrendingUp, Users, Gift, Phone,
  Smartphone, RefreshCw, Plus, Pencil, Trash2, X, AlertTriangle,
  CreditCard, Sparkles, Sliders, Save, CheckCircle2, QrCode,
  Copy, Check, Calculator, HelpCircle, ShieldCheck, Zap,
  ArrowRight, Coins, Percent, ArrowUpRight, Flame, Layers,
  Eye, Wifi, Award, Download, CheckCircle, Shield, BookOpen,
  ChevronDown, Info
} from 'lucide-react';
import { loyaltyApi } from '../../../api';

/* ── Modal Shell ── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Shared Field ── */
function Field({ label, hint, badge, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          {label}
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {badge}
            </span>
          )}
        </label>
        {hint && <span className="text-[11px] text-gray-400 font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inp = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white font-medium';

/* ── KPI Stat Card (soft tinted background, Loyalty Cards page only) ── */
const KPI_SCHEMES = {
  indigo: {
    card: 'bg-gradient-to-br from-indigo-50 via-indigo-50/40 to-white border-indigo-200/70 hover:border-indigo-300 hover:shadow-indigo-500/10',
    icon: 'bg-white text-indigo-600 border-indigo-200 shadow-xs',
    sub: 'text-indigo-600',
  },
  blue: {
    card: 'bg-gradient-to-br from-sky-50 via-sky-50/40 to-white border-sky-200/70 hover:border-sky-300 hover:shadow-sky-500/10',
    icon: 'bg-white text-sky-600 border-sky-200 shadow-xs',
    sub: 'text-sky-600',
  },
  rose: {
    card: 'bg-gradient-to-br from-rose-50 via-rose-50/40 to-white border-rose-200/70 hover:border-rose-300 hover:shadow-rose-500/10',
    icon: 'bg-white text-rose-600 border-rose-200 shadow-xs',
    sub: 'text-rose-600',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 via-amber-50/40 to-white border-amber-200/70 hover:border-amber-300 hover:shadow-amber-500/10',
    icon: 'bg-white text-amber-600 border-amber-200 shadow-xs',
    sub: 'text-amber-600',
  },
  green: {
    card: 'bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white border-emerald-200/70 hover:border-emerald-300 hover:shadow-emerald-500/10',
    icon: 'bg-white text-emerald-600 border-emerald-200 shadow-xs',
    sub: 'text-emerald-600',
  },
};

function LoyaltyStatCard({ title, value, icon: Icon, color = 'indigo', sub }) {
  const s = KPI_SCHEMES[color] || KPI_SCHEMES.indigo;
  return (
    <div className={`${s.card} rounded-3xl p-5 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between group`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-gray-700 transition-colors">
          {title}
        </p>
        {Icon && (
          <div className={`p-2.5 rounded-2xl ${s.icon} shrink-0 transition-all duration-200 group-hover:scale-105`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3.5">
        <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none">
          {value}
        </p>
        {sub && <p className={`text-[11px] ${s.sub} font-semibold mt-1.5`}>{sub}</p>}
      </div>
    </div>
  );
}

export default function LoyaltyCards() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'control' | 'preview' | 'rules'
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'active' | 'redeemable' | 'vip'
  const [editCard, setEditCard] = useState(null);
  const [adjustCard, setAdjustCard] = useState(null);
  const [adjustPointsVal, setAdjustPointsVal] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState('credit'); // 'credit' | 'debit'
  const [deleteCard, setDeleteCard] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [barcodeCard, setBarcodeCard] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [simSpend, setSimSpend] = useState(2500);

  /* ── Rules & Guide Interactive State ── */
  const [calcSpend, setCalcSpend] = useState(1500);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  /* ── ATM Digital Card Preview States ── */
  const [prevName, setPrevName] = useState('ADARSH SHARMA');
  const [prevPhone, setPrevPhone] = useState('9876543210');
  const [prevPoints, setPrevPoints] = useState(480);
  const [prevMemberSince, setPrevMemberSince] = useState('2026');
  const [prevShowBarcode, setPrevShowBarcode] = useState(false);
  const [posScanSuccess, setPosScanSuccess] = useState(false);
  const [confirmToggleState, setConfirmToggleState] = useState(null); // boolean | null
  const [confirmInputText, setConfirmInputText] = useState('');

  const debounceRef = useRef(null);
  const loadMoreRef = useRef(null);
  const tableContainerRef = useRef(null);
  const qc = useQueryClient();
  const limit = 15;

  /* ── Loyalty Config State ── */
  const [configForm, setConfigForm] = useState({
    enabled: true,
    earn_points: 20,
    spend_amount: 500,
    redeem_points: 200,
    redeem_discount: 200,
    min_order_earn: 100,
    min_points_redeem: 200,
    max_discount_per_order: 1000,
    welcome_bonus: 0,
    terms: 'Earn 20 points for every ₹500 spent on Dundu Online. 200 points = ₹200 flat discount.',
  });

  /* ── Queries ── */
  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: async () => {
      const res = await loyaltyApi.getConfig();
      return res.data || res;
    },
  });

  useEffect(() => {
    if (configData?.config) {
      setConfigForm(configData.config);
    }
  }, [configData]);

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
      const totalCount = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.cards?.length || 0), 0);
      return loaded < totalCount ? allPages.length + 1 : undefined;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['loyalty-stats'],
    queryFn: () => loyaltyApi.list({ limit: 1000, page: 1 }),
  });

  const rawCards = data?.pages.flatMap((p) => p.data?.cards || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;
  const allCards = statsData?.data?.cards || [];
  const totalSpent = allCards.reduce((s, c) => s + Number(c.total_spent || 0), 0);
  const totalPointsCirculation = allCards.reduce((s, c) => s + Number(c.points || 0), 0);
  const redeemableCount = allCards.filter((c) => (c.points || 0) >= (configForm.min_points_redeem || 200)).length;
  const activeEarnersCount = allCards.filter((c) => (c.points || 0) > 0).length;
  const vipCount = allCards.filter((c) => (c.points || 0) >= 500 || Number(c.total_spent || 0) >= 2500).length;

  // Client filtering for app members
  const cards = rawCards.filter((card) => {
    if (filterType === 'active') return (card.points || 0) > 0;
    if (filterType === 'redeemable') return (card.points || 0) >= (configForm.min_points_redeem || 200);
    if (filterType === 'vip') return (card.points || 0) >= 500 || Number(card.total_spent || 0) >= 2500;
    return true;
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['loyalty-cards'] });
    qc.invalidateQueries({ queryKey: ['loyalty-stats'] });
    qc.invalidateQueries({ queryKey: ['loyalty-config'] });
  };

  /* ── Mutations ── */
  const saveConfigMutation = useMutation({
    mutationFn: (data) => loyaltyApi.updateConfig(data),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.message || 'Loyalty conditions and rules updated!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save rules');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => loyaltyApi.sync(),
    onSuccess: (res) => { invalidate(); toast.success(`Synced — ${res.data.total} cards updated`); },
    onError: () => toast.error('Sync failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ phone, data }) => loyaltyApi.update(phone, data),
    onSuccess: () => { invalidate(); setEditCard(null); toast.success('Card updated'); },
    onError: () => toast.error('Update failed'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ phone, delta, reason }) => loyaltyApi.adjustPoints(phone, { delta, reason }),
    onSuccess: (res) => {
      invalidate();
      setAdjustCard(null);
      setAdjustPointsVal('');
      setAdjustReason('');
      toast.success(res.message || 'Points adjusted successfully');
    },
    onError: (err) => toast.error(err?.response?.data?.message || err.message || 'Failed to adjust points'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => loyaltyApi.create(data),
    onSuccess: () => { invalidate(); setShowCreate(false); toast.success('Card created'); },
    onError: () => toast.error('Failed to create card'),
  });

  const deleteMutation = useMutation({
    mutationFn: (phone) => loyaltyApi.remove(phone),
    onSuccess: () => { invalidate(); setDeleteCard(null); toast.success('Card deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setActiveSearch(val); }, 300);
  };

  const handleMasterToggle = (newVal) => {
    setConfigForm((p) => ({ ...p, enabled: newVal }));
    saveConfigMutation.mutate({ ...configForm, enabled: newVal });
  };

  const handleSaveConfig = (e) => {
    e?.preventDefault();
    saveConfigMutation.mutate(configForm);
  };

  const handleApplyPreset = (presetType) => {
    if (presetType === 'standard') {
      setConfigForm((p) => ({
        ...p,
        earn_points: 20,
        spend_amount: 500,
        redeem_points: 200,
        redeem_discount: 200,
        min_order_earn: 100,
        terms: 'Earn 20 points for every ₹500 spent on Dundu Online. 200 points = ₹200 flat discount.',
      }));
      toast.success('Applied Standard (20 pts / ₹500) preset');
    } else if (presetType === 'festive') {
      setConfigForm((p) => ({
        ...p,
        earn_points: 40,
        spend_amount: 500,
        redeem_points: 200,
        redeem_discount: 200,
        min_order_earn: 100,
        terms: '🎉 Festive 2X Special: Earn 40 points for every ₹500 spent! 200 points = ₹200 discount.',
      }));
      toast.success('Applied 2X Festive Bonus preset');
    } else if (presetType === 'premium') {
      setConfigForm((p) => ({
        ...p,
        earn_points: 50,
        spend_amount: 1000,
        redeem_points: 250,
        redeem_discount: 300,
        min_order_earn: 200,
        terms: 'VIP Rewards: Earn 50 points per ₹1000 spent. Redeem 250 points for ₹300 discount.',
      }));
      toast.success('Applied Premium VIP preset');
    }
  };

  const handleOpenAdjust = (card) => {
    setAdjustCard(card);
    setAdjustPointsVal('');
    setAdjustReason('');
    setAdjustType('credit');
  };

  const handleSubmitAdjust = (e) => {
    e.preventDefault();
    const pts = parseInt(adjustPointsVal, 10);
    if (!pts || isNaN(pts) || pts <= 0) {
      toast.error('Please enter a valid points amount');
      return;
    }
    const delta = adjustType === 'credit' ? pts : -pts;
    adjustMutation.mutate({
      phone: adjustCard.phone,
      delta,
      reason: adjustReason || (adjustType === 'credit' ? 'Admin point bonus' : 'Admin point deduction'),
    });
  };

  /* ── Lazy-load next page on inside-table scroll ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    const root = tableContainerRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { root, rootMargin: '150px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  // Dirty state checks for dynamic save buttons
  const savedEarnPoints = configData?.config?.earn_points ?? 20;
  const savedSpendAmount = configData?.config?.spend_amount ?? 500;
  const isEarningDirty = configForm.earn_points !== savedEarnPoints || configForm.spend_amount !== savedSpendAmount;

  const savedRedeemPoints = configData?.config?.redeem_points ?? 200;
  const savedRedeemDiscount = configData?.config?.redeem_discount ?? 200;
  const isRedemptionDirty = configForm.redeem_points !== savedRedeemPoints || configForm.redeem_discount !== savedRedeemDiscount;

  return (
    <div className="space-y-6 pb-12">
      {/* ── TOP NAVIGATION BAR & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-200/90 shadow-[0_4px_16px_rgb(0,0,0,0.04)] w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>App Members ({total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('control')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Program Rules & Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>ATM Card Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rules & Knowledge Guide</span>
          </button>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200/90 rounded-xl text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin text-indigo-600' : 'text-gray-500'}`} />
            <span>{syncMutation.isPending ? 'Syncing…' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Card</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE VIEW 1: APP MEMBERS & CARDHOLDERS (FULL PAGE)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* KPI Stats (5 Cards - 100% App Users Focused) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <LoyaltyStatCard
              title="Total App Members"
              value={statsData?.data?.total || 0}
              icon={Users}
              color="indigo"
              sub="Registered app accounts"
            />
            <LoyaltyStatCard
              title="Active Earners"
              value={activeEarnersCount}
              icon={Smartphone}
              color="blue"
              sub="Members with balance > 0"
            />
            <LoyaltyStatCard
              title="Ready to Redeem"
              value={redeemableCount}
              icon={Gift}
              color="rose"
              sub={`Balance ≥ ${configForm.min_points_redeem || 200} pts`}
            />
            <LoyaltyStatCard
              title="Points In Circulation"
              value={`★ ${totalPointsCirculation.toLocaleString()}`}
              icon={Coins}
              color="amber"
              sub="Active digital points"
            />
            <LoyaltyStatCard
              title="Total Member Sales"
              value={`₹${totalSpent.toLocaleString('en-IN')}`}
              icon={TrendingUp}
              color="green"
              sub="Lifetime app orders"
            />
          </div>

          {/* Search Bar & Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/90 shadow-[0_8px_25px_rgb(0,0,0,0.05)]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={handleSearch}
                placeholder="Search by app member phone or name..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: `All App Members (${total})` },
                { id: 'active', label: `Active Earners (${activeEarnersCount})` },
                { id: 'redeemable', label: `Can Redeem (${redeemableCount})` },
                { id: 'vip', label: `VIP Members (${vipCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cardholders Table with Internal Scroll */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-200/90 overflow-hidden">
            {isLoading ? (
              <div className="text-center py-16 text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Loading app member cards...</span>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-16">
                <Smartphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-bold text-sm">No app member cards found</p>
                <p className="text-xs text-gray-400 mt-1">Search another phone number or sync directly from paid customer orders.</p>
              </div>
            ) : (
              <div
                ref={tableContainerRef}
                onScroll={handleTableScroll}
                className="overflow-x-auto max-h-[600px] overflow-y-auto relative scroll-smooth"
              >
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-pink-50/95 backdrop-blur-xs text-xs text-pink-900 uppercase tracking-wide border-b border-pink-200/90 shadow-xs">
                    <tr>
                      <th className="px-4 py-3.5 text-left w-12 font-extrabold text-pink-900 bg-pink-50/95">#</th>
                      <th className="px-4 py-3.5 text-left font-extrabold text-pink-900 bg-pink-50/95">Customer</th>
                      <th className="px-4 py-3.5 text-center font-extrabold text-pink-900 bg-pink-50/95">Points Balance</th>
                      <th className="px-4 py-3.5 text-center font-extrabold text-pink-900 bg-pink-50/95">Redeemable Value</th>
                      <th className="px-4 py-3.5 text-right font-extrabold text-pink-900 bg-pink-50/95">Lifetime Spent</th>
                      <th className="px-4 py-3.5 text-center font-extrabold text-pink-900 bg-pink-50/95">Member Since</th>
                      <th className="px-4 py-3.5 text-center font-extrabold text-pink-900 bg-pink-50/95">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cards.map((card, idx) => {
                      const points = Number(card.points || 0);
                      const spent = Number(card.total_spent || 0);
                      const redeemUnits = Math.floor(points / (configForm.redeem_points || 200));
                      const redeemValue = redeemUnits * (configForm.redeem_discount || 200);
                      const remainingToNext = (configForm.redeem_points || 200) - (points % (configForm.redeem_points || 200));

                      return (
                        <tr key={card.id || card.phone} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-xs font-bold text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs">
                                <Smartphone className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">
                                  {card.name || <span className="text-gray-400 italic text-xs font-normal">No Name</span>}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span className="font-semibold">{card.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Points */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-black text-base text-indigo-600">
                              ★ {points.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-medium">
                              {remainingToNext > 0 ? `${remainingToNext} pts to next slab` : 'Redeemable'}
                            </span>
                          </td>

                          {/* Redeemable Value */}
                          <td className="px-4 py-3.5 text-center">
                            {redeemValue > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                <Gift className="w-3 h-3 text-emerald-600" />
                                ₹{redeemValue} OFF
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium">
                                Below threshold
                              </span>
                            )}
                          </td>

                          {/* Total Spent */}
                          <td className="px-4 py-3.5 text-right font-black text-gray-800">
                            ₹{spent.toLocaleString('en-IN')}
                          </td>

                          {/* Member Since */}
                          <td className="px-4 py-3.5 text-center text-xs text-gray-500 font-medium">
                            {card.created_at ? new Date(card.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Digital Card QR Modal */}
                              <button
                                type="button"
                                onClick={() => setBarcodeCard(card)}
                                className="p-1.5 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                title="View Digital Card & QR"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>

                              {/* Quick Points Adjust */}
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(card)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Adjust Points (Credit/Debit)"
                              >
                                <Sparkles className="h-4 w-4" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => setEditCard(card)}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Card"
                              >
                              <Pencil className="h-4 w-4" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeleteCard(card)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Card"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Sentinel inside table container */}
                <div ref={loadMoreRef} className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-gray-50/50">
                  {isFetchingNextPage ? (
                    <span className="inline-flex items-center gap-2 font-bold text-indigo-600">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading more cards...
                    </span>
                  ) : hasNextPage ? (
                    'Scroll down to load more cardholders'
                  ) : (
                    <span className="text-gray-400">All {total} cardholders loaded</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE VIEW 2: PROGRAM RULES & ENGINE (CLEAN & INTUITIVE)
      ══════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════
          PAGE VIEW 2: PROGRAM RULES & ENGINE (CLEAN & INTUITIVE)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'control' && (
        <form onSubmit={handleSaveConfig} className="max-w-4xl space-y-6 animate-in fade-in duration-200">
          {/* Top Header: Title on Left, Program Status Toggle on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:px-6 sm:py-4 rounded-3xl border border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Loyalty Program Engine</h2>
                <p className="text-xs text-gray-500">Configure customer point earnings and discount slabs</p>
              </div>
            </div>

            {/* Toggle Button on Top Right */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200 shrink-0 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-700 uppercase block leading-tight">
                  {configForm.enabled ? 'Program Active' : 'Program Paused'}
                </span>
                <span className={`text-[10px] font-bold ${configForm.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {configForm.enabled ? '● Live Across App' : '○ Paused'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmToggleState(!configForm.enabled);
                  setConfirmInputText('');
                }}
                disabled={saveConfigMutation.isPending}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none shadow-inner ${
                  configForm.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-300 ${
                    configForm.enabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 1: Earning Rules (Emerald) */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isEarningDirty ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">1. Points Earning Engine</h3>
                    {isEarningDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">How much customers earn when shopping on Dundu.</p>
                </div>
              </div>
              {isEarningDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Earning Rule'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Earning Rule
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Points Earned" badge="Points">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={configForm.earn_points}
                    onChange={(e) => setConfigForm((p) => ({ ...p, earn_points: parseInt(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Pts</span>
                </div>
              </Field>

              <Field label="Per Spend Amount (₹)" badge="Spend">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={configForm.spend_amount}
                    onChange={(e) => setConfigForm((p) => ({ ...p, spend_amount: parseFloat(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">INR</span>
                </div>
              </Field>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 font-medium flex items-center justify-between">
              <span>Active Rule:</span>
              <strong className="font-mono bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800">
                Earn {configForm.earn_points} Pts per ₹{configForm.spend_amount} Spend
              </strong>
            </div>
          </div>

          {/* Card 2: Redemption Rules (Rose/Pink) */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isRedemptionDirty ? 'border-pink-400 ring-2 ring-pink-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-50 border border-pink-200 text-pink-600 rounded-xl">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">2. Points Redemption & Discount Slabs</h3>
                    {isRedemptionDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">How points convert to direct checkout cash discount.</p>
                </div>
              </div>
              {isRedemptionDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Discount Rule'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                  Discount Rule
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Points Required Slab" badge="Points">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={configForm.redeem_points}
                    onChange={(e) => setConfigForm((p) => ({ ...p, redeem_points: parseInt(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Pts</span>
                </div>
              </Field>

              <Field label="Discount Value (₹)" badge="Discount">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={configForm.redeem_discount}
                    onChange={(e) => setConfigForm((p) => ({ ...p, redeem_discount: parseFloat(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">INR</span>
                </div>
              </Field>
            </div>

            <div className="p-3 bg-pink-50/70 border border-pink-200/80 rounded-2xl text-xs text-pink-900 font-medium flex items-center justify-between">
              <span>Valuation Rate:</span>
              <strong className="font-mono bg-white px-2.5 py-1 rounded-lg border border-pink-200 text-pink-800">
                {configForm.redeem_points} Pts = ₹{configForm.redeem_discount} OFF
              </strong>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE VIEW 3: ATM DIGITAL CARD PREVIEW (100% APP MEMBER)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'preview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Card Display & In-App Simulator */}
            <div className="lg:col-span-7 space-y-6">
              {/* Luxury Digital ATM Membership Card Stage */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 sm:p-10 rounded-3xl border border-indigo-500/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* THE DIGITAL ATM CARD */}
                <div
                  className="w-full max-w-[420px] aspect-[1.586/1] rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 transform hover:scale-[1.02] shadow-2xl border bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 border-indigo-400/40 text-white shadow-indigo-950/60"
                >
                  {/* Glass reflective shine line */}
                  <div className="absolute -top-1/2 left-0 w-full h-[200%] bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 pointer-events-none" />

                  {!prevShowBarcode ? (
                    /* FRONT CARD VIEW */
                    <div className="h-full flex flex-col justify-between relative z-10">
                      {/* Top Row: Brand & NFC */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl border bg-indigo-500/20 border-indigo-400/40 text-indigo-300">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-sm tracking-wider uppercase block leading-tight">
                              DUNDU ONLINE
                            </span>
                            <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase block">
                              APP REWARDS CLUB
                            </span>
                          </div>
                        </div>

                        {/* Member Pill & Contactless NFC */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-sm bg-indigo-500/20 text-indigo-200 border-indigo-400/50">
                            ★ APP MEMBER
                          </span>
                          <Wifi className="w-4 h-4 text-gray-400 rotate-90" />
                        </div>
                      </div>

                      {/* Middle Row: Realistic Gold EMV Chip & Points Balance Pill */}
                      <div className="flex items-center justify-between my-auto pt-2">
                        {/* Realistic 3D Gold Microchip */}
                        <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 p-1 border border-yellow-100 shadow-md relative overflow-hidden flex items-center justify-center">
                          <div className="w-full h-full border border-amber-800/40 rounded-sm grid grid-cols-2 grid-rows-2">
                            <div className="border-r border-b border-amber-800/40"></div>
                            <div className="border-b border-amber-800/40"></div>
                            <div className="border-r border-amber-800/40"></div>
                            <div></div>
                          </div>
                        </div>

                        {/* Glowing Points Balance Badge */}
                        <div className="text-right bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/15">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                            <span className="font-mono font-black text-base text-white">
                              {prevPoints.toLocaleString()} <span className="text-[10px] text-gray-300 font-sans font-bold">PTS</span>
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-400 font-bold">
                            ≈ ₹{Math.floor(prevPoints / (configForm.redeem_points || 200)) * (configForm.redeem_discount || 200)} App Cash
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Masked Card Number & Cardholder Info */}
                      <div className="space-y-1.5 pt-2">
                        <div className="font-mono text-sm sm:text-base tracking-[0.2em] font-semibold text-gray-200 text-shadow-sm">
                          4892 •••• •••• {prevPhone ? prevPhone.replace(/\D/g, '').slice(-4) || '9876' : '9876'}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                          <div>
                            <span className="text-[8px] text-gray-400 uppercase tracking-wider block">APP CARDHOLDER</span>
                            <span className="font-bold tracking-wide uppercase text-white truncate max-w-[180px] block">
                              {prevName || 'APP USER'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[8px] text-gray-400 uppercase tracking-wider block">MEMBER SINCE</span>
                            <span className="font-mono font-bold text-gray-200 block">{prevMemberSince}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* IN-APP QR / BARCODE VIEW */
                    <div className="h-full flex flex-col justify-between bg-white text-gray-900 rounded-2xl p-4 shadow-inner relative z-10">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                          Dundu App Mobile Wallet ID
                        </span>
                        <span className="text-[9px] font-bold text-gray-400">DUNDU APP v3.0</span>
                      </div>

                      {/* Simulated Vertical High-Density Barcode Lines */}
                      <div className="flex flex-col items-center justify-center my-auto py-2">
                        <div className="h-16 w-full flex items-center justify-center gap-[3px] bg-white px-2">
                          {[3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,2,3,4,1,2,3,1,4,2,1,3,2,4,1,3,2,1,4,2,3,1,2].map((w, idx) => (
                            <div
                              key={idx}
                              className={`h-full bg-black rounded-xs ${
                                w === 1 ? 'w-[2px]' : w === 2 ? 'w-[3px]' : w === 3 ? 'w-[4px]' : 'w-[5px]'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="font-mono font-black text-sm tracking-widest text-gray-900 mt-2">
                          {prevPhone ? prevPhone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : '9876 543 210'}
                        </p>
                      </div>

                      <div className="text-center border-t border-gray-100 pt-1.5">
                        <p className="text-[10px] text-gray-500 font-medium">
                          Digital membership identifier linked to customer online profile
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Live Card Customizer Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Live Card Customizer</h3>
                    <p className="text-xs text-gray-500">Real-time parameters for ATM visualizer.</p>
                  </div>
                </div>

                {/* Card View Switcher */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Card Side / Face:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrevShowBarcode(false)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        !prevShowBarcode
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      💳 Front EMV Chip
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrevShowBarcode(true)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        prevShowBarcode
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      📱 Digital Barcode ID
                    </button>
                  </div>
                </div>

                {/* Cardholder Name Input */}
                <Field label="Cardholder Full Name">
                  <input
                    type="text"
                    value={prevName}
                    onChange={(e) => setPrevName(e.target.value.toUpperCase())}
                    className={inp}
                    placeholder="e.g. ADARSH SHARMA"
                  />
                </Field>

                {/* Cardholder Mobile Phone */}
                <Field label="Customer Mobile Phone">
                  <input
                    type="text"
                    value={prevPhone}
                    onChange={(e) => setPrevPhone(e.target.value)}
                    className={inp}
                    placeholder="e.g. 9876543210"
                  />
                </Field>

                {/* Points Balance Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 uppercase tracking-wide">Points Balance:</span>
                    <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                      ★ {prevPoints.toLocaleString()} PTS
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={prevPoints}
                    onChange={(e) => setPrevPoints(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  {/* Quick points presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {[100, 200, 500, 1000, 2500, 5000].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setPrevPoints(pts)}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-bold text-gray-700 transition-colors cursor-pointer"
                      >
                        {pts} pts
                      </button>
                    ))}
                  </div>
                </div>

                {/* Member Since Year */}
                <Field label="Member Since Year">
                  <select
                    value={prevMemberSince}
                    onChange={(e) => setPrevMemberSince(e.target.value)}
                    className={inp}
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </Field>

                {/* Quick Info Box */}
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Real-Time Sync Active</span>
                  </div>
                  <p className="text-[11px] text-indigo-700/80">
                    All registered customer cards automatically inherit these dynamic visuals in their account portal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE VIEW 4: RULES & KNOWLEDGE GUIDE (100% PURE 20 PTS / ₹500)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (() => {
        const baseUnits = Math.floor((calcSpend || 0) / (configForm.spend_amount || 500));
        const totalEarnedPoints = baseUnits * (configForm.earn_points || 20);
        const voucherSlabs = Math.floor(totalEarnedPoints / (configForm.redeem_points || 200));
        const totalCashback = voucherSlabs * (configForm.redeem_discount || 200);
        const effectiveReturnPercent = calcSpend > 0 ? ((totalCashback / calcSpend) * 100).toFixed(1) : '0.0';

        const faqs = [
          {
            q: 'How many points does a customer earn on an order?',
            a: 'Customers earn exactly 20 points for every whole ₹500 spent on delivered orders (e.g. ₹500 = 20 pts, ₹1,000 = 40 pts, ₹1,500 = 60 pts, ₹2,500 = 100 pts, ₹5,000 = 200 pts).'
          },
          {
            q: 'How are points converted into checkout discounts?',
            a: 'Points convert at a flat rate: 200 points = ₹200 instant cash discount applied directly on the order checkout total.'
          },
          {
            q: 'When are loyalty points credited to the member’s mobile wallet?',
            a: 'Points are automatically credited in real-time as soon as the customer’s order status is updated to "Delivered" or "Completed". Pending or cancelled orders do not award points.'
          },
          {
            q: 'Can points be exchanged for physical cash or bank payout?',
            a: 'No. Points are digital loyalty currency exclusively redeemable for instant checkout discounts on Dundu Online app & web. They cannot be transferred to bank accounts or third-party wallets.'
          },
          {
            q: 'Do customer reward points ever expire?',
            a: 'Points have 100% lifetime validity and never expire as long as the customer has an active Dundu account.'
          },
          {
            q: 'What happens to points if an order is cancelled or refunded?',
            a: 'The system automatically debits the points that were awarded for the cancelled or returned order. If the customer used points to get a discount on a cancelled order, those redeemed points are refunded back to their wallet.'
          },
          {
            q: 'Can an Admin manually adjust or gift points to a customer?',
            a: 'Yes. Navigate to the "App Members" tab and click the Sparkles icon on any customer row to credit or debit points with an audit note.'
          },
          {
            q: 'What happens when the Master Program Switch is turned OFF?',
            a: 'Turning the Master Switch OFF temporarily suspends point earning and discount redemption storewide. All customer point balances remain 100% safe and preserved.'
          }
        ];

        return (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* ── 1. HERO BANNER & QUICK SNAPSHOT ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-rose-50/60 p-6 sm:p-8 rounded-3xl border border-indigo-100 shadow-[0_8px_30px_rgb(79,70,229,0.08)] space-y-6">
              {/* Decorative soft color blobs */}
              <div className="absolute -top-20 -right-16 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-14 w-64 h-64 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/80 backdrop-blur-sm text-indigo-700 border border-indigo-200 shadow-xs">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Program Knowledge & Rules
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    Loyalty Cards & Rewards Guide
                  </h2>
                  <p className="text-xs text-gray-600 max-w-3xl leading-relaxed font-medium">
                    Simple, transparent rewards for every Dundu Online app customer: Earn 20 points per ₹500 spent, and redeem 200 points for ₹200 OFF at checkout.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('control')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Configure Rules</span>
                  </button>
                </div>
              </div>

              {/* 4 Highlight Parameter Badges (Glass Cards) */}
              <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-emerald-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Earning Rate
                  </span>
                  <p className="text-sm font-bold text-gray-900">
                    20 Pts / ₹500 Spend
                  </p>
                  <span className="text-[11px] text-gray-500 block">floor(Order ÷ ₹500) × 20</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-pink-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 block">
                    Redemption Slab
                  </span>
                  <p className="text-sm font-bold text-gray-900">
                    200 Pts = ₹200 OFF
                  </p>
                  <span className="text-[11px] text-gray-500 block">1 Point = ₹1 Discount</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-amber-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    Point Validity
                  </span>
                  <p className="text-sm font-bold text-gray-900">
                    Lifetime Validity
                  </p>
                  <span className="text-[11px] text-gray-500 block">Points never expire</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-indigo-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Channel
                  </span>
                  <p className="text-sm font-bold text-gray-900">
                    100% App & Web
                  </p>
                  <span className="text-[11px] text-gray-500 block">Instant digital wallet</span>
                </div>
              </div>
            </div>

            {/* ── 2. VISUAL 4-STEP CUSTOMER JOURNEY ── */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
                  Step-by-Step Customer Journey
                </span>
                <h3 className="text-xl font-black text-gray-900">
                  How The Loyalty System Works (From Install to Discount)
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Clear visual flow of how an app customer earns and redeems rewards automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-200/80 shadow-xs space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      1
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Auto-Enrolled
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Auto Digital Card</h4>
                    <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                      Customer logs in to Dundu App. An integrated digital wallet card is created instantly with 0 paperwork.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-200/80 shadow-xs space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      2
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Earn Points
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Shop & Earn Points</h4>
                    <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                      For every whole ₹500 spent on delivered orders, the user earns exactly 20 points automatically.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-200/80 shadow-xs space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      3
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Accumulate
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Points Wallet</h4>
                    <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                      Points accumulate safely in customer profile with lifetime validity (no expiration).
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50/80 to-white border border-rose-200/80 shadow-xs space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      4
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      Instant Cash OFF
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">1-Click Redemption</h4>
                    <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                      At checkout, customers redeem in slabs of 200 Pts for ₹200 direct off their order total.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. INTERACTIVE LIVE RULE TESTER & SANDBOX ── */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Interactive Formula Sandbox</h3>
                    <p className="text-xs text-gray-500">Test order amounts to see the exact points earned and cash discount unlocked.</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
                  Live Calculator
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Inputs (5 Cols) */}
                <div className="lg:col-span-5 space-y-4 bg-gray-50/80 p-5 rounded-2xl border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Simulated Order Amount (₹):
                      </label>
                      <strong className="text-indigo-600 font-mono text-sm">₹{calcSpend.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={calcSpend}
                        onChange={(e) => setCalcSpend(Math.max(0, parseInt(e.target.value) || 0))}
                        className={inp}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">INR</span>
                    </div>

                    {/* Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {[500, 1000, 1500, 2000, 2500, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCalcSpend(val)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            calcSpend === val
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          ₹{val.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
                    <strong className="text-gray-900 block font-bold">Standard Rule:</strong>
                    <p>Every ₹500 spend = 20 points. Slabs round down to nearest ₹500 unit.</p>
                  </div>
                </div>

                {/* Calculation Output (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 block">
                      Calculation Breakdown
                    </span>
                    <div className="font-mono text-xs text-gray-800 space-y-2 bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                        <span className="text-gray-500">1. Qualifying Spend Units:</span>
                        <span className="font-bold text-gray-900">
                          floor(₹{calcSpend} ÷ ₹500) = {baseUnits} units
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                        <span className="text-gray-500">2. Points Earned (20 pts / unit):</span>
                        <span className="font-bold text-indigo-600">
                          {baseUnits} × 20 = {totalEarnedPoints} Points
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-gray-500">3. Direct Discount Unlocked:</span>
                        <span className="font-bold text-emerald-700">
                          {voucherSlabs} Slabs = ₹{totalCashback} OFF
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-3 bg-white rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Points Earned</span>
                        <strong className="text-base text-indigo-600 font-mono">+{totalEarnedPoints} PTS</strong>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Cashback Value</span>
                        <strong className="text-base text-emerald-600 font-mono">₹{totalCashback} OFF</strong>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Effective Return</span>
                        <strong className="text-base text-purple-600 font-mono">{effectiveReturnPercent}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. COMPLETE FORMULA & SLABS REFERENCE MATRIX ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Earning Matrix */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Earning Slabs Reference</h3>
                    <p className="text-xs text-gray-500">Order spend to loyalty points calculation (20 pts / ₹500 spend).</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                        <th className="pb-2">Order Spend</th>
                        <th className="pb-2">Spend Units</th>
                        <th className="pb-2">Points Earned</th>
                        <th className="pb-2">Cashback Equivalent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900">₹500</td>
                        <td className="py-2.5 text-gray-600">1 unit</td>
                        <td className="py-2.5 text-indigo-600 font-mono font-bold">20 Pts</td>
                        <td className="py-2.5 text-emerald-600 font-mono">₹20 Value</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900">₹1,000</td>
                        <td className="py-2.5 text-gray-600">2 units</td>
                        <td className="py-2.5 text-indigo-600 font-mono font-bold">40 Pts</td>
                        <td className="py-2.5 text-emerald-600 font-mono">₹40 Value</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900">₹1,500</td>
                        <td className="py-2.5 text-gray-600">3 units</td>
                        <td className="py-2.5 text-indigo-600 font-mono font-bold">60 Pts</td>
                        <td className="py-2.5 text-emerald-600 font-mono">₹60 Value</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900">₹2,000</td>
                        <td className="py-2.5 text-gray-600">4 units</td>
                        <td className="py-2.5 text-indigo-600 font-mono font-bold">80 Pts</td>
                        <td className="py-2.5 text-emerald-600 font-mono">₹80 Value</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900">₹2,500</td>
                        <td className="py-2.5 text-gray-600">5 units</td>
                        <td className="py-2.5 text-indigo-600 font-mono font-bold">100 Pts</td>
                        <td className="py-2.5 text-emerald-600 font-mono">₹100 Value</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900">₹5,000</td>
                        <td className="py-2.5 text-gray-600">10 units</td>
                        <td className="py-2.5 text-indigo-600 font-mono font-bold">200 Pts</td>
                        <td className="py-2.5 text-emerald-700 font-mono font-bold">₹200 OFF</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium">
                  Note: Every customer gets the same transparent 20 points per ₹500 spend on all delivered orders.
                </div>
              </div>

              {/* Redemption Matrix */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-xl border border-pink-200">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Redemption Slabs Reference</h3>
                    <p className="text-xs text-gray-500">How points convert to instant checkout cash vouchers.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                        <th className="pb-2">Point Balance</th>
                        <th className="pb-2">Voucher Slabs</th>
                        <th className="pb-2">Instant Cash OFF</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900 font-mono">200 Pts</td>
                        <td className="py-2.5 text-gray-600">1 Slab</td>
                        <td className="py-2.5 text-emerald-700 font-bold font-mono">₹200 OFF</td>
                        <td className="py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Unlocked</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900 font-mono">400 Pts</td>
                        <td className="py-2.5 text-gray-600">2 Slabs</td>
                        <td className="py-2.5 text-emerald-700 font-bold font-mono">₹400 OFF</td>
                        <td className="py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Unlocked</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900 font-mono">600 Pts</td>
                        <td className="py-2.5 text-gray-600">3 Slabs</td>
                        <td className="py-2.5 text-emerald-700 font-bold font-mono">₹600 OFF</td>
                        <td className="py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Unlocked</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900 font-mono">800 Pts</td>
                        <td className="py-2.5 text-gray-600">4 Slabs</td>
                        <td className="py-2.5 text-emerald-700 font-bold font-mono">₹800 OFF</td>
                        <td className="py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Unlocked</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-gray-900 font-mono">1,000 Pts</td>
                        <td className="py-2.5 text-gray-600">5 Slabs</td>
                        <td className="py-2.5 text-emerald-700 font-bold font-mono">₹1,000 OFF</td>
                        <td className="py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Unlocked</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-pink-50 rounded-xl border border-pink-200 text-[11px] text-pink-900 font-medium">
                  Slabs rule: 1 point = ₹1 value in 200-point batches. Remaining points stay stored in the customer's wallet.
                </div>
              </div>
            </div>

            {/* ── 5. CORE PROGRAM RULES AT A GLANCE ── */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
                  Simple & Fair
                </span>
                <h3 className="text-xl font-black text-gray-900">
                  Program Highlights & Core Benefits
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Consistent rules that every Dundu Online shopper enjoys automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-gray-900">20 Pts / ₹500 Spend</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    Every order above ₹500 automatically credits 20 points per ₹500 spend directly to customer wallet upon delivery.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-gray-900">100% Digital Wallet</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    Card and barcode are built directly into the Dundu App profile. No cards to carry or lose.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-white border border-rose-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                    <Gift className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-gray-900">200 Pts = ₹200 OFF</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    Points redeem in clean 200-point slabs for direct ₹200 instant cash discount during checkout.
                  </p>
                </div>
              </div>
            </div>

            {/* ── 6. PROGRAM POLICIES & KNOWLEDGE FAQ ── */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Program Policies & Frequently Asked Questions</h3>
                  <p className="text-xs text-gray-500">Essential rules and administrative handling scenarios.</p>
                </div>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200 bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4.5 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-gray-900 pr-4 flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          {faq.q}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-indigo-600' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 pt-1 text-xs text-gray-600 font-medium leading-relaxed bg-gray-50/50 border-t border-gray-100 animate-in fade-in duration-150">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MASTER TOGGLE TEXT-TYPING CONFIRMATION MODAL ── */}
      {confirmToggleState !== null && (() => {
        const requiredWord = confirmToggleState ? 'ACTIVATE' : 'PAUSE';
        const isMatched = confirmInputText.trim().toUpperCase() === requiredWord;

        return (
          <Modal
            title={confirmToggleState ? 'Activate Loyalty Program?' : 'Pause Loyalty Program?'}
            onClose={() => {
              setConfirmToggleState(null);
              setConfirmInputText('');
            }}
          >
            <div className="space-y-4">
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl border text-xs font-medium ${
                  confirmToggleState
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {confirmToggleState ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <p className="leading-relaxed">
                  {confirmToggleState
                    ? 'Activating the loyalty program will immediately allow app customers to earn reward points on new orders and redeem their points balance for instant discounts at checkout.'
                    : 'Pausing the loyalty program will temporarily disable point earning on new orders and prevent customers from applying loyalty discounts at checkout.'}
                </p>
              </div>

              {/* Text-Typing Confirmation Input */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-gray-700 block">
                  Please type <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-300">{requiredWord}</span> to confirm:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    placeholder={`Type "${requiredWord}"`}
                    autoFocus
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono font-bold tracking-widest text-center uppercase focus:outline-none transition-all ${
                      isMatched
                        ? 'border-emerald-400 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-200'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                    }`}
                  />
                  {isMatched && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 text-center font-medium">
                  {isMatched ? (
                    <span className="text-emerald-600 font-bold">✓ Keyword matched. Ready to proceed.</span>
                  ) : (
                    `Action button is locked until you type "${requiredWord}".`
                  )}
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmToggleState(null);
                    setConfirmInputText('');
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isMatched) return;
                    const targetVal = confirmToggleState;
                    setConfirmToggleState(null);
                    setConfirmInputText('');
                    handleMasterToggle(targetVal);
                  }}
                  disabled={!isMatched || saveConfigMutation.isPending}
                  className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirmToggleState
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                  }`}
                >
                  {confirmToggleState ? 'Yes, Activate Program' : 'Yes, Pause Program'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <Modal title="Create Loyalty Card" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createMutation.mutate({
                phone: fd.get('phone'),
                name: fd.get('name'),
                points: parseInt(fd.get('points')) || configForm.welcome_bonus || 0,
                total_spent: parseFloat(fd.get('total_spent')) || 0,
              });
            }}
            className="space-y-4"
          >
            <Field label="Phone Number *">
              <input name="phone" placeholder="10-digit mobile number" required className={inp} />
            </Field>
            <Field label="Customer Name">
              <input name="name" placeholder="Full name" className={inp} />
            </Field>
            <Field label="Initial Points">
              <input name="points" type="number" defaultValue={configForm.welcome_bonus || 0} className={inp} />
            </Field>
            <Field label="Initial Total Spent (₹)">
              <input name="total_spent" type="number" defaultValue={0} className={inp} />
            </Field>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 cursor-pointer">
                {createMutation.isPending ? 'Saving...' : 'Save Card'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── EDIT MODAL ── */}
      {editCard && (
        <Modal title={`Edit Card · ${editCard.phone}`} onClose={() => setEditCard(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateMutation.mutate({
                phone: editCard.phone,
                data: {
                  name: fd.get('name'),
                  points: parseInt(fd.get('points')),
                  total_spent: parseFloat(fd.get('total_spent')),
                },
              });
            }}
            className="space-y-4"
          >
            <Field label="Customer Name">
              <input name="name" defaultValue={editCard.name || ''} className={inp} />
            </Field>
            <Field label="Points Balance">
              <input name="points" type="number" defaultValue={editCard.points} className={inp} />
            </Field>
            <Field label="Total Spent (₹)">
              <input name="total_spent" type="number" defaultValue={editCard.total_spent} className={inp} />
            </Field>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setEditCard(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 cursor-pointer">
                {updateMutation.isPending ? 'Saving...' : 'Update Card'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ADJUST POINTS MODAL ── */}
      {adjustCard && (
        <Modal title={`Adjust Points · ${adjustCard.name || adjustCard.phone}`} onClose={() => setAdjustCard(null)}>
          <form onSubmit={handleSubmitAdjust} className="space-y-4">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1">
              <span className="text-gray-500 font-medium">Current Balance:</span>
              <p className="text-lg font-black text-indigo-600">★ {adjustCard.points} Points</p>
            </div>

            <Field label="Adjustment Type">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('credit')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    adjustType === 'credit'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  + Credit (Add Points)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('debit')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    adjustType === 'debit'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  − Debit (Deduct Points)
                </button>
              </div>
            </Field>

            <Field label="Points to Adjust *">
              <input
                type="number"
                min="1"
                placeholder="e.g. 100"
                value={adjustPointsVal}
                onChange={(e) => setAdjustPointsVal(e.target.value)}
                required
                className={inp}
              />
            </Field>

            <Field label="Reason / Note">
              <input
                type="text"
                placeholder="e.g. In-store bonus, reward correction, special promo"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className={inp}
              />
            </Field>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setAdjustCard(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" disabled={adjustMutation.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 cursor-pointer">
                {adjustMutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── APP MEMBER DIGITAL CARD MODAL ── */}
      {barcodeCard && (
        <Modal title={`App Member Card · ${barcodeCard.name || barcodeCard.phone}`} onClose={() => setBarcodeCard(null)}>
          <div className="space-y-4 text-center">
            <p className="text-xs text-gray-500">
              Customer mobile app loyalty card identifier for Dundu Online App Wallet.
            </p>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Dundu App Member Wallet ID</p>
              
              {/* Simulated barcode */}
              <div className="py-2 flex items-center justify-center gap-1 overflow-hidden px-2">
                {[4, 2, 6, 2, 4, 8, 2, 4, 6, 2, 8, 4, 2, 6, 4, 2, 8, 2, 4, 6, 2, 4, 8, 4].map((h, i) => (
                  <div key={i} className="bg-black rounded-xs" style={{ width: `${(i % 3) + 2}px`, height: '52px' }} />
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-base font-bold tracking-widest text-gray-900">
                  {barcodeCard.phone}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(barcodeCard.phone);
                    setCopiedPhone(true);
                    toast.success('Phone copied to clipboard');
                    setTimeout(() => setCopiedPhone(false), 2000);
                  }}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                  title="Copy Phone"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">App Points Balance</span>
                <span className="font-black text-indigo-600 text-sm">★ {barcodeCard.points}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Checkout Discount Value</span>
                <span className="font-black text-emerald-600 text-sm">
                  ₹{Math.floor((barcodeCard.points || 0) / (configForm.redeem_points || 200)) * (configForm.redeem_discount || 200)} OFF
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setBarcodeCard(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteCard && (
        <Modal title="Delete Loyalty Card" onClose={() => setDeleteCard(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>Are you sure you want to delete the loyalty card for <strong>{deleteCard.name || deleteCard.phone}</strong>? This cannot be undone.</span>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setDeleteCard(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteCard.phone)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 cursor-pointer"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Card'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
