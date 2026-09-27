import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, MessageCircle, Send, Users, User, Clock,
  CheckCircle2, XCircle, Loader2, Search, Sparkles, Tag,
  Ticket, ShoppingCart, CreditCard, Flame, PenTool, Check,
  RefreshCw, Smartphone, ShieldCheck, AlertCircle, X,
  Phone, Video, MoreVertical, Smile, Paperclip, Mic, ExternalLink,
  Copy, Info, ArrowRight, Zap
} from 'lucide-react';
import { whatsappApi, settingsApi } from '../../../api';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

/* ── Rich & Engaging WhatsApp Templates ── */
const TEMPLATES = [
  {
    id: 'welcome',
    label: 'Welcome & 10% Off',
    icon: Sparkles,
    badge: 'Onboarding',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200',
    lightBg: 'bg-emerald-50/70',
    textCol: 'text-emerald-700',
    message:
      `🎉 Welcome to Dundu Online, *{name}*!\n\n` +
      `We are thrilled to welcome you to our family! Explore curated collections across Women, Kids, Newborn & Maternity fashion.\n\n` +
      `🎁 *Special Welcome Gift:*\nUse code *WELCOME10* at checkout to enjoy *10% OFF* on your very first order.\n\n` +
      `🛍️ Start shopping now:\n{store_url}\n\n` +
      `Dundu Online — Premium Fashion for Every Moment ✨`,
  },
  {
    id: 'cart',
    label: 'Cart Recovery Alert',
    icon: ShoppingCart,
    badge: 'High Recovery',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-200',
    lightBg: 'bg-amber-50/70',
    textCol: 'text-amber-700',
    message:
      `🛒 Hello *{name}*,\n\n` +
      `You left some beautiful items in your shopping bag at Dundu Online!\n\n` +
      `⚡ Stocks are limited and items sell out fast. Complete your purchase now to secure your favorite styles.\n\n` +
      `👉 View your saved cart:\n{store_url}/cart\n\n` +
      `Need help with sizing or payment? Simply reply directly to this chat! 💬`,
  },
  {
    id: 'offer',
    label: 'Flash Sale & Promo',
    icon: Flame,
    badge: 'Promotional',
    color: 'from-rose-500 to-pink-600',
    border: 'border-rose-200',
    lightBg: 'bg-rose-50/70',
    textCol: 'text-rose-700',
    message:
      `🔥 Exclusive Flash Sale is LIVE, *{name}*!\n\n` +
      `Enjoy exciting discounts across our highest-rated ethnic & western styles for a very limited time.\n\n` +
      `✨ Handpicked for you with premium fabrics & trending cuts.\n\n` +
      `🛍️ Explore the sale before stock ends:\n{store_url}\n\n` +
      `Dundu Online — Quality you love at prices you desire! 💖`,
  },
  {
    id: 'coupon',
    label: 'Special Voucher Code',
    icon: Ticket,
    badge: 'Incentive',
    color: 'from-purple-500 to-indigo-600',
    border: 'border-purple-200',
    lightBg: 'bg-purple-50/70',
    textCol: 'text-purple-700',
    message:
      `🎁 Special Gift for You, *{name}*!\n\n` +
      `Here is an exclusive savings voucher reserved just for your account:\n\n` +
      `🎟️ Coupon Code: *{code}*\n\n` +
      `Apply this code during checkout for an instant discount on your order. Valid for the next 48 hours!\n\n` +
      `🛍️ Redeem now: {store_url}\n\n` +
      `Happy Shopping from Dundu Online! ✨`,
  },
  {
    id: 'referral',
    label: 'Refer & Earn Rewards',
    icon: Users,
    badge: 'Viral Growth',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-200',
    lightBg: 'bg-cyan-50/70',
    textCol: 'text-cyan-700',
    message:
      `👥 Share the love & earn, *{name}*!\n\n` +
      `Invite your best friends to shop at Dundu Online and unlock mutual rewards:\n\n` +
      `🌟 Your friend gets *{referred_discount}% OFF* on their first order.\n` +
      `💰 You receive *{referrer_discount}% OFF* coupon on your next checkout!\n\n` +
      `🔗 Grab your personal referral link:\n{store_url}/referral\n\n` +
      `Dundu Online Community Program 💖`,
  },
  {
    id: 'new_arrival',
    label: 'New Season Drop',
    icon: Tag,
    badge: 'Catalog',
    color: 'from-teal-500 to-emerald-600',
    border: 'border-teal-200',
    lightBg: 'bg-teal-50/70',
    textCol: 'text-teal-700',
    message:
      `✨ Fresh New Arrivals Just Dropped, *{name}*!\n\n` +
      `Our newest seasonal catalog is here with breathtaking designs in Women, Newborn, Kids & Maternity wear.\n\n` +
      `🌿 Crafted with breathable luxury fabrics perfect for daily elegance.\n\n` +
      `👗 Browse newest styles first:\n{store_url}/products\n\n` +
      `Dundu Online — Step out in style! ✨`,
  },
  {
    id: 'payment',
    label: 'Payment Pending',
    icon: CreditCard,
    badge: 'Orders',
    color: 'from-amber-600 to-yellow-600',
    border: 'border-amber-200',
    lightBg: 'bg-amber-50/70',
    textCol: 'text-amber-800',
    message:
      `💳 Hello *{name}*,\n\n` +
      `Your recent order at Dundu Online is awaiting payment confirmation.\n\n` +
      `Please complete the payment to ensure prompt packaging and same-day dispatch.\n\n` +
      `📦 Review & pay now:\n{store_url}/orders\n\n` +
      `Questions? Reply to this message for immediate support! 💬`,
  },
  {
    id: 'custom',
    label: 'Blank Custom Draft',
    icon: PenTool,
    badge: 'Custom',
    color: 'from-slate-600 to-slate-800',
    border: 'border-slate-200',
    lightBg: 'bg-slate-50',
    textCol: 'text-slate-700',
    message: '',
  },
];

