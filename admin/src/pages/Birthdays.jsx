import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Cake, Send, PartyPopper, Calendar, MessageCircle, Settings2, Eye, Save, Bell } from 'lucide-react';
import { birthdayApi } from '../api';
import toast from 'react-hot-toast';

function Avatar({ name }) {
  return (
    <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-600 shrink-0">
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function CustomerRow({ customer, onSend, sending }) {
  const dob = new Date(customer.date_of_birth);
  const zodiac = getZodiac(dob.getMonth() + 1, dob.getDate());
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <Avatar name={customer.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{customer.name}</p>
          {customer.is_today && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-600">🎂 Today!</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {customer.display_date} · Age {customer.age} · {zodiac}
          {customer.phone && <span className="ml-2 text-gray-500">{customer.phone}</span>}
        </p>
      </div>
      {customer.phone ? (
        <button
          onClick={() => onSend(customer)}
          disabled={sending === customer.id}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            sending === customer.id
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : customer.is_today
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
          }`}>
          {sending === customer.id
            ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <MessageCircle className="h-3 w-3" />}
          Send Wish
        </button>
      ) : (
        <span className="text-xs text-gray-400">No phone</span>
      )}
    </div>
  );
}

function getZodiac(month, day) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '♈ Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '♉ Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return '♊ Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return '♋ Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '♌ Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '♍ Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return '♎ Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return '♏ Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return '♐ Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '♑ Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '♒ Aquarius';
  return '♓ Pisces';
}

function previewMessage(template, discount) {
  return (template || '')
    .replace(/\{name\}/gi, 'Priya')
    .replace(/\{discount\}/gi, String(discount));
}

export default function Birthdays() {
  const qc = useQueryClient();
  const [sending, setSending] = useState(null);

  // Settings state
  const [discount, setDiscount] = useState('');
  const [template, setTemplate] = useState('');
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-birthdays'],
    queryFn: birthdayApi.getList,
    staleTime: 5 * 60_000,
  });

  const today    = data?.data?.today    || [];
  const upcoming = data?.data?.upcoming || [];

  // Sync settings from server on first load
  useEffect(() => {
    if (data?.data) {
      setDiscount(String(data.data.birthday_discount ?? 15));
      setTemplate(data.data.birthday_template ?? '');
      setPopupEnabled(data.data.birthday_popup_enabled !== false);
      setSettingsDirty(false);
    }
  }, [data?.data?.birthday_discount, data?.data?.birthday_template, data?.data?.birthday_popup_enabled]);

  async function sendOne(customer) {
    setSending(customer.id);
    try {
      await birthdayApi.sendOne(customer.id);
      toast.success(`🎂 Birthday wish sent to ${customer.name}!`);
      qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send');
    } finally {
      setSending(null);
    }
  }

  async function sendAllToday() {
    if (!today.length) return;
    try {
      const res = await birthdayApi.sendAllToday();
      toast.success(`🎉 Sending birthday wishes to ${res.data.count} customers!`);
      qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send');
    }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await birthdayApi.updateSettings({
        birthday_discount: parseInt(discount, 10) || 15,
        birthday_template: template,
        birthday_popup_enabled: popupEnabled,
      });
      toast.success('Birthday settings saved');
      setSettingsDirty(false);
      qc.invalidateQueries({ queryKey: ['admin-birthdays'] });
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const discountNum = parseInt(discount, 10) || 15;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center">
            <Cake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Birthday Notifications</h1>
            <p className="text-xs text-gray-500">Send surprise birthday wishes via WhatsApp</p>
          </div>
        </div>
        {today.length > 0 && (
          <button onClick={sendAllToday}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 transition-colors shadow-sm">
            <Send className="h-4 w-4" />
            Wish All Today ({today.length})
          </button>
        )}
      </div>

      {/* ── Settings Panel ── */}
      <div className="rounded-2xl border border-green-200 bg-green-50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-pink-500" />
            <p className="text-sm font-bold text-gray-700">Birthday Message Settings</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${showPreview ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            {settingsDirty && (
              <button
                onClick={saveSettings}
                disabled={settingsSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-500 text-white hover:bg-pink-600 transition-colors disabled:opacity-60">
                {settingsSaving
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            )}
          </div>
        </div>

        <div className={`grid gap-5 p-5 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Left: inputs */}
          <div className="space-y-4">
            {/* Discount % */}
            <div>
              <label className="block text-xs font-semibold text-pink-900 mb-1.5">Birthday Discount %</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1" max="100"
                  value={discount}
                  onChange={(e) => { setDiscount(e.target.value); setSettingsDirty(true); }}
                  className="w-24 px-3 py-2 rounded-xl border border-gray-400 text-md text-pink-600  font-bold text-center focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <span className="text-sm font-bold text-gray-400">% off</span>
                <span className="text-xs text-gray-600 ml-1">— auto-applies to the coupon created on send</span>
              </div>
            </div>

            {/* Popup toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Birthday Popup (Customer App)</label>
              <button
                type="button"
                onClick={() => { setPopupEnabled((p) => !p); setSettingsDirty(true); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                  popupEnabled
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                <Bell className={`h-4 w-4 ${popupEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                {popupEnabled ? 'Popup Enabled' : 'Popup Disabled'}
                <span className={`ml-1 w-8 h-4 rounded-full transition-colors relative inline-block ${popupEnabled ? 'bg-green-400' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${popupEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
              </button>
              <p className="text-xs text-gray-400 mt-1">Shows a birthday discount popup every 2 minutes in the web &amp; mobile app.</p>
            </div>

            {/* Message template */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-pink-700">WhatsApp Message Template</label>
                <span className="text-xs text-gray-400">{template.length} chars</span>
              </div>
              <textarea
                value={template}
                onChange={(e) => { setTemplate(e.target.value); setSettingsDirty(true); }}
                rows={9}
                className="w-full px-4 py-3 rounded-xl bg-white border border-pink-300 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono"
                placeholder="Type your birthday message…"
              />
            
            </div>
          </div>

          {/* Right: preview */}
          {showPreview && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500">Message Preview</p>
              <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-48">
                <div className="inline-block bg-white rounded-2xl rounded-tl-none px-4 py-3 max-w-full shadow-sm">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {previewMessage(template, discountNum)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-pink-50 border border-pink-200 p-3 text-xs text-pink-700 space-y-1">
                <p className="font-semibold">🎂 How the discount works</p>
                <p className="text-pink-600">The <strong>{discountNum}% birthday discount</strong> is applied automatically at checkout when the customer shops on their birthday — no coupon needed.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Birthday lists ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's birthdays */}
        <div className="rounded-2xl border border-pink-200 bg-pink-50 shadow-sm">
          <div className="flex items-center gap-2 p-5 pb-3">
            <PartyPopper className="h-5 w-5 text-pink-500" />
            <h2 className="font-bold text-gray-800">Today's Birthdays</h2>
            {today.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-pink-500 text-white px-2 py-0.5 rounded-full">
                {today.length}
              </span>
            )}
          </div>
          <div className="px-5 pb-5">
            {today.length === 0 ? (
              <div className="text-center py-8">
                <Cake className="h-8 w-8 text-pink-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No birthdays today</p>
              </div>
            ) : today.map((c) => (
              <CustomerRow key={c.id} customer={c} onSend={sendOne} sending={sending} />
            ))}
          </div>
        </div>

        {/* Upcoming 7 days */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50 shadow-sm">
          <div className="flex items-center gap-2 p-5 pb-3">
            <Calendar className="h-5 w-5 text-purple-500" />
            <h2 className="font-bold text-gray-800">Upcoming (Next 7 Days)</h2>
            {upcoming.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-purple-400 text-white px-2 py-0.5 rounded-full">
                {upcoming.length}
              </span>
            )}
          </div>
          <div className="px-5 pb-5">
            {upcoming.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-purple-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No upcoming birthdays this week</p>
              </div>
            ) : upcoming.map((c) => (
              <CustomerRow key={c.id} customer={c} onSend={sendOne} sending={sending} />
            ))}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <span className="text-xl shrink-0">💡</span>
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-0.5">How birthday coupons work</p>
          <p className="text-xs text-amber-700">
            The birthday discount is applied <strong>automatically at checkout</strong> — when a customer places an order on their birthday, {discountNum}% is deducted from the order total without any coupon code.
            Sending the WhatsApp wish lets them know about this offer.
          </p>
        </div>
      </div>
    </div>
  );
}
