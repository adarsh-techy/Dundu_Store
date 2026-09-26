import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cake, Send, Calendar, MessageCircle, Settings2, Save,
  Users, Percent, Sparkles, CheckCircle2,
  RefreshCw, Check, ShieldCheck, Smartphone, X, RotateCcw,
  Gift, PartyPopper
} from 'lucide-react';
import { birthdayApi } from '../../../api';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

/* ── Zodiac Signs ── */
function getZodiac(month, day) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

/* ── Customer Birthday Row ── */
function CustomerBirthdayCard({ customer, onSend, sending }) {
  const dob = new Date(customer.date_of_birth);
  const zodiac = getZodiac(dob.getMonth() + 1, dob.getDate());
  const initial = customer.name?.charAt(0)?.toUpperCase() || 'C';

  const isToday = customer.is_today;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
      isToday
        ? 'bg-gradient-to-r from-pink-50 via-rose-50 to-orange-50 border-pink-200/80 shadow-sm'
        : 'bg-white hover:bg-slate-50 border-slate-200/80'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
          isToday
            ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20'
            : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm'
        }`}>
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-slate-900 truncate">{customer.name}</p>
            {isToday ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs animate-pulse">
                Birthday Today
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                In {Math.round(customer.days_until)} {Math.round(customer.days_until) === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{customer.display_date}</span>
            <span>·</span>
            <span>Age {customer.age}</span>
            <span>·</span>
            <span className="font-medium text-slate-600">{zodiac}</span>
            {customer.phone && (
              <>
                <span>·</span>
                <span className="font-mono text-slate-600">{customer.phone}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="shrink-0 self-end sm:self-center">
        {customer.phone ? (
          <button
            onClick={() => onSend(customer)}
            disabled={sending === customer.id}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              sending === customer.id
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isToday
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {sending === customer.id ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <MessageCircle className="w-3.5 h-3.5" />
            )}
            <span>{isToday ? 'Send Birthday Wish' : 'Send Greeting'}</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 italic">No phone saved</span>
        )}
      </div>
    </div>
  );
}

export default function Birthdays() {
  const qc = useQueryClient();
  const textareaRef = useRef(null);

  const [sending, setSending] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);

  // Settings State
  const [discount, setDiscount] = useState('15');
  const [template, setTemplate] = useState('');
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Data Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-birthdays'],
    queryFn: birthdayApi.getList,
    staleTime: 5 * 60_000,
  });

  const today = data?.data?.today || [];
  const upcoming = data?.data?.upcoming || [];
  const stats = data?.data?.stats || {};

  // Sync settings when data loads
  useEffect(() => {
    if (data?.data) {
      setDiscount(String(data.data.birthday_discount ?? 15));
      setTemplate(data.data.birthday_template ?? '');
      setPopupEnabled(data.data.birthday_popup_enabled !== false);
      setSettingsDirty(false);
    }
  }, [
    data?.data?.birthday_discount,
    data?.data?.birthday_template,
    data?.data?.birthday_popup_enabled,
  ]);

  /* ── 1-Click Variable Inserter ── */
  const insertVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) {
      setTemplate((prev) => prev + variable);
      setSettingsDirty(true);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = template;
    const updated = text.substring(0, start) + variable + text.substring(end);
    setTemplate(updated);
    setSettingsDirty(true);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  /* ── Send Individual Birthday Wish ── */
  async function sendOne(customer) {
    setSending(customer.id);
    try {
      await birthdayApi.sendOne(customer.id);
      toast.success(`Birthday greeting sent to ${customer.name}`);
      qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send WhatsApp greeting');
    } finally {
      setSending(null);
    }
  }

  /* ── Bulk Send to All Celebrants Today ── */
  async function sendAllToday() {
    if (!today.length) return;
    setSendingAll(true);
    try {
      const res = await birthdayApi.sendAllToday();
      toast.success(`Sending birthday greetings to ${res.data.count} celebrants`);
      qc.invalidateQueries({ queryKey: ['whatsapp-logs'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send bulk greetings');
    } finally {
      setSendingAll(false);
    }
  }

  /* ── Save Settings ── */
  async function saveSettings() {
    const parsedDiscount = parseInt(discount, 10);
    if (isNaN(parsedDiscount) || parsedDiscount < 1 || parsedDiscount > 100) {
      toast.error('Birthday discount must be between 1% and 100%');
      return;
    }

    setSettingsSaving(true);
    try {
      await birthdayApi.updateSettings({
        birthday_discount: parsedDiscount,
        birthday_template: template.trim(),
        birthday_popup_enabled: popupEnabled,
      });
      toast.success('Birthday program rules saved successfully');
      setSettingsDirty(false);
      qc.invalidateQueries({ queryKey: ['admin-birthdays'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  }

  const discountNum = parseInt(discount, 10) || 15;

  /* ── Preview Rendered Message ── */
  const previewMessage = useMemo(() => {
    return (
      (template || '')
        .replace(/\{name\}/gi, 'Priya Sharma')
        .replace(/\{discount\}/gi, String(discountNum))
        .replace(/\{store_url\}/gi, 'dundu.com') ||
      'Type your message template on the left to preview WhatsApp greeting...'
    );
  }, [template, discountNum]);

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <div className="w-8 h-8 border-3 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ─── Colorful Header ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-pink-500/12 via-rose-500/12 to-orange-500/12 p-6 rounded-3xl border border-pink-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-40 h-40 bg-pink-400/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white px-3 py-1 rounded-full shadow-xs">
              <Cake className="h-3 w-3" />
              Birthday Program
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200">
              {stats.total_with_dob ?? 0} Stored Dates
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Birthday Rewards & Celebrations
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Automate birthday discounts, WhatsApp wishes, and celebration popups.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => { qc.invalidateQueries({ queryKey: ['admin-birthdays'] }); toast.success('Refreshed'); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>

          {today.length > 0 && (
            <button onClick={sendAllToday} disabled={sendingAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold hover:from-pink-600 hover:to-rose-600 shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50">
              {sendingAll ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Wish All Today ({today.length})</span>
            </button>
          )}

          {settingsDirty && (
            <button onClick={saveSettings} disabled={settingsSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer animate-fadeIn">
              <Save className="w-4 h-4 text-white" />
              {settingsSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          {!settingsDirty && (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs font-semibold shadow-xs">
              <Check className="h-3.5 w-3.5 text-blue-600" /> Saved
            </div>
          )}
        </div>
      </div>

      {/* ─── Colorful KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-white rounded-2xl p-4 border border-pink-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-pink-700 uppercase tracking-wider">Today</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-pink-500/20">
              <Cake className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{today.length}</p>
          <p className="text-[10px] text-pink-600 font-medium mt-0.5">Celebrating today</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white rounded-2xl p-4 border border-indigo-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Upcoming</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{upcoming.length}</p>
          <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Next 7 days</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-2xl p-4 border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Discount</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{discountNum}% OFF</p>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Auto-applied at checkout</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Profiles</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total_with_dob ?? 0}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Registered birth dates</p>
        </div>
      </div>

      {/* ─── Settings & Template (Clean 2-Column) ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Settings + Template */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card: Discount & Popup */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white">
                <Gift className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Birthday Reward Settings</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Discount */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Birthday Discount</label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    Auto-Applied
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-24">
                    <input type="number" min="1" max="100" value={discount}
                      onChange={(e) => { setDiscount(e.target.value); setSettingsDirty(true); }}
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-amber-300 bg-white text-lg font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-center" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500">%</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">off at checkout</span>
                </div>
              </div>

              {/* Popup Toggle */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/70 space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Birthday Popup</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    popupEnabled ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {popupEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Celebration popup in app</span>
                  <button type="button" onClick={() => { setPopupEnabled((p) => !p); setSettingsDirty(true); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                      popupEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                      popupEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Template Editor */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">WhatsApp Greeting Template</h2>
                <p className="text-[11px] text-slate-500">Customize the birthday message sent via WhatsApp</p>
              </div>
            </div>

            {/* Variable tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Insert:</span>
              {[
                { tag: '{name}', label: 'Name' },
                { tag: '{discount}', label: 'Discount' },
                { tag: '{store_url}', label: 'Store Link' },
              ].map((v) => (
                <button key={v.tag} type="button" onClick={() => insertVariable(v.tag)}
                  className="px-2.5 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 transition-colors cursor-pointer">
                  {v.tag}
                </button>
              ))}
            </div>

            <textarea ref={textareaRef} rows={7} value={template}
              onChange={(e) => { setTemplate(e.target.value); setSettingsDirty(true); }}
              placeholder="Write your birthday greeting message..."
              className="w-full p-4 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all font-medium leading-relaxed resize-none bg-slate-50/30 focus:bg-white" />

            <p className="text-[11px] text-slate-400">
              Supports WhatsApp markdown: <code className="text-slate-600 bg-slate-100 px-1 rounded">*bold*</code>,{' '}
              <code className="text-slate-600 bg-slate-100 px-1 rounded">_italic_</code>
            </p>
          </div>

          {/* Inline Save Bar */}
          {settingsDirty && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="text-xs font-bold text-blue-950">You have unsaved changes</p>
              </div>
              <button onClick={saveSettings} disabled={settingsSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer">
                <Save className="h-3.5 w-3.5 text-white" />
                {settingsSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>

        {/* Right: WhatsApp Preview + Info */}
        <div className="lg:col-span-5 space-y-5">
          {/* WhatsApp Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">WhatsApp Preview</span>
            </div>

            <div className="bg-[#efeae2] rounded-2xl p-4 border border-slate-200/80 shadow-inner min-h-[200px]">
              {/* WhatsApp header */}
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#d4cfc5]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
                  <Cake className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800">DUNDU Store</p>
                  <p className="text-[9px] text-slate-500">online</p>
                </div>
              </div>

              <div className="flex flex-col items-start">
                <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-800 shadow-xs max-w-full space-y-1.5 break-words">
                  <p className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                    {previewMessage}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 pt-0.5">
                    <span>10:00 AM</span>
                    <span className="text-[#34b7f1] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200/70 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">How Birthday Discounts Work</span>
            </div>
            <div className="space-y-2">
              {[
                { step: '1', text: `Customer registers with their date of birth` },
                { step: '2', text: `On their birthday, ${discountNum}% discount is auto-applied at checkout` },
                { step: '3', text: `WhatsApp greeting is sent to notify them of their reward` },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Birthday Lists (Today & Upcoming) ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Celebrants */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-sm shadow-pink-500/20">
                <Cake className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Today's Birthdays</h3>
                <p className="text-[10px] text-slate-500">Celebrating today</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 border border-pink-200">
              {today.length} Today
            </span>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {today.length === 0 ? (
              <div className="text-center py-14 space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-300 flex items-center justify-center mx-auto">
                  <Cake className="w-7 h-7" />
                </div>
                <p className="text-xs font-semibold text-slate-600">No birthdays today</p>
                <p className="text-[11px] text-slate-400">Check upcoming birthdays on the right</p>
              </div>
            ) : (
              today.map((c) => (
                <CustomerBirthdayCard key={c.id} customer={c} onSend={sendOne} sending={sending} />
              ))
            )}
          </div>
        </div>

        {/* Upcoming This Week */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Birthdays</h3>
                <p className="text-[10px] text-slate-500">Next 7 days</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200">
              {upcoming.length} Upcoming
            </span>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {upcoming.length === 0 ? (
              <div className="text-center py-14 space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-300 flex items-center justify-center mx-auto">
                  <Calendar className="w-7 h-7" />
                </div>
                <p className="text-xs font-semibold text-slate-600">No upcoming birthdays</p>
                <p className="text-[11px] text-slate-400">Customer birth dates will populate here automatically</p>
              </div>
            ) : (
              upcoming.map((c) => (
                <CustomerBirthdayCard key={c.id} customer={c} onSend={sendOne} sending={sending} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