const QUICK_EMOJIS = ['✨', '🎉', '🎁', '🔥', '🛒', '🛍️', '👗', '💖', '⚡', '💬', '👉', '🌟'];

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
  const [previewModalMsg, setPreviewModalMsg] = useState(null);

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
        .replace(/\{referred_discount\}/g, referredPct)
        .replace(/\{referrer_discount\}/g, referrerPct);
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

  /* ── Quick Emoji Insertion ── */
  const insertEmoji = (emoji) => {
    insertVariable(emoji);
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
        toast.success(`Broadcasting to ${d.user_count} customers in background!`);
      } else {
        toast.success(`Message sent to ${d.to || 'recipient'}!`);
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
      'Type your message on the left or select a template above to see the live WhatsApp preview...'
    );
  }, [message, selectedUser]);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ─── 1. Colorful Hero Header ────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/12 via-teal-500/10 to-cyan-500/15 p-6 rounded-3xl border border-emerald-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white px-3.5 py-1 rounded-full shadow-xs">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Marketing & CRM
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Gateway Connected
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
            WhatsApp Broadcast & Customer Engagement
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Dispatch personalized WhatsApp campaigns, abandoned cart recovery alerts, welcome onboarding, and promotional vouchers with high open rates.
          </p>
        </div>

        {/* Top Switcher Tabs & Refresh */}
        <div className="relative z-10 flex items-center gap-2.5 flex-wrap self-start md:self-center">
          <div className="flex items-center p-1 bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-200 shadow-xs">
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Broadcast</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
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
              toast.success('WhatsApp data refreshed');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isStatsFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── 2. Vibrant KPI Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Campaigns */}
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white rounded-2xl p-4 sm:p-5 border border-emerald-200/90 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total Broadcasts</span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5">
            {stats.total_campaigns ?? 0}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Dispatched campaigns
          </p>
        </div>

        {/* Reachable Customers */}
        <div className="bg-gradient-to-br from-cyan-500/15 via-sky-500/5 to-white rounded-2xl p-4 sm:p-5 border border-cyan-200/90 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Reachable Shoppers</span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5">
            {stats.reachable_customers ?? 0}
          </p>
          <p className="text-[11px] text-cyan-700 font-semibold mt-1 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-cyan-600" /> Active phone numbers
          </p>
        </div>

        {/* Cart Abandoners */}
        <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-white rounded-2xl p-4 sm:p-5 border border-amber-200/90 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Cart Abandoners</span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5">
            {stats.cart_abandoners ?? 0}
          </p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-600" /> Unpurchased bags
          </p>
        </div>

        {/* Delivered Messages */}
        <div className="bg-gradient-to-br from-purple-500/15 via-indigo-500/5 to-white rounded-2xl p-4 sm:p-5 border border-purple-200/90 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Delivered Messages</span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5">
            {stats.total_recipients ?? 0}
          </p>
          <p className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-purple-600" /> Successful dispatches
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: COMPOSE & BROADCAST STUDIO (Intuitive 2-Column Workflow)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: 3-Step Guided Creator (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* ── STEP 1: TARGET AUDIENCE SELECTOR ── */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Select Audience
                    </h2>
                    <p className="text-xs text-slate-500">Who should receive this WhatsApp message?</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Target: {recipientType === 'all' ? 'All Customers' : recipientType === 'cart' ? 'Cart Abandoners' : 'Single User'}
                </span>
              </div>

              {/* 3 Audience Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: All Customers */}
                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('all');
                    setSelectedUser(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    recipientType === 'all'
                      ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/15 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      recipientType === 'all' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      recipientType === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {stats.reachable_customers ?? 0}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">All Customers</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Reach entire store list</p>
                  </div>
                </button>

                {/* Option 2: Cart Abandoners */}
                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('cart');
                    setSelectedUser(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    recipientType === 'cart'
                      ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/15 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      recipientType === 'cart' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      recipientType === 'cart' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {stats.cart_abandoners ?? 0}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Cart Abandoners</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Recover pending items</p>
                  </div>
                </button>

                {/* Option 3: Individual Customer */}
                <button
                  type="button"
                  onClick={() => setRecipientType('individual')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    recipientType === 'individual'
                      ? 'bg-gradient-to-br from-purple-500/10 to-indigo-500/15 border-purple-400 ring-2 ring-purple-500/20 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      recipientType === 'individual' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      recipientType === 'individual' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      1-to-1
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Single Customer</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Direct VIP or test send</p>
                  </div>
                </button>
              </div>

              {/* Customer Search Box for Individual */}
              {recipientType === 'individual' && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-purple-600" />
                      Search & Select Customer:
                    </label>
                    {selectedUser && (
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-xs text-purple-600 hover:text-purple-800 font-bold"
                      >
                        Change Customer
                      </button>
                    )}
                  </div>

                  {selectedUser ? (
                    <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {selectedUser.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-purple-900 truncate">{selectedUser.name}</p>
                          <p className="text-[11px] text-purple-700 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedUser.phone || 'No phone'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-200/80 text-purple-800">
                        Selected Target
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Type customer name, phone number, or email..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/40 p-1 divide-y divide-slate-100">
                        {isUsersFetching ? (
                          <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> Searching customers...
                          </div>
                        ) : users.length === 0 ? (
                          <p className="p-4 text-center text-xs text-slate-400">
                            {userSearch ? 'No customer found matching query' : 'Type above to search customers'}
                          </p>
                        ) : (
                          users.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => setSelectedUser(u)}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-white text-xs transition-all cursor-pointer flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {u.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate">{u.name}</p>
                                  <p className="text-[11px] text-slate-500 font-mono">{u.phone}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md shrink-0">
                                Select
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── STEP 2: PRE-MADE TEMPLATE PRESETS ── */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Choose Template Preset
                    </h2>
                    <p className="text-xs text-slate-500">Pick a pre-formatted message or start with a custom draft</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {TEMPLATES.length} Presets Available
                </span>
              </div>

              {/* Grid of Templates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedTemplate.id === t.id;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTemplate(t)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${
                        isSelected
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-transparent shadow-md shadow-emerald-600/20 scale-[1.02]'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          isSelected ? 'bg-white/25 text-white' : `${t.lightBg} ${t.textCol}`
                        }`}>
                          {t.badge}
                        </span>
                      </div>
                      <p className={`text-xs font-bold mt-2 truncate w-full ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {t.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── STEP 3: MESSAGE COPYWRITING & BROADCAST CTA ── */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 font-black text-xs flex items-center justify-center">
                    3
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Draft WhatsApp Copy
                    </h2>
                    <p className="text-xs text-slate-500">Customize greeting, emojis, and live personalization variables</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                  {message.length} chars
                </span>
              </div>

              {/* 1-Click Dynamic Personalization Variables */}
              <div className="space-y-2 bg-gradient-to-r from-slate-50 to-emerald-50/30 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Click to Insert Variables:
                  </span>
                  <span className="text-slate-400 font-normal">Replaced dynamically per customer</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { tag: '{name}', label: 'Customer Name', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' },
                    { tag: '{store_url}', label: 'Store Link', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' },
                    { tag: '{code}', label: 'Coupon Code', color: 'bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200' },
                    { tag: '{phone}', label: 'Phone Number', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95 ${v.color}`}
                    >
                      <span className="font-mono font-black">{v.tag}</span>
                      <span className="text-[10px] opacity-80">({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Emojis Bar */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-amber-500" /> Emojis:
                </span>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 hover:scale-110 active:scale-95 flex items-center justify-center text-sm transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  ref={textareaRef}
                  rows={9}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your WhatsApp message copy here... Use *bold* for bold text, _italic_ for italics, ~strike~ for strikethrough."
                  className="w-full p-4 rounded-2xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium leading-relaxed resize-none bg-slate-50/40 focus:bg-white shadow-2xs"
                />
              </div>

              {/* Formatting Helper & Tips */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-600">Style tips:</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">*bold*</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono italic">_italic_</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono line-through">~strike~</span>
                </div>
                <span className="text-emerald-700 font-medium">WhatsApp Markdown Active</span>
              </div>

              {/* Big High-Contrast Send Button */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={
                    sending || !message.trim() || (recipientType === 'individual' && !selectedUser)
                  }
                  onClick={() => setShowConfirm(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Broadcasting Campaign Now...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {recipientType === 'all'
                          ? `Send Broadcast to All (${stats.reachable_customers ?? 0} Customers)`
                          : recipientType === 'cart'
                          ? `Send Broadcast to Cart Abandoners (${stats.cart_abandoners ?? 0} Shoppers)`
                          : `Send Message to ${selectedUser?.name || 'Selected Customer'}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Realistic WhatsApp Smartphone Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Live Smartphone Preview
                    </h3>
                    <p className="text-[11px] text-slate-500">How customers see your message</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Real-Time Synced
                </span>
              </div>

              {/* Realistic Mobile Frame */}
              <div className="relative rounded-[32px] border-[6px] border-slate-800 bg-[#efeae2] shadow-2xl overflow-hidden min-h-[520px] flex flex-col justify-between">
                {/* Phone Speaker Notch */}
                <div className="bg-slate-800 h-5 w-full flex items-center justify-center pt-0.5">
                  <div className="w-14 h-1.5 bg-slate-900 rounded-full"></div>
                </div>

                {/* WhatsApp Chat Header */}
                <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white flex items-center justify-center font-black text-sm shadow-xs border border-white/30 shrink-0">
                      D
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold truncate">Dundu Online</p>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      </div>
                      <p className="text-[10px] text-emerald-100/90 leading-none">Online • Verified Business</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-white/90">
                    <Video className="w-3.5 h-3.5" />
                    <Phone className="w-3.5 h-3.5" />
                    <MoreVertical className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* WhatsApp Chat Body */}
                <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
                  {/* Encrypted Notice */}
                  <div className="text-center">
                    <span className="text-[9px] font-medium text-slate-700 bg-amber-100/90 border border-amber-200 px-3 py-1 rounded-lg shadow-2xs inline-block max-w-[90%] leading-tight">
                      🔒 Messages are end-to-end encrypted. No one outside of this chat can read them.
                    </span>
                  </div>

                  {/* Date badge */}
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-slate-600 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                      Today
                    </span>
                  </div>

                  {/* Incoming WhatsApp Speech Bubble */}
                  <div className="flex flex-col items-start">
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-900 shadow-sm max-w-[95%] space-y-2 break-words border border-[#c4e6a8]/50">
                      <p className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                        {previewRenderedText}
                      </p>

                      {/* Timestamp & Blue Double Checkmarks */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-0.5">
                        <span>
                          {new Date().toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                        <span className="text-[#34b7f1] font-black text-xs">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Input Bar Mock */}
                <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 border-t border-slate-200">
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center justify-between text-slate-400 text-xs shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <Smile className="w-4 h-4 text-slate-400" />
                      <span className="text-[11px]">Message</span>
                    </div>
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-xs">
                    <Mic className="w-4 h-4" />
                  </div>
                </div>

                {/* Phone Bottom Gesture Bar */}
                <div className="bg-slate-900 py-1 text-center">
                  <div className="w-20 h-1 bg-slate-600 rounded-full mx-auto"></div>
                </div>
              </div>

              {/* Helpful Tips Below Phone */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 rounded-2xl border border-emerald-200/80 text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" /> Dynamic Personalization
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  When sent, variables like <code className="text-emerald-700 font-bold">&#123;name&#125;</code> and{' '}
                  <code className="text-emerald-700 font-bold">&#123;store_url&#125;</code> automatically adapt to each customer’s real name and store link.
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
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search broadcast message keywords or recipient..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-all font-medium shadow-2xs"
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
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
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
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
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
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-500" />
                Loading WhatsApp dispatch records...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">No broadcast history found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When campaigns or 1-to-1 messages are dispatched, they will be logged here with delivery timestamps.
                </p>
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
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Users className="w-3 h-3 text-emerald-600" />
                                All Users ({log.user_count})
                              </span>
                            ) : log.recipient === 'cart' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <ShoppingCart className="w-3 h-3 text-amber-600" />
                                Cart Abandoners ({log.user_count})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                <User className="w-3 h-3 text-purple-600" />
                                Individual
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-700 capitalize">
                            {(log.template || 'custom').replace('_', ' ')}
                          </td>
                          <td className="px-5 py-3.5 max-w-sm">
                            <button
                              type="button"
                              onClick={() => setPreviewModalMsg(log.message)}
                              className="text-left group cursor-pointer w-full"
                            >
                              <p className="truncate text-slate-800 font-medium group-hover:text-emerald-700 transition-colors">
                                {log.message}
                              </p>
                              <span className="text-[10px] text-slate-400 group-hover:underline">
                                Click to view full message
                              </span>
                            </button>
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

      {/* ─── Confirmation Modal ────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Broadcast Dispatch</h3>
                <p className="text-xs text-slate-500">
                  {recipientType === 'all'
                    ? `Broadcast to all ${stats.reachable_customers ?? 0} customers with active phone numbers`
                    : recipientType === 'cart'
                    ? `Broadcast to ${stats.cart_abandoners ?? 0} cart abandoners`
                    : `Direct message to: ${selectedUser?.name}`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 text-xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed font-sans shadow-2xs">
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {sending ? 'Broadcasting...' : 'Yes, Confirm & Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Message Viewer Modal ─────────────────────────────────────────── */}
      {previewModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Broadcast Message Record</h3>
              </div>
              <button
                onClick={() => setPreviewModalMsg(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#efeae2] rounded-2xl border border-slate-200 text-xs text-slate-900 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              <div className="bg-[#dcf8c6] p-3 rounded-xl shadow-2xs border border-[#c4e6a8]/50">
                {previewModalMsg}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewModalMsg(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
