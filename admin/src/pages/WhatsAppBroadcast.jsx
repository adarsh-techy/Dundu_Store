import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Users, User, Clock, CheckCircle, XCircle, Loader2, Search } from 'lucide-react';
import { whatsappApi, settingsApi } from '../api';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const WELCOME_MESSAGE =
  `🎉 Welcome to Dundu, *{name}*!\n\n` +
  `We're so glad you joined us! ✨\n\n` +
  `🛍️ Shop the latest in Women, Kids, Newborn & Maternity fashion.\n` +
  `🎁 Use code *WELCOME10* for 10% off your first order!\n` +
  `💌 Invite friends & earn rewards with our Refer & Earn program.\n\n` +
  `👉 Start shopping: dundu.com\n\n` +
  `---\n\n` +
  `🎉 ഡുണ്ടുവിലേക്ക് സ്വാഗതം, *{name}*!\n\n` +
  `നിങ്ങൾ ഞങ്ങളോടൊപ്പം ചേർന്നതിൽ ഞങ്ങൾക്ക് വളരെ സന്തോഷം! ✨\n\n` +
  `🛍️ സ്ത്രീകൾ, കുട്ടികൾ, നവജാതൻ & മാതൃത്വ ഫാഷൻ ശേഖരം ഷോപ്പ് ചെയ്യൂ.\n` +
  `🎁 ആദ്യ ഓർഡറിൽ 10% ഓഫിന് *WELCOME10* കോഡ് ഉപയോഗിക്കൂ!\n` +
  `💌 സുഹൃത്തുക്കളെ ക്ഷണിച്ച് Refer & Earn വഴി പ്രതിഫലം നേടൂ.\n\n` +
  `👉 ഇപ്പോൾ ഷോപ്പ് ചെയ്യൂ: dundu.com\n\n` +
  `_Dundu — Fashion for Every Moment | ഓരോ നിമിഷത്തിനും ഫാഷൻ_`;

const TEMPLATES = [
  {
    id: 'welcome',
    label: '🙏 Welcome Message',
    message: WELCOME_MESSAGE,
  },
  {
    id: 'offer',
    label: '🎁 Special Offer',
    message: `🎉 Hey {name}! Dundu has an exclusive offer just for you!\n\nShop now and enjoy amazing discounts on our latest collection.\n\n👉 Visit us at dundu.com\n\n_Dundu — Fashion for Every Moment_`,
  },
  {
    id: 'referral',
    label: '👥 Refer & Earn',
    message: null, // built dynamically from settings
  },
  {
    id: 'coupon',
    label: '🎫 Coupon Code',
    message: `🎫 Hey {name}! Here's a special coupon just for you:\n\n*[COUPON CODE HERE]*\n\nUse it at checkout to get your discount. Valid for a limited time!\n\n👉 Shop now at dundu.com\n\n_Dundu — Fashion for Every Moment_`,
  },
  {
    id: 'cart',
    label: '🛒 Cart Reminder',
    message: `🛒 Hey {name}!\n\nYou left some items in your cart at Dundu. Don't let them slip away!\n\nComplete your purchase before they sell out.\n\n👉 dundu.com/cart\n\n_Dundu — Fashion for Every Moment_`,
  },
  {
    id: 'payment',
    label: '💳 Payment Reminder',
    message: `💳 Hi {name},\n\nYou have a pending payment on your recent Dundu order.\n\nPlease complete the payment to avoid cancellation.\n\n👉 dundu.com/orders\n\nNeed help? Reply to this message.\n\n_Dundu Support_`,
  },
  {
    id: 'new_arrival',
    label: '✨ New Arrivals',
    message: `✨ Hey {name}! New arrivals are here!\n\nFresh styles just dropped at Dundu — Women, Kids, Newborn & Maternity collections updated!\n\nBe the first to shop the latest trends.\n\n👉 dundu.com/products\n\n_Dundu — Fashion for Every Moment_`,
  },
  {
    id: 'custom',
    label: '✏️ Custom Message',
    message: '',
  },
];

