import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, MessageCircle, Send, Users, User, Clock,
  CheckCircle2, XCircle, Loader2, Search, Sparkles, Tag,
  Ticket, ShoppingCart, CreditCard, Flame, PenTool, Check,
  RefreshCw, Smartphone, ShieldCheck, AlertCircle, X, HelpCircle
} from 'lucide-react';
import { whatsappApi, settingsApi } from '../../../api';
import StatCard from '../../../components/ui/StatCard';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

/* ── Standard Clean Professional Templates (Zero Emojis) ── */
const TEMPLATES = [
  {
    id: 'welcome',
    label: 'Welcome & Onboarding',
    icon: Sparkles,
    badge: 'Onboarding',
    message:
      `Welcome to Dundu Online, *{name}*!\n\n` +
      `We are delighted to have you with us.\n\n` +
      `Explore our curated collections across Women, Kids, Newborn & Maternity fashion.\n\n` +
      `Use voucher code *WELCOME10* at checkout to enjoy 10% off your very first order.\n\n` +
      `Start shopping: {store_url}\n\n` +
      `Dundu Online — Premium Fashion for Every Moment.`,
  },
  {
    id: 'offer',
    label: 'Exclusive Discount Offer',
    icon: Tag,
    badge: 'Promotional',
    message:
      `Hello *{name}*,\n\n` +
      `An exclusive promotional event is now live at Dundu Online.\n\n` +
      `Enjoy curated discounts across our highest-rated styles for a limited time.\n\n` +
      `Shop the collection: {store_url}\n\n` +
      `Dundu Online — Premium Fashion for Every Moment.`,
  },
  {
    id: 'referral',
    label: 'Refer & Earn Rewards',
    icon: Users,
    badge: 'Viral Growth',
    message:
      `Hello *{name}*,\n\n` +
      `Invite your friends to Dundu Online and earn exclusive shopping rewards.\n\n` +
      `When your friend completes their first purchase, they receive *30% OFF*, and you receive *20% OFF* on your next checkout.\n\n` +
      `Share your referral code from your Dundu account: {store_url}/referral\n\n` +
      `Dundu Online — Refer & Earn Program.`,
  },
  {
    id: 'cart',
    label: 'Cart Recovery Reminder',
    icon: ShoppingCart,
    badge: 'High Conversion',
    message:
      `Hello *{name}*,\n\n` +
      `You have items waiting in your shopping bag at Dundu Online.\n\n` +
      `Complete your order before inventory sells out:\n\n` +
      `Review your cart: {store_url}/cart\n\n` +
      `Need assistance? Reply directly to this WhatsApp message.\n\n` +
      `Dundu Online Customer Care.`,
  },
  {
    id: 'coupon',
    label: 'Voucher Code Announcement',
    icon: Ticket,
    badge: 'Incentive',
    message:
      `Hello *{name}*,\n\n` +
      `Here is a special savings voucher reserved for you:\n\n` +
      `Coupon Code: *{code}*\n\n` +
      `Apply this code during cart checkout to receive your discount. Valid for a limited time.\n\n` +
      `Shop now: {store_url}\n\n` +
      `Dundu Online Support.`,
  },
  {
    id: 'new_arrival',
    label: 'New Season Collection',
    icon: Flame,
    badge: 'Catalog Update',
    message:
      `Hello *{name}*,\n\n` +
      `Fresh seasonal designs have just arrived at Dundu Online.\n\n` +
      `Discover new trends in Maternity, Newborn, Kids, and Women's fashion.\n\n` +
      `Explore new arrivals: {store_url}/products\n\n` +
      `Dundu Online — Premium Fashion for Every Moment.`,
  },
  {
    id: 'payment',
    label: 'Pending Order Payment',
    icon: CreditCard,
    badge: 'Transactional',
    message:
      `Hello *{name}*,\n\n` +
      `You have a pending order awaiting confirmation at Dundu Online.\n\n` +
      `Please complete your payment to finalize dispatch.\n\n` +
      `Review order: {store_url}/orders\n\n` +
      `Need support? Reply to this message.\n\n` +
      `Dundu Online Support.`,
  },
  {
    id: 'custom',
    label: 'Custom Campaign Draft',
    icon: PenTool,
    badge: 'Custom',
    message: '',
  },
];

const STATUS_BADGES = {
  sent: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Delivered', icon: CheckCircle2 },
  failed: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Failed', icon: XCircle },
  partial: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Partial Delivery', icon: AlertCircle },
  sending: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Sending in Background', icon: Loader2 },
};

