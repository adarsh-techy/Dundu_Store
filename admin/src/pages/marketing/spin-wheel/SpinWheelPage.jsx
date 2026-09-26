import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  Trophy,
  History,
  RotateCcw,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Smartphone,
  Copy,
  Tag,
  Zap,
  Clock,
  X,
  Gift,
  Coins,
  Percent,
  Compass
} from 'lucide-react';
import { spinWheelApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const SLICE_PALETTE = [
  '#E91E8C', '#FF6B35', '#3B82F6', '#10B981',
  '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

export default function SpinWheelPage() {
  const [activeSection, setActiveSection] = useState('settings'); // 'settings' | 'slices' | 'history'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const initialDataRef = useRef(null);

  const [data, setData] = useState({
    enabled: true,
    cooldown_hours: 24,
    delay_seconds: 3,
    max_per_day: 1,
    min_orders: 0,
    title: 'Spin & Win Real Rewards!',
    subtitle: 'Spin the wheel today and win exclusive discounts & gift rewards!',
    total_spins: 0,
    segments: [],
  });

  // Preview Simulation
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [testWinner, setTestWinner] = useState(null);
  const [showWinnerCard, setShowWinnerCard] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Slice Modal
  const [sliceModalOpen, setSliceModalOpen] = useState(false);
  const [editingSlice, setEditingSlice] = useState(null);
  const [sliceForm, setSliceForm] = useState({
    label: '', type: 'coupon', value: 50, coupon_code: '',
    color: '#E91E8C', text_color: '#FFFFFF', probability: 15,
    is_active: true, sort_order: 1,
  });

  // History
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logSearch, setLogSearch] = useState('');

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await spinWheelApi.getConfig();
      const resData = res.data || res;
      setData(resData);
      initialDataRef.current = JSON.stringify({
        enabled: resData.enabled !== false,
        cooldown_hours: resData.cooldown_hours ?? 24,
        delay_seconds: resData.delay_seconds ?? 3,
        max_per_day: resData.max_per_day ?? 1,
        min_orders: resData.min_orders ?? 0,
        title: resData.title || '',
        subtitle: resData.subtitle || '',
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load spin wheel configuration.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (pageNo = 1) => {
    try {
      setLogsLoading(true);
      const res = await spinWheelApi.getLogs({ page: pageNo });
      const resData = res.data || res;
      setLogs(resData.logs || []);
      setLogsPage(pageNo);
    } catch {
      // silent
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);
  useEffect(() => { if (activeSection === 'history') fetchLogs(logsPage); }, [activeSection, logsPage]);

  // ─── Dirty State ────────────────────────────────────────────────────────────
  const isDirty = initialDataRef.current !== null && JSON.stringify({
    enabled: data.enabled !== false,
    cooldown_hours: data.cooldown_hours ?? 24,
    delay_seconds: data.delay_seconds ?? 3,
    max_per_day: data.max_per_day ?? 1,
    min_orders: data.min_orders ?? 0,
    title: data.title || '',
    subtitle: data.subtitle || '',
  }) !== initialDataRef.current;

  const handleDiscard = () => {
    if (initialDataRef.current) {
      const parsed = JSON.parse(initialDataRef.current);
      setData((prev) => ({ ...prev, ...parsed }));
      toast('Changes discarded', { icon: '↩️' });
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await spinWheelApi.updateSettings({
        enabled: data.enabled,
        cooldown_hours: data.cooldown_hours,
        delay_seconds: data.delay_seconds,
        max_per_day: data.max_per_day,
        title: data.title,
        subtitle: data.subtitle,
      });
      toast.success('Spin wheel settings saved successfully!');
      initialDataRef.current = JSON.stringify({
        enabled: data.enabled !== false,
        cooldown_hours: data.cooldown_hours ?? 24,
        delay_seconds: data.delay_seconds ?? 3,
        max_per_day: data.max_per_day ?? 1,
        min_orders: data.min_orders ?? 0,
        title: data.title || '',
        subtitle: data.subtitle || '',
      });
      fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Slices Management ──────────────────────────────────────────────────────
  const openAddSliceModal = () => {
    setEditingSlice(null);
    const nextColor = SLICE_PALETTE[(data.segments || []).length % SLICE_PALETTE.length];
    setSliceForm({
      label: '', type: 'coupon', value: 50, coupon_code: '',
      color: nextColor, text_color: '#FFFFFF', probability: 15,
      is_active: true, sort_order: (data.segments || []).length + 1,
    });
    setSliceModalOpen(true);
  };

  const openEditSliceModal = (slice) => {
    setEditingSlice(slice);
    setSliceForm({
      label: slice.label, type: slice.type, value: slice.value,
      coupon_code: slice.coupon_code || '', color: slice.color || '#E91E8C',
      text_color: slice.text_color || '#FFFFFF', probability: slice.probability || 10,
      is_active: slice.is_active !== false, sort_order: slice.sort_order || 1,
    });
    setSliceModalOpen(true);
  };

  const handleSaveSlice = async (e) => {
    e.preventDefault();
    try {
      if (editingSlice) {
        await spinWheelApi.updateSegment(editingSlice.id, sliceForm);
        toast.success('Wheel slice updated!');
      } else {
        await spinWheelApi.createSegment(sliceForm);
        toast.success('Wheel slice added!');
      }
      setSliceModalOpen(false);
      fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save slice.');
    }
  };

  const handleDeleteSlice = async (id) => {
    if (!window.confirm('Delete this slice from the wheel?')) return;
    try {
      await spinWheelApi.deleteSegment(id);
      toast.success('Wheel slice removed.');
      fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete slice.');
    }
  };

  const handleToggleSliceActive = async (slice) => {
    try {
      await spinWheelApi.updateSegment(slice.id, { ...slice, is_active: !slice.is_active });
      toast.success(`Slice ${!slice.is_active ? 'enabled' : 'disabled'}`);
      fetchConfig();
    } catch {
      toast.error('Failed to toggle slice.');
    }
  };

  const handleForceAllUsers = async () => {
    if (!window.confirm('Trigger the Spin Wheel popup for all active users on their next app opening?')) return;
    try {
      await spinWheelApi.forceAllUsersSpinPopup();
      toast.success('Spin wheel forced for all shoppers!');
    } catch {
      toast.error('Failed to trigger spin wheel.');
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ─── Test Spin ──────────────────────────────────────────────────────────────
  const activeSlices = (data.segments || []).filter((s) => s.is_active !== false);
  const numSlices = activeSlices.length;

  const handleTestSpin = () => {
    if (isSpinning || numSlices === 0) return;
    setIsSpinning(true);
    setTestWinner(null);
    setShowWinnerCard(false);

    const randomIndex = Math.floor(Math.random() * numSlices);
    const winningSeg = activeSlices[randomIndex];
    const sliceAng = 360 / numSlices;
    const targetSliceAngle = (numSlices - randomIndex - 0.5) * sliceAng;
    const newRotation = wheelRotation + 1800 + targetSliceAngle - (wheelRotation % 360);

    setWheelRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setTestWinner(winningSeg);
      setShowWinnerCard(true);
    }, 4600);
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (!logSearch) return true;
    const q = logSearch.toLowerCase();
    return (
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      (log.phone && log.phone.includes(q)) ||
      (log.segment_label && log.segment_label.toLowerCase().includes(q)) ||
      (log.coupon_code && log.coupon_code.toLowerCase().includes(q))
    );
  });

  const totalPoolProbability = (data.segments || []).reduce((sum, s) => sum + (Number(s.probability) || 0), 0);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  // Wheel Geometry
  const WHEEL_R = 115;
  const WHEEL_CX = 130;
  const WHEEL_CY = 130;
  const wheelSliceAngle = numSlices > 0 ? 360 / numSlices : 360;

  // Bulb pegs for the mobile-accurate wheel
  const renderBulbPegs = () => {
    const pegs = [];
    const numPegs = 20;
    const pegDist = 122;
    const bulbColors = ['#FFFFFF', '#FFD700', '#FF6B35'];
    for (let i = 0; i < numPegs; i++) {
      const angle = (i * 360) / numPegs - 90;
      const rad = (angle * Math.PI) / 180;
      const px = WHEEL_CX + pegDist * Math.cos(rad);
      const py = WHEEL_CY + pegDist * Math.sin(rad);
      pegs.push(
        <circle key={i} cx={px} cy={py} r="4" fill={bulbColors[i % 3]} stroke="#B8860B" strokeWidth="0.8" />
      );
    }
    return pegs;
  };

  // Gold spoke dividers
  const renderSpokes = () => {
    if (numSlices <= 1) return null;
    const spokes = [];
    for (let i = 0; i < numSlices; i++) {
      const angle = (i * wheelSliceAngle - 90) * (Math.PI / 180);
      const x2 = WHEEL_CX + WHEEL_R * Math.cos(angle);
      const y2 = WHEEL_CY + WHEEL_R * Math.sin(angle);
      spokes.push(
        <line key={i} x1={WHEEL_CX} y1={WHEEL_CY} x2={x2} y2={y2} stroke="rgba(255,215,0,0.75)" strokeWidth="1.2" />
      );
    }
    return spokes;
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-rose-500/15 p-6 rounded-3xl border border-amber-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 text-white px-3 py-1 rounded-full shadow-xs">
              <Sparkles className="h-3 w-3" />
              Gamified Rewards
            </span>
            {data.enabled ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-full">
                Disabled
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Spin & Win Lucky Wheel
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Reward shoppers with gamified spins to win instant coupons and discounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button type="button" onClick={handleDiscard}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-700 bg-white font-semibold text-xs hover:bg-slate-50 transition-colors shadow-xs cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" /> Discard
            </button>
          )}
          {isDirty ? (
            <button type="button" onClick={handleSaveSettings} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer animate-fadeIn">
              <Save className="h-4 w-4 text-white" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs font-semibold shadow-xs">
              <Check className="h-3.5 w-3.5 text-blue-600" /> Saved
            </div>
          )}
        </div>
      </div>

      {/* ─── Section Tabs ────────────────────────────────────────────────── */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2 max-w-fit">
        {[
          { id: 'settings', label: 'Wheel Settings', icon: Compass, color: 'from-purple-600 to-indigo-600 shadow-purple-500/20' },
          { id: 'slices', label: `Slices (${(data.segments || []).length})`, icon: Trophy, color: 'from-amber-500 to-orange-500 shadow-amber-500/20' },
          { id: 'history', label: 'Winners History', icon: History, color: 'from-emerald-600 to-teal-600 shadow-emerald-500/20' },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active ? `bg-gradient-to-r ${tab.color} text-white shadow-md` : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SECTION 1: SETTINGS + MOBILE PREVIEW                              */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeSection === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Simple Settings Form */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-5">
            {/* Card: Enable + Title/Subtitle */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Enable Wheel</h2>
                    <p className="text-xs text-slate-500">Show spin wheel in the mobile app</p>
                  </div>
                </div>
                <button type="button" onClick={() => setData((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${data.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${data.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Popup Heading</label>
                <Input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })}
                  placeholder="e.g. Spin & Win Real Rewards!" className="font-bold text-slate-900" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Popup Subtitle</label>
                <Input value={data.subtitle} onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                  placeholder="e.g. Spin the wheel today..." className="text-slate-800 text-sm" required />
              </div>
            </div>

            {/* Card: Rules */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <Coins className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Spin Rules</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Max Spins / Day</label>
                  <Input type="number" min="1" max="10" value={data.max_per_day}
                    onChange={(e) => setData({ ...data, max_per_day: parseInt(e.target.value, 10) || 1 })} className="font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Cooldown Hours</label>
                  <Input type="number" min="1" max="168" value={data.cooldown_hours}
                    onChange={(e) => setData({ ...data, cooldown_hours: parseFloat(e.target.value) || 24 })} className="font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Popup Delay (sec)</label>
                  <Input type="number" min="1" max="30" value={data.delay_seconds}
                    onChange={(e) => setData({ ...data, delay_seconds: parseInt(e.target.value, 10) || 3 })} className="font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Min Orders</label>
                  <select value={data.min_orders} onChange={(e) => setData({ ...data, min_orders: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:border-purple-500">
                    <option value={0}>All Shoppers</option>
                    <option value={1}>After 1 Order</option>
                    <option value={2}>After 2 Orders</option>
                    <option value={3}>After 3 Orders</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 text-center">
                <p className="text-2xl font-black text-slate-900">{Number(data.total_spins || 0).toLocaleString()}</p>
                <p className="text-[11px] font-bold text-purple-700 mt-1">Total Spins</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
                <p className="text-2xl font-black text-slate-900">{activeSlices.length}</p>
                <p className="text-[11px] font-bold text-amber-700 mt-1">Active Slices</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-center">
                <p className="text-2xl font-black text-slate-900">{totalPoolProbability}%</p>
                <p className="text-[11px] font-bold text-emerald-700 mt-1">Total Odds</p>
              </div>
            </div>

            {/* Inline Save Bar */}
            {isDirty && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-xs font-bold text-blue-950">You have unsaved changes</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleDiscard}
                    className="px-4 py-2 rounded-xl border border-blue-300 text-blue-800 bg-white font-semibold text-xs hover:bg-blue-50 cursor-pointer">
                    Discard
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer">
                    <Save className="h-3.5 w-3.5 text-white" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* ─── Right: EXACT Mobile App Preview ─────────────────────────── */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col items-center">
              <div className="w-full flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
                <Smartphone className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Mobile App Preview
                </span>
              </div>

              {/* ── Smartphone Frame ── */}
              <div className="relative w-[300px] h-[600px] rounded-[40px] border-[8px] border-slate-900 shadow-2xl overflow-hidden bg-[rgba(5,10,28,0.82)] flex items-center justify-center select-none">
                {/* Dynamic Island */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-30" />

                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 pt-2.5 px-5 pb-1 flex items-center justify-between text-[10px] font-bold text-white/60 z-20">
                  <span>9:41</span>
                  <div className="flex items-center gap-1 text-[9px]">
                    <span>5G</span>
                    <div className="w-3.5 h-1.5 rounded-xs border border-current flex items-center p-px">
                      <div className="w-full h-full bg-current rounded-sm" />
                    </div>
                  </div>
                </div>

                {/* ── Winner Celebration Overlay ── */}
                {showWinnerCard && testWinner && (
                  <div className="absolute inset-0 bg-[rgba(5,10,28,0.88)] z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="w-full max-w-[260px] bg-white rounded-[24px] overflow-hidden border-2 border-amber-400 shadow-2xl text-center" style={{ boxShadow: '0 10px 40px rgba(255,215,0,0.35)' }}>
                      {/* Gold Ribbon */}
                      <div className="w-full bg-[#E91E8C] py-2.5">
                        <p className="text-[13px] font-black text-white tracking-wider">
                          {testWinner.type === 'no_prize' ? 'Oops!' : 'YOU WON!'}
                        </p>
                      </div>

                      <div className="p-5 space-y-3">
                        <p className="text-4xl">{testWinner.type === 'no_prize' ? '😅' : testWinner.type === 'free_shipping' ? '🚚' : '🎁'}</p>
                        <p className="text-sm font-black text-slate-900">
                          {testWinner.type === 'no_prize' ? 'Better Luck Next Time!' : 'Congratulations!'}
                        </p>
                        <p className="text-lg font-black text-[#E91E8C]">{testWinner.label}</p>

                        {testWinner.type === 'free_shipping' && (
                          <div className="bg-blue-50 border-2 border-blue-500 rounded-xl px-4 py-3">
                            <p className="text-xs font-black text-blue-700 tracking-wide">FREE DELIVERY</p>
                            <p className="text-[10px] text-blue-500 font-semibold mt-1">Auto-applied on your next order!</p>
                          </div>
                        )}

                        {testWinner.coupon_code && testWinner.type !== 'free_shipping' && (
                          <div className="bg-green-50 border-2 border-green-500 border-dashed rounded-xl px-4 py-3" onClick={() => handleCopyCode(testWinner.coupon_code)}>
                            <p className="text-[9px] font-black text-green-700 tracking-widest">YOUR COUPON CODE</p>
                            <p className="text-xl font-black text-slate-900 tracking-widest my-1 font-mono">{testWinner.coupon_code}</p>
                            <p className="text-[10px] text-green-600 font-semibold">Auto-applied at checkout</p>
                          </div>
                        )}

                        <button type="button" onClick={() => setShowWinnerCard(false)}
                          className="w-full py-3 rounded-full bg-[#E91E8C] text-white font-black text-xs tracking-wide shadow-lg cursor-pointer hover:bg-[#D1177D] transition-colors"
                          style={{ boxShadow: '0 6px 20px rgba(233,30,140,0.4)' }}>
                          {testWinner.type === 'no_prize' ? 'OK, Got It' : 'CLAIM & SHOP NOW'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Spin Wheel Modal Card (Exact Mobile Match) ── */}
                <div className="w-[270px] bg-white rounded-[24px] overflow-hidden border-2 border-amber-400 flex flex-col items-center pb-4 relative" style={{ boxShadow: '0 8px 30px rgba(255,215,0,0.35)' }}>
                  {/* Top Pink Ribbon */}
                  <div className="w-full bg-[#E91E8C] py-2 flex items-center justify-center">
                    <div className="bg-white/15 px-4 py-0.5 rounded-full">
                      <p className="text-[9px] font-black text-white tracking-[2px]">LUCKY REWARD WHEEL</p>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button type="button" className="absolute top-1.5 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white z-10">
                    <X className="h-3 w-3" />
                  </button>

                  {/* Title & Subtitle */}
                  <h3 className="text-[14px] font-black text-slate-900 text-center mt-3 px-3 leading-tight">
                    {data.title || 'Spin & Win Real Rewards!'}
                  </h3>
                  <p className="text-[10px] text-slate-500 text-center px-4 font-semibold leading-tight mt-1 line-clamp-2">
                    {data.subtitle || 'Spin the wheel today and win exclusive discounts!'}
                  </p>

                  {/* ── Wheel Stage ── */}
                  <div className="relative my-3 flex flex-col items-center justify-center">
                    {/* Pointer Arrow */}
                    <div className="absolute -top-2.5 z-30 flex flex-col items-center">
                      <div className="w-0 h-0" style={{
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: '22px solid #FFD700',
                        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
                      }} />
                      <div className="absolute top-1 w-2.5 h-2.5 rounded-full bg-[#E91E8C] border-2 border-white" style={{ boxShadow: '0 0 8px rgba(233,30,140,0.8)' }} />
                    </div>

                    {/* SVG Wheel */}
                    <div className="relative w-[220px] h-[220px]">
                      <svg width="260" height="260" viewBox="0 0 260 260" className="w-full h-full"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
                        }}>
                        <defs>
                          {activeSlices.map((seg, idx) => {
                            const base = seg.color || SLICE_PALETTE[idx % SLICE_PALETTE.length];
                            return (
                              <radialGradient key={`rg-${idx}`} id={`adminSliceGrad-${idx}`} cx="35%" cy="35%" r="70%">
                                <stop offset="0%" stopColor={base} stopOpacity="1" />
                                <stop offset="60%" stopColor={base} stopOpacity="0.9" />
                                <stop offset="100%" stopColor={base} stopOpacity="0.65" />
                              </radialGradient>
                            );
                          })}
                          <radialGradient id="adminGoldRim" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFF176" />
                            <stop offset="55%" stopColor="#FFD700" />
                            <stop offset="85%" stopColor="#FFA000" />
                            <stop offset="100%" stopColor="#7A5200" />
                          </radialGradient>
                          <radialGradient id="adminHubGrad" cx="40%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#FF6B9D" />
                            <stop offset="50%" stopColor="#E91E8C" />
                            <stop offset="100%" stopColor="#880E4F" />
                          </radialGradient>
                        </defs>

                        {/* Shadow */}
                        <circle cx={WHEEL_CX} cy={WHEEL_CY} r="128" fill="rgba(0,0,0,0.25)" transform="translate(2,4)" />

                        {/* Gold Outer Ring */}
                        <circle cx={WHEEL_CX} cy={WHEEL_CY} r="127" fill="url(#adminGoldRim)" stroke="#7A5200" strokeWidth="2.5" />
                        <circle cx={WHEEL_CX} cy={WHEEL_CY} r="118" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                        <circle cx={WHEEL_CX} cy={WHEEL_CY} r="117" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

                        {/* Bulb Pegs */}
                        {renderBulbPegs()}

                        {/* Pie Slices */}
                        {numSlices === 0 ? (
                          <circle cx={WHEEL_CX} cy={WHEEL_CY} r={WHEEL_R} fill="#334155" />
                        ) : (
                          activeSlices.map((seg, idx) => {
                            const startAngle = idx * wheelSliceAngle - 90;
                            const endAngle = (idx + 1) * wheelSliceAngle - 90;
                            const midAngle = (idx + 0.5) * wheelSliceAngle - 90;

                            const rad1 = (startAngle * Math.PI) / 180;
                            const rad2 = (endAngle * Math.PI) / 180;
                            const radMid = (midAngle * Math.PI) / 180;

                            const x1 = WHEEL_CX + WHEEL_R * Math.cos(rad1);
                            const y1 = WHEEL_CY + WHEEL_R * Math.sin(rad1);
                            const x2 = WHEEL_CX + WHEEL_R * Math.cos(rad2);
                            const y2 = WHEEL_CY + WHEEL_R * Math.sin(rad2);

                            const tx = WHEEL_CX + (WHEEL_R * 0.62) * Math.cos(radMid);
                            const ty = WHEEL_CY + (WHEEL_R * 0.62) * Math.sin(radMid);

                            const largeArc = wheelSliceAngle > 180 ? 1 : 0;
                            const pathData = numSlices === 1
                              ? `M ${WHEEL_CX - WHEEL_R} ${WHEEL_CY} A ${WHEEL_R} ${WHEEL_R} 0 1 0 ${WHEEL_CX + WHEEL_R} ${WHEEL_CY} A ${WHEEL_R} ${WHEEL_R} 0 1 0 ${WHEEL_CX - WHEEL_R} ${WHEEL_CY}`
                              : `M ${WHEEL_CX} ${WHEEL_CY} L ${x1} ${y1} A ${WHEEL_R} ${WHEEL_R} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                            // Glossy highlight
                            const hR = WHEEL_R * 0.95;
                            const hR2 = WHEEL_R * 0.55;
                            const hx1 = WHEEL_CX + hR2 * Math.cos(rad1);
                            const hy1 = WHEEL_CY + hR2 * Math.sin(rad1);
                            const hx2 = WHEEL_CX + hR * Math.cos(rad1);
                            const hy2 = WHEEL_CY + hR * Math.sin(rad1);
                            const hx3 = WHEEL_CX + hR * Math.cos(rad2);
                            const hy3 = WHEEL_CY + hR * Math.sin(rad2);
                            const hx4 = WHEEL_CX + hR2 * Math.cos(rad2);
                            const hy4 = WHEEL_CY + hR2 * Math.sin(rad2);
                            const highlightPath = numSlices > 1
                              ? `M ${hx1} ${hy1} L ${hx2} ${hy2} A ${hR} ${hR} 0 ${largeArc} 1 ${hx3} ${hy3} L ${hx4} ${hy4} A ${hR2} ${hR2} 0 ${largeArc} 0 ${hx1} ${hy1} Z`
                              : null;

                            return (
                              <g key={seg.id || idx}>
                                <path d={pathData} fill={`url(#adminSliceGrad-${idx})`} stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
                                {highlightPath && <path d={highlightPath} fill="rgba(255,255,255,0.15)" stroke="none" />}
                                <text x={tx} y={ty} fill={seg.text_color || '#FFFFFF'} fontSize="8.5" fontWeight="900"
                                  textAnchor="middle" dominantBaseline="central"
                                  transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}>
                                  {seg.label?.length > 10 ? `${seg.label.slice(0, 9)}...` : seg.label}
                                </text>
                              </g>
                            );
                          })
                        )}

                        {/* Spokes */}
                        {renderSpokes()}

                        {/* Center Hub */}
                        <circle cx={WHEEL_CX} cy={WHEEL_CY} r="28" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
                        <circle cx={WHEEL_CX} cy={WHEEL_CY} r="24" fill="url(#adminHubGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                        <text x={WHEEL_CX} y={WHEEL_CY - 3} fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle" dominantBaseline="central">SPIN</text>
                        <text x={WHEEL_CX} y={WHEEL_CY + 5} fill="rgba(255,255,255,0.85)" fontSize="6" fontWeight="700" textAnchor="middle" dominantBaseline="central">NOW</text>
                      </svg>

                      {/* SPIN Button overlay */}
                      <button type="button" onClick={handleTestSpin} disabled={isSpinning || numSlices === 0}
                        className="absolute inset-0 m-auto w-12 h-12 rounded-full cursor-pointer z-20" style={{ background: 'transparent' }} />
                    </div>
                  </div>

                  {/* Tip Text */}
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Spin once every {data.cooldown_hours || 24}h
                  </p>

                  {/* Test Spin Button */}
                  <button type="button" onClick={handleTestSpin} disabled={isSpinning || numSlices === 0}
                    className="mt-2 px-6 py-1.5 rounded-full bg-[#E91E8C] text-white font-black text-[10px] tracking-wide shadow-md cursor-pointer hover:bg-[#D1177D] transition-colors disabled:opacity-50"
                    style={{ boxShadow: '0 4px 14px rgba(233,30,140,0.35)' }}>
                    {isSpinning ? 'Spinning...' : 'TAP TO SPIN'}
                  </button>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />
              </div>

              <p className="text-[11px] text-slate-500 font-medium mt-3 text-center">
                This preview matches your mobile app exactly
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SECTION 2: WHEEL SLICES                                           */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeSection === 'slices' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {(data.segments || []).length} Segments
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  totalPoolProbability === 100 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}>
                  Total Odds: {totalPoolProbability}%
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1">Wheel Slices</h2>
              <p className="text-xs text-slate-500 mt-0.5">Customize each slice label, coupon, color, and probability.</p>
            </div>
            <Button type="button" onClick={openAddSliceModal}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md cursor-pointer">
              <Plus className="h-4 w-4" /> Add Slice
            </Button>
          </div>

          {/* Slices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data.segments || []).map((slice, index) => {
              const badgeColor = slice.type === 'coupon' ? 'bg-purple-100 text-purple-800 border-purple-200'
                : slice.type === 'cashback' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : slice.type === 'free_shipping' ? 'bg-sky-100 text-sky-800 border-sky-200'
                : 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div key={slice.id || index}
                  className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 hover:shadow-md transition-all ${
                    slice.is_active ? 'border-slate-200/80' : 'border-slate-200 opacity-60'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {slice.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {slice.probability}% chance
                    </span>
                  </div>

                  {/* Color card */}
                  <div className="relative overflow-hidden p-3 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: slice.color || '#E91E8C', color: slice.text_color || '#FFFFFF' }}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
                    <div>
                      <p className="font-extrabold text-sm leading-snug line-clamp-1">{slice.label}</p>
                      {slice.coupon_code && (
                        <p className="text-[10px] font-mono opacity-80 mt-0.5">{slice.coupon_code}</p>
                      )}
                    </div>
                    <span className="text-base font-black">{slice.value ? `₹${slice.value}` : ''}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => handleToggleSliceActive(slice)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer ${
                        slice.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {slice.is_active ? 'Active' : 'Disabled'}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => openEditSliceModal(slice)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                        <Edit3 className="h-3 w-3 text-purple-600" /> Edit
                      </button>
                      <button type="button" onClick={() => handleDeleteSlice(slice.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SECTION 3: WINNERS HISTORY                                        */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeSection === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Winners</h2>
              <p className="text-xs text-slate-500 mt-0.5">{data.total_spins || 0} total spins recorded</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleForceAllUsers}
                className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold cursor-pointer">
                Force Popup For All
              </button>
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input value={logSearch} onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search winner, phone..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>
          </div>

          {logsLoading ? (
            <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No spin history found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-5">Reward</th>
                    <th className="py-3 px-5">Coupon Code</th>
                    <th className="py-3 px-5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const initials = (log.user_name || 'C')
                      .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-[10px] flex items-center justify-center">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-xs">{log.user_name || 'Customer'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{log.phone || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="font-bold text-slate-900 text-xs">{log.segment_label}</span>
                        </td>
                        <td className="py-3 px-5">
                          {log.coupon_code ? (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              {log.coupon_code}
                            </span>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="py-3 px-5 text-right text-[10px] text-slate-500">
                          {new Date(log.created_at || log.spun_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {logsPage}</span>
            <div className="flex items-center gap-2">
              <button disabled={logsPage <= 1} onClick={() => setLogsPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={logs.length < 20} onClick={() => setLogsPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ADD / EDIT SLICE MODAL                                            */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {sliceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <Compass className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  {editingSlice ? 'Edit Slice' : 'Add New Slice'}
                </h3>
              </div>
              <button type="button" onClick={() => setSliceModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Slice Label</label>
                <Input value={sliceForm.label} onChange={(e) => setSliceForm({ ...sliceForm, label: e.target.value })}
                  placeholder="e.g. ₹100 Off Voucher" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Prize Type</label>
                  <select value={sliceForm.type} onChange={(e) => setSliceForm({ ...sliceForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-purple-500">
                    <option value="coupon">Discount Coupon</option>
                    <option value="cashback">Cashback</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="no_prize">Better Luck Next Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Value</label>
                  <Input type="number" value={sliceForm.value}
                    onChange={(e) => setSliceForm({ ...sliceForm, value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Coupon Code</label>
                  <Input value={sliceForm.coupon_code}
                    onChange={(e) => setSliceForm({ ...sliceForm, coupon_code: e.target.value.toUpperCase() })}
                    placeholder="LUCKY100" className="font-mono text-xs uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Win Chance (%)</label>
                  <Input type="number" min="1" max="100" value={sliceForm.probability}
                    onChange={(e) => setSliceForm({ ...sliceForm, probability: parseInt(e.target.value, 10) || 10 })} />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Slice Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SLICE_PALETTE.map((c) => (
                    <button key={c} type="button" onClick={() => setSliceForm({ ...sliceForm, color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        sliceForm.color === c ? 'border-purple-600 scale-110 shadow-xs' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={sliceForm.color}
                    onChange={(e) => setSliceForm({ ...sliceForm, color: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200 p-0.5 ml-2" />
                </div>
              </div>

              {/* Mini Preview */}
              <div className="p-3 rounded-xl flex items-center justify-between shadow-xs"
                style={{ backgroundColor: sliceForm.color, color: sliceForm.text_color }}>
                <div>
                  <p className="text-xs font-extrabold">{sliceForm.label || 'Slice Label'}</p>
                  <p className="text-[10px] opacity-80 font-mono mt-0.5">{sliceForm.coupon_code || 'CODE'}</p>
                </div>
                <span className="text-sm font-black">{sliceForm.value ? `₹${sliceForm.value}` : ''}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setSliceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer">
                  {editingSlice ? 'Save Changes' : 'Create Slice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