const STATUS_STYLE = {
  sent:     { bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  failed:   { bg: 'bg-red-100',    text: 'text-red-600',    icon: XCircle },
  partial:  { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: CheckCircle },
  sending:  { bg: 'bg-blue-100',   text: 'text-blue-600',   icon: Loader2 },
};

export default function WhatsAppBroadcast() {
  const qc = useQueryClient();

  const [tab, setTab] = useState('compose'); // 'compose' | 'logs'
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [message, setMessage] = useState(TEMPLATES[0].message ?? '');
  const [recipientType, setRecipientType] = useState('all'); // 'all' | 'individual'
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: settingsData } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = settingsData?.data?.settings || {};
  const referrerPct  = settings.referrer_discount_percent  ?? '20';
  const referredPct  = settings.referred_discount_percent  ?? '30';

  const referralMessage =
    `👥 Hey {name}! Refer a friend to Dundu and both of you save! 🎉\n\n` +
    `🎁 *You get ${referrerPct}% off* your next order — one time, when your friend makes their first purchase.\n\n` +
    `🛍️ *Your friend gets ${referredPct}% off* their very first purchase!\n\n` +
    `📲 Open the Dundu app → Profile → Refer & Earn to share your code.\n\n` +
    `_Dundu — Fashion for Every Moment_`;

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['whatsapp-logs'],
    queryFn: whatsappApi.getLogs,
    enabled: tab === 'logs',
  });
  const logs = logsData?.data?.logs || [];

  const { data: usersData } = useQuery({
    queryKey: ['whatsapp-users', userSearch],
    queryFn: () => whatsappApi.getUsers(userSearch),
    enabled: recipientType === 'individual',
    staleTime: 10_000,
  });
  const users = usersData?.data?.users || [];

  function pickTemplate(t) {
    setTemplate(t);
    setMessage(t.id === 'referral' ? referralMessage : (t.message ?? ''));
  }

  async function handleSend() {
    if (!message.trim()) { toast.error('Message cannot be empty'); return; }
    if (recipientType === 'individual' && !selectedUser) { toast.error('Select a recipient'); return; }
    setSending(true);
    setShowConfirm(false);
    try {
      const payload = {
        recipient: recipientType,
        message: message.trim(),
        template: template.id,
        ...(recipientType === 'individual' ? { user_id: selectedUser.id } : {}),
      };
      const res = await whatsappApi.send(payload);
      const d = res.data;
      if (d.queued) {
        toast.success(`Sending to ${d.user_count} users in the background…`);
      } else {
        toast.success(`Message sent to ${d.to}`);
      }
      qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5 bg-green-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">WhatsApp Broadcast</h1>
            <p className="text-xs text-gray-500">Send messages to customers via WhatsApp</p>
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[['compose', 'Compose'], ['logs', 'Send History']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'compose' ? (
        <div className="grid grid-cols-3 gap-5">

          {/* Left — Templates */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-pink-900 uppercase tracking-wider mb-3">Message Templates</p>
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => pickTemplate(t)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  template.id === t.id
                    ? 'border-green-400 bg-green-50 text-green-800 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                {t.label}
              </button>
            ))}
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
              💡 Use <code className="font-mono bg-amber-100 px-1 rounded">{'{name}'}</code> in your message — it will be replaced with each customer's name automatically.
            </div>
          </div>

          {/* Center — Message editor */}
          <div className="space-y-4">
            <p className="text-md font-bold text-pink-600 uppercase tracking-wider">Message</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={14}
              className="w-full px-4 py-3 rounded-xl border border-pink-200 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Type your message here…"
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{message.length} characters</span>
              <span className="text-gray-400">*bold*, _italic_</span>
            </div>

            {/* Preview bubble */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-pink-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">Preview</p>
              <div className="inline-block bg-[#dcf8c6] rounded-2xl rounded-tl-none px-4 py-3 max-w-xs shadow-sm">
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {message.replace(/\{name\}/gi, 'Customer') || <span className="text-gray-400 italic">Your message…</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Right — Recipient + Send */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recipients</p>

            {/* Recipient type toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button onClick={() => { setRecipientType('all'); setSelectedUser(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${recipientType === 'all' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Users className="h-4 w-4" /> All Users
              </button>
              <button onClick={() => setRecipientType('individual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${recipientType === 'individual' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <User className="h-4 w-4" /> Individual
              </button>
            </div>

            {recipientType === 'all' ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                <Users className="h-4 w-4 inline mr-1.5 mb-0.5" />
                Message will be sent to <strong>all customers</strong> with a phone number.
                <p className="text-xs text-blue-500 mt-1">Large broadcasts are processed in the background.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-1">
                  {users.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No users found</p>
                  ) : users.map((u) => (
                    <button key={u.id} onClick={() => setSelectedUser(u)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedUser?.id === u.id ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-700 hover:bg-white'
                      }`}>
                      <p className="font-medium truncate text-pink-900">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.phone}</p>
                    </button>
                  ))}
                </div>
                {selectedUser && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">Sending to <strong>{selectedUser.name}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Send button */}
            <button
              disabled={sending || !message.trim() || (recipientType === 'individual' && !selectedUser)}
              onClick={() => setShowConfirm(true)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                sending || !message.trim() || (recipientType === 'individual' && !selectedUser)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
              }`}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : recipientType === 'all' ? 'Broadcast to All Users' : 'Send Message'}
            </button>
          </div>
        </div>
      ) : (
        /* Logs tab */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {logsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages sent yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Template</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent By</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const s = STATUS_STYLE[log.status] || STATUS_STYLE.sent;
                  const StatusIcon = s.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        {log.recipient === 'all'
                          ? <span className="flex items-center gap-1 text-blue-600 font-medium"><Users className="h-3.5 w-3.5" /> All ({log.user_count})</span>
                          : <span className="flex items-center gap-1 text-gray-600"><User className="h-3.5 w-3.5" /> Individual</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <span className="capitalize text-gray-600">{(log.template || 'custom').replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="truncate text-gray-700">{log.message}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{log.sent_by_name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
                          <StatusIcon className={`h-3 w-3 ${log.status === 'sending' ? 'animate-spin' : ''}`} />
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Confirm Send</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {recipientType === 'all'
                    ? 'This will send a WhatsApp message to all customers.'
                    : `Sending to ${selectedUser?.name}`}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap max-h-36 overflow-y-auto">
              {message.replace(/\{name\}/gi, selectedUser?.name || 'Customer')}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" fullWidth onClick={() => setShowConfirm(false)}>Cancel</Button>
              <button
                onClick={handleSend}
                className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors">
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