export default function WhatsAppBroadcast() {
  const qc = useQueryClient();
  const textareaRef = useRef(null);

  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'logs'
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [message, setMessage] = useState(TEMPLATES[0].message);
  const [recipientType, setRecipientType] = useState('all'); // 'all' | 'cart' | 'individual'
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ── Filter States for Logs ── */
  const [logStatus, setLogStatus] = useState('all');
  const [logRecipient, setLogRecipient] = useState('all');
  const [logSearch, setLogSearch] = useState('');

  /* ── Fetch Stats ── */
  const { data: statsData, isFetching: isStatsFetching } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const res = await whatsappApi.getStats();
      return res.data || res;
    },
  });
  const stats = statsData || {};

  /* ── Fetch Settings for Referral Pct ── */
  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.get,
  });
  const settings = settingsData?.data?.settings || {};
  const referrerPct = settings.referrer_discount_percent ?? '20';
  const referredPct = settings.referred_discount_percent ?? '30';

  /* ── Fetch Logs ── */
  const { data: logsData, isLoading: logsLoading, isFetching: isLogsFetching } = useQuery({
    queryKey: ['whatsapp-logs', logStatus, logRecipient, logSearch],
    queryFn: async () => {
      const res = await whatsappApi.getLogs({
        status: logStatus !== 'all' ? logStatus : undefined,
        recipient: logRecipient !== 'all' ? logRecipient : undefined,
        search: logSearch.trim() || undefined,
      });
      return res.data || res;
    },
    enabled: activeTab === 'logs',
  });
  const logs = logsData?.logs || [];

  /* ── Fetch Users for Individual Target ── */
  const { data: usersData, isFetching: isUsersFetching } = useQuery({
    queryKey: ['whatsapp-users', userSearch],
    queryFn: () => whatsappApi.getUsers(userSearch),
    enabled: recipientType === 'individual',
    staleTime: 5000,
  });
  const users = usersData?.data?.users || usersData?.users || [];

  /* ── Handle Template Selection ── */
  const pickTemplate = (t) => {
    setSelectedTemplate(t);
    let msg = t.message;
    if (t.id === 'referral') {
      msg = msg
        .replace('{referred_discount}', referredPct)
        .replace('{referrer_discount}', referrerPct);
    }
    setMessage(msg);
  };

  /* ── Quick Variable Insertion ── */
  const insertVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) {
      setMessage((prev) => prev + variable);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = message;
    const updated = text.substring(0, start) + variable + text.substring(end);
    setMessage(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  /* ── Send Broadcast ── */
  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message text cannot be empty');
      return;
    }
    if (recipientType === 'individual' && !selectedUser) {
      toast.error('Please select a recipient customer');
      return;
    }

    setSending(true);
    setShowConfirm(false);

    try {
      const payload = {
        recipient: recipientType,
        message: message.trim(),
        template: selectedTemplate.id,
        ...(recipientType === 'individual' ? { user_id: selectedUser.id } : {}),
      };

      const res = await whatsappApi.send(payload);
      const d = res.data;

      if (d.queued) {
        toast.success(`Broadcasting to ${d.user_count} customers in background`);
      } else {
        toast.success(`Message sent to ${d.to || 'recipient'}`);
      }

      qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-stats'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  /* ── Live Message Preview Text ── */
  const previewRenderedText = useMemo(() => {
    const sampleName = selectedUser?.name || 'Priya Sharma';
    const storeUrl = 'dundu.com';
    const sampleCode = 'SAVE20';

    return (
      message
        .replace(/\{name\}/gi, sampleName)
        .replace(/\{store_url\}/gi, storeUrl)
        .replace(/\{code\}/gi, sampleCode)
        .replace(/\{phone\}/gi, selectedUser?.phone || '+91 98765 43210') ||
      'Type your message on the left to see live WhatsApp preview...'
    );
  }, [message, selectedUser]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  WhatsApp Broadcast & Customer Engagement
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active API
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Send targeted campaigns, welcome onboarding, cart recovery reminders, and announcements via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions: Tabs + Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-xs">
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Campaign</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Delivery History</span>
            </button>
          </div>

          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['whatsapp-stats'] });
              qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
              toast.success('Broadcast data refreshed');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isStatsFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Executive KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Broadcasts"
          value={stats.total_campaigns ?? 0}
          icon={MessageCircle}
          color="indigo"
          sub="Dispatched campaign broadcasts"
        />
        <StatCard
          title="Reachable Customers"
          value={stats.reachable_customers ?? 0}
          icon={Users}
          color="emerald"
          sub="Verified phone numbers in store"
        />
        <StatCard
          title="Cart Abandoners"
          value={stats.cart_abandoners ?? 0}
          icon={ShoppingCart}
          color="amber"
          sub="Shoppers with unpurchased carts"
        />
        <StatCard
          title="Delivered Messages"
          value={stats.total_recipients ?? 0}
          icon={CheckCircle2}
          color="blue"
          sub="Combined recipient deliveries"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: COMPOSE & BROADCAST STUDIO
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
          {/* Left Column: Template Selector & Target Audience (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Audience Targeting Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Target Audience
                    </h3>
                    <p className="text-[11px] text-slate-500">Select who receives this campaign</p>
                  </div>
                </div>
              </div>

              {/* Audience Segments */}
              <div className="space-y-2">
                {[
                  {
                    id: 'all',
                    title: 'All Registered Customers',
                    count: stats.reachable_customers ?? 0,
                    desc: 'Broadcast to all customers with active phone numbers',
                    icon: Users,
                  },
                  {
                    id: 'cart',
                    title: 'Active Cart Abandoners',
                    count: stats.cart_abandoners ?? 0,
                    desc: 'Target users who currently have items in cart',
                    icon: ShoppingCart,
                  },
                  {
                    id: 'individual',
                    title: 'Single Customer (1-to-1)',
                    count: null,
                    desc: 'Direct test or VIP customer individual message',
                    icon: User,
                  },
                ].map((seg) => {
                  const Icon = seg.icon;
                  const isSelected = recipientType === seg.id;

                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => {
                        setRecipientType(seg.id);
                        if (seg.id !== 'individual') setSelectedUser(null);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold">{seg.title}</span>
                        </div>
                        {seg.count !== null && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {seg.count} Users
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-1 line-clamp-1 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {seg.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Individual User Search Modal / Dropdown */}
              {recipientType === 'individual' && (
                <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                    Find Customer
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search name, phone, or email..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  {selectedUser && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-900 truncate">{selectedUser.name}</p>
                        <p className="text-[11px] text-emerald-700 font-mono">{selectedUser.phone}</p>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold p-1"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {!selectedUser && (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1 divide-y divide-slate-100">
                      {isUsersFetching ? (
                        <p className="text-xs text-slate-400 text-center py-4">Searching customers...</p>
                      ) : users.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No customers matching query</p>
                      ) : (
                        users.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="w-full text-left p-2 rounded-lg hover:bg-white text-xs transition-colors cursor-pointer"
                          >
                            <p className="font-bold text-slate-900 truncate">{u.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.phone}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Campaign Templates Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Message Templates
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {TEMPLATES.length} Presets
                </span>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedTemplate.id === t.id;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTemplate(t)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white border-slate-200/70 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold truncate">{t.label}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Column: Message Composer (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Campaign Copy Editor</h3>
                    <p className="text-xs text-slate-500">Draft your message text and dynamic parameters</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {message.length} chars
                  </span>
                </div>

                {/* Quick Variable Insertion Chips */}
                <div className="pt-3 pb-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>1-Click Insert Variables</span>
                    <span>Click to insert at cursor</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { tag: '{name}', label: 'Customer Name' },
                      { tag: '{store_url}', label: 'Store Link' },
                      { tag: '{code}', label: 'Coupon Code' },
                      { tag: '{phone}', label: 'Phone' },
                    ].map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertVariable(v.tag)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="text-indigo-600 font-mono font-black">{v.tag}</span>
                        <span className="text-[10px] text-slate-500">({v.label})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="mt-2">
                  <textarea
                    ref={textareaRef}
                    rows={12}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your WhatsApp broadcast copy here..."
                    className="w-full p-4 rounded-2xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium leading-relaxed resize-none bg-slate-50/30 focus:bg-white"
                  />
                </div>

                {/* Formatting Guidance */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span>Formatting:</span>
                    <code>*bold*</code>
                    <code>_italic_</code>
                    <code>~strike~</code>
                  </div>
                  <span className="text-slate-400">Supports standard WhatsApp markdown</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={
                    sending || !message.trim() || (recipientType === 'individual' && !selectedUser)
                  }
                  onClick={() => setShowConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {recipientType === 'all'
                          ? `Broadcast to All (${stats.reachable_customers ?? 0} Customers)`
                          : recipientType === 'cart'
                          ? `Broadcast to Cart Abandoners (${stats.cart_abandoners ?? 0} Users)`
                          : `Send to ${selectedUser?.name || 'Selected Customer'}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Smartphone WhatsApp Mockup (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    WhatsApp Live Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Real-Time
                </span>
              </div>

              {/* Smartphone Frame */}
              <div className="relative rounded-[28px] border-4 border-slate-800 bg-[#efeae2] shadow-xl overflow-hidden min-h-[460px] flex flex-col justify-between">
                {/* WhatsApp Chat Header */}
                <div className="bg-[#075e54] text-white px-3.5 py-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white text-[#075e54] flex items-center justify-center font-black text-xs shrink-0">
                      D
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold truncate">Dundu Online</p>
                        <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                      </div>
                      <p className="text-[9px] text-emerald-100/80 leading-none">Online • Verified Store</p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Body */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {/* Date badge */}
                  <div className="text-center">
                    <span className="text-[9px] font-semibold text-slate-600 bg-white/80 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                      Today
                    </span>
                  </div>

                  {/* Incoming WhatsApp Speech Bubble */}
                  <div className="flex flex-col items-start">
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-xs p-3 text-xs text-slate-800 shadow-xs max-w-[94%] space-y-1.5 break-words">
                      <p className="whitespace-pre-wrap leading-relaxed font-sans text-[11px]">
                        {previewRenderedText}
                      </p>

                      {/* Timestamp & Delivery Ticks */}
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 pt-0.5">
                        <span>
                          {new Date().toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                        <span className="text-[#34b7f1] font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone Bottom Notch / Bar */}
                <div className="bg-slate-100 py-1.5 px-4 text-center border-t border-slate-200">
                  <div className="w-16 h-1 bg-slate-300 rounded-full mx-auto"></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">Preview Note</p>
                <p>
                  Tags like <code className="text-indigo-600 font-bold">&#123;name&#125;</code> and{' '}
                  <code className="text-indigo-600 font-bold">&#123;store_url&#125;</code> are dynamically replaced with each customer’s real profile data during delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: BROADCAST DELIVERY HISTORY & LOGS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search broadcast message keywords..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['all', 'sent', 'sending', 'failed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setLogStatus(s)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer capitalize ${
                      logStatus === s
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'all' ? 'All Status' : s}
                  </button>
                ))}
              </div>

              {/* Recipient Segment Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {[
                  { id: 'all', label: 'All Segments' },
                  { id: 'cart', label: 'Cart Only' },
                  { id: 'individual', label: 'Individual' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setLogRecipient(r.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      logRecipient === r.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="text-center py-20 text-slate-400 text-sm">
                <RefreshCw className="w-7 h-7 mx-auto mb-2 animate-spin text-slate-300" />
                Loading broadcast logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-slate-400 space-y-2">
                <Clock className="w-10 h-10 mx-auto text-slate-300 opacity-60" />
                <p className="text-sm font-bold text-slate-600">No broadcast history found</p>
                <p className="text-xs text-slate-400">Campaign dispatches will appear here with delivery receipts</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200/80 shadow-xs">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Dispatched Date</th>
                      <th className="px-5 py-3.5 font-bold">Audience / Target</th>
                      <th className="px-5 py-3.5 font-bold">Template Type</th>
                      <th className="px-5 py-3.5 font-bold">Message Content</th>
                      <th className="px-5 py-3.5 font-bold">Sent By</th>
                      <th className="px-5 py-3.5 font-bold text-right">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {logs.map((log) => {
                      const badge = STATUS_BADGES[log.status] || STATUS_BADGES.sent;
                      const StatusIcon = badge.icon;
                      const formattedDate = log.created_at
                        ? new Date(log.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {log.recipient === 'all' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Users className="w-3 h-3 text-indigo-600" />
                                All Users ({log.user_count})
                              </span>
                            ) : log.recipient === 'cart' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <ShoppingCart className="w-3 h-3 text-amber-600" />
                                Cart Abandoners ({log.user_count})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                <User className="w-3 h-3 text-slate-500" />
                                Individual
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-700 capitalize">
                            {(log.template || 'custom').replace('_', ' ')}
                          </td>
                          <td className="px-5 py-3.5 max-w-sm">
                            <p className="truncate text-slate-800 font-medium" title={log.message}>
                              {log.message}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-medium">
                            {log.sent_by_name || 'Admin'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}
                            >
                              <StatusIcon
                                className={`w-3 h-3 ${log.status === 'sending' ? 'animate-spin' : ''}`}
                              />
                              {badge.label}
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
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Broadcast Send</h3>
                <p className="text-xs text-slate-500">
                  {recipientType === 'all'
                    ? `Dispatch to all ${stats.reachable_customers ?? 0} customers with active phone numbers`
                    : recipientType === 'cart'
                    ? `Dispatch to all ${stats.cart_abandoners ?? 0} cart abandoners`
                    : `Dispatch to individual customer: ${selectedUser?.name}`}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed font-sans">
              {previewRenderedText}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {sending ? 'Broadcasting...' : 'Yes, Confirm & Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
