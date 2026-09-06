import React, { useEffect, useState } from 'react';
import { scratchCardApi } from '../../../api';
import NotificationModal from '../../../components/ui/NotificationModal';
import './ScratchCardPage.css';

export default function ScratchCardPage() {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'prizes' | 'users' | 'logs'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState({
    enabled: true,
    min_order: 499,
    payment_methods: 'all',
    auto_grant: true,
    title: '🎁 Scratch & Win Guaranteed Prizes!',
    subtitle: 'Scratch the card to reveal your instant discount reward!',
    foil_color: '#C0C0C0',
    min_orders: 0,
    active_from: '',
    active_until: '',
    max_per_day: 1,
    cooldown_hours: 24,
    total_scratches: 0,
    prizes: [],
  });

  // Simulator state
  const [isScratched, setIsScratched] = useState(false);

  // Users permissions state
  const [userList, setUserList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userListLoading, setUserListLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);

  // Notification modal
  const [notifModal, setNotifModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Modal for prize card creation/editing
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null);
  const [prizeForm, setPrizeForm] = useState({
    label: '',
    type: 'coupon',
    value: 100,
    coupon_code: '',
    color: '#FFD700',
    text_color: '#000000',
    probability: 25,
    is_active: true,
  });

  const showNotify = (type, title, message) => {
    setNotifModal({ isOpen: true, type, title, message });
  };

  const closeNotify = () => {
    setNotifModal((prev) => ({ ...prev, isOpen: false }));
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await scratchCardApi.getConfig();
      const resData = res.data || res;
      setData(resData);
    } catch (err) {
      showNotify('error', 'Error Loading Config', err.response?.data?.message || 'Failed to load scratch card config.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersPermissions = async (pageNo = 1, searchStr = '') => {
    try {
      setUserListLoading(true);
      const res = await scratchCardApi.getUsersPermissions({ page: pageNo, search: searchStr });
      const resData = res.data || res;
      setUserList(resData.users || []);
      setTotalUsers(resData.total || 0);
      setUserPage(pageNo);
    } catch (err) {
      // silent catch for polling
    } finally {
      setUserListLoading(false);
    }
  };

  const fetchLogs = async (pageNo = 1) => {
    try {
      setLogsLoading(true);
      const res = await scratchCardApi.getLogs({ page: pageNo });
      const resData = res.data || res;
      setLogs(resData.logs || []);
      setLogsPage(pageNo);
    } catch (err) {
      // silent
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    let interval;
    if (activeTab === 'users') {
      fetchUsersPermissions(userPage, userSearch);
      interval = setInterval(() => {
        fetchUsersPermissions(userPage, userSearch);
      }, 3000);
    } else if (activeTab === 'logs') {
      fetchLogs(logsPage);
      interval = setInterval(() => {
        fetchLogs(logsPage);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, userPage, userSearch, logsPage]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await scratchCardApi.updateSettings(data);
      showNotify('success', 'Settings Saved! 🎯', 'Scratch & Win eligibility criteria, schedule, and settings updated successfully.');
      fetchConfig();
    } catch (err) {
      showNotify('error', 'Save Failed', err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleForceUserPopup = async (userId) => {
    try {
      await scratchCardApi.forceUserScratchPopup(userId);
      showNotify('success', 'Scratch Card Forced! ⚡', 'Scratch card popup will appear for this customer immediately on their app open.');
      fetchUsersPermissions(userPage, userSearch);
    } catch (err) {
      showNotify('error', 'Action Failed', err.response?.data?.message || 'Failed to force scratch popup.');
    }
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === userList.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(userList.map((u) => u.id));
    }
  };

  const handleBulkForcePopup = async () => {
    if (!selectedUserIds.length) return;
    try {
      await scratchCardApi.forceUserScratchPopup(null, selectedUserIds);
      showNotify('success', 'Bulk Scratch Popup Forced! ⚡', `Scratch card popup enabled for ${selectedUserIds.length} specified customer(s).`);
      setSelectedUserIds([]);
      fetchUsersPermissions(userPage, userSearch);
    } catch (err) {
      showNotify('error', 'Action Failed', err.response?.data?.message || 'Failed to force bulk popup.');
    }
  };

  const setDatePreset = (type) => {
    const now = new Date();
    if (type === 'always') {
      setData((prev) => ({ ...prev, active_from: '', active_until: '' }));
    } else if (type === 'weekend') {
      const sat = new Date(now);
      sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
      sat.setHours(0, 0, 0, 0);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      sun.setHours(23, 59, 59, 999);
      setData((prev) => ({
        ...prev,
        active_from: sat.toISOString().slice(0, 16),
        active_until: sun.toISOString().slice(0, 16),
      }));
    } else if (type === '7days') {
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setData((prev) => ({
        ...prev,
        active_from: now.toISOString().slice(0, 16),
        active_until: end.toISOString().slice(0, 16),
      }));
    } else if (type === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59);
      setData((prev) => ({
        ...prev,
        active_from: start.toISOString().slice(0, 16),
        active_until: end.toISOString().slice(0, 16),
      }));
    }
  };

  // Schedule status badge computation
  const getScheduleStatus = () => {
    if (!data.active_from && !data.active_until) {
      return { text: '🟢 Always Active (No Time Limit)', color: '#10b981', bg: '#ecfdf5' };
    }
    const now = new Date();
    if (data.active_from && now < new Date(data.active_from)) {
      return { text: '🟡 Scheduled (Starts Future)', color: '#f59e0b', bg: '#fffbeb' };
    }
    if (data.active_until && now > new Date(data.active_until)) {
      return { text: '🔴 Expired', color: '#ef4444', bg: '#fef2f2' };
    }
    return { text: '🟢 Live Active Now', color: '#10b981', bg: '#ecfdf5' };
  };

  const scheduleStatus = getScheduleStatus();

  const openAddPrizeModal = () => {
    setEditingPrize(null);
    setPrizeForm({
      label: '',
      type: 'coupon',
      value: 100,
      coupon_code: '',
      color: '#FFD700',
      text_color: '#000000',
      probability: 25,
      is_active: true,
    });
    setPrizeModalOpen(true);
  };

  const openEditPrizeModal = (prize) => {
    setEditingPrize(prize);
    setPrizeForm({
      label: prize.label,
      type: prize.type,
      value: prize.value,
      coupon_code: prize.coupon_code || '',
      color: prize.color || '#FFD700',
      text_color: prize.text_color || '#000000',
      probability: prize.probability || 10,
      is_active: prize.is_active !== false,
    });
    setPrizeModalOpen(true);
  };

  const handleSavePrize = async (e) => {
    e.preventDefault();
    try {
      if (editingPrize) {
        await scratchCardApi.updatePrize(editingPrize.id, prizeForm);
        showNotify('success', 'Prize Updated!', 'Prize card updated successfully.');
      } else {
        await scratchCardApi.createPrize(prizeForm);
        showNotify('success', 'Prize Added!', 'New prize card added to the pool.');
      }
      setPrizeModalOpen(false);
      fetchConfig();
    } catch (err) {
      showNotify('error', 'Error Saving Prize', err.response?.data?.message || 'Failed to save prize card.');
    }
  };

  const handleDeletePrize = async (id) => {
    if (!window.confirm('Are you sure you want to remove this prize card from the pool?')) return;
    try {
      await scratchCardApi.deletePrize(id);
      showNotify('success', 'Prize Removed', 'Prize card deleted from pool.');
      fetchConfig();
    } catch (err) {
      showNotify('error', 'Delete Failed', err.response?.data?.message || 'Failed to delete prize.');
    }
  };

  return (
    <div className="sc-container">
      <NotificationModal
        isOpen={notifModal.isOpen}
        type={notifModal.type}
        title={notifModal.title}
        message={notifModal.message}
        onClose={closeNotify}
      />

      {/* Header */}
      <div className="sc-header">
        <div>
          <h1 className="sc-title">🎁 Scratch & Win Card Management</h1>
          <p className="sc-subtitle">
            Manage after how many orders customers get Scratch cards, active dates & times, target specified users, and win rewards.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sc-tabs-bar">
        <button
          className={`sc-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Rules & Eligibility Schedule
        </button>
        <button
          className={`sc-tab-btn ${activeTab === 'prizes' ? 'active' : ''}`}
          onClick={() => setActiveTab('prizes')}
        >
          🎁 Prize Cards Pool ({data.prizes?.length || 0})
        </button>
        <button
          className={`sc-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Specific Customer Permissions ({totalUsers})
        </button>
        <button
          className={`sc-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📜 Scratch Audit Logs ({data.total_scratches || 0})
        </button>
      </div>

      {/* Main Grid */}
      <div className="sc-layout">
        {/* Left Tab Content */}
        <div className="sc-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading scratch card configuration...
            </div>
          ) : (
            <>
              {/* TAB 1: SETTINGS & ELIGIBILITY */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div>
                    <h3 className="sc-card-title">Offer Rules & Customer Eligibility</h3>
                    <p className="sc-card-sub">
                      Control who can scratch, minimum order thresholds, and active date & time schedule.
                    </p>
                  </div>

                  {/* Enable Switch */}
                  <div className="sc-setting-box">
                    <label className="sc-toggle-label">
                      <input
                        type="checkbox"
                        checked={data.enabled}
                        onChange={(e) => setData({ ...data, enabled: e.target.checked })}
                      />
                      <span className="font-bold">Enable Scratch & Win Offer in App</span>
                    </label>
                    <p className="sc-help-text">
                      Turn ON to allow eligible customers to earn and scratch discount cards.
                    </p>
                  </div>

                  {/* 🎯 SECTION: ORDER ELIGIBILITY RULE */}
                  <div className="bg-purple-50/70 border border-purple-200/90 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎯</span>
                        <h4 className="font-extrabold text-slate-900 text-sm">After How Many Orders Can Customer Scratch?</h4>
                      </div>
                      <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                        {data.min_orders === 0 ? 'All Customers (0 Orders)' : `After ${data.min_orders} Completed Orders`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="sc-label">Minimum Orders Required</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          value={data.min_orders}
                          onChange={(e) => setData({ ...data, min_orders: parseInt(e.target.value, 10) || 0 })}
                          className="sc-input max-w-[140px] font-bold text-base"
                        />
                        <span className="text-xs text-slate-500 font-medium">orders placed by customer</span>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { label: 'All Users (0)', val: 0 },
                          { label: '1st Order (1)', val: 1 },
                          { label: '2 Orders', val: 2 },
                          { label: '3 Orders', val: 3 },
                          { label: '5 Orders', val: 5 },
                          { label: '10 Orders', val: 10 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setData({ ...data, min_orders: preset.val })}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                              data.min_orders === preset.val
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 📅 SECTION: ACTIVE DATE & TIME SCHEDULE */}
                  <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <h4 className="font-extrabold text-slate-900 text-sm">Active Schedule (Which Date & Which Time)</h4>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full border"
                        style={{ color: scheduleStatus.color, backgroundColor: scheduleStatus.bg, borderColor: `${scheduleStatus.color}40` }}
                      >
                        {scheduleStatus.text}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="sc-label">Active From (Start Date & Time)</label>
                        <input
                          type="datetime-local"
                          value={data.active_from ? data.active_from.slice(0, 16) : ''}
                          onChange={(e) => setData({ ...data, active_from: e.target.value })}
                          className="sc-input font-medium text-xs"
                        />
                      </div>
                      <div>
                        <label className="sc-label">Active Until (End Date & Time)</label>
                        <input
                          type="datetime-local"
                          value={data.active_until ? data.active_until.slice(0, 16) : ''}
                          onChange={(e) => setData({ ...data, active_until: e.target.value })}
                          className="sc-input font-medium text-xs"
                        />
                      </div>
                    </div>

                    {/* Schedule Quick Presets */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDatePreset('always')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 transition-all"
                      >
                        ⚡ Always Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('weekend')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 transition-all"
                      >
                        🎉 This Weekend
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('7days')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 transition-all"
                      >
                        ⏳ Next 7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('month')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 transition-all"
                      >
                        🗓️ This Month
                      </button>
                    </div>
                  </div>

                  {/* ⚡ SECTION: SCRATCH LIMITS & COOLDOWN */}
                  <div className="sc-field-row">
                    <div className="sc-field-group">
                      <label className="sc-label">Max Scratches Allowed Per Day</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={data.max_per_day}
                        onChange={(e) => setData({ ...data, max_per_day: parseInt(e.target.value, 10) || 1 })}
                        className="sc-input font-bold"
                      />
                      <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                        Maximum scratch opportunities per customer in 24 hours.
                      </p>
                    </div>

                    <div className="sc-field-group">
                      <label className="sc-label">Cooldown Between Scratches (Hours)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={data.cooldown_hours}
                        onChange={(e) => setData({ ...data, cooldown_hours: parseFloat(e.target.value) || 0 })}
                        className="sc-input font-bold"
                      />
                      <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                        Wait time required before the customer can scratch again.
                      </p>
                    </div>
                  </div>

                  {/* Other Order Value & Payment Restrictions */}
                  <div className="sc-field-row">
                    <div className="sc-field-group">
                      <label className="sc-label">Min Purchase Amount to Earn Card (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={data.min_order}
                        onChange={(e) => setData({ ...data, min_order: parseFloat(e.target.value) || 0 })}
                        className="sc-input font-bold"
                        placeholder="499"
                        required
                      />
                    </div>

                    <div className="sc-field-group">
                      <label className="sc-label">Qualifying Payment Modes</label>
                      <select
                        value={data.payment_methods}
                        onChange={(e) => setData({ ...data, payment_methods: e.target.value })}
                        className="sc-input font-medium"
                      >
                        <option value="all">💳 All Payment Methods (Prepaid & COD)</option>
                        <option value="prepaid_only">⚡ Online Payments Only (Prepaid Exclusive)</option>
                        <option value="cod_only">💵 Cash on Delivery (COD) Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-3">
                    <div className="sc-field-group">
                      <label className="sc-label">Scratch Card Popup Heading Title</label>
                      <input
                        type="text"
                        value={data.title}
                        onChange={(e) => setData({ ...data, title: e.target.value })}
                        className="sc-input"
                        required
                      />
                    </div>

                    <div className="sc-field-group">
                      <label className="sc-label">Scratch Card Description Subtitle</label>
                      <textarea
                        rows={2}
                        value={data.subtitle}
                        onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                        className="sc-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', textAlign: 'right' }}>
                    <button type="submit" className="sc-save-btn" disabled={saving}>
                      {saving ? 'Saving...' : '💾 Save Scratch Card Rules & Schedule'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: PRIZE POOL */}
              {activeTab === 'prizes' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <div>
                      <h3 className="sc-card-title">Scratch Card Prize Pool</h3>
                      <p className="sc-card-sub" style={{ margin: 0 }}>Configure discount coupons, cashbacks, free gifts, and win probabilities.</p>
                    </div>
                    <button className="sc-save-btn" onClick={openAddPrizeModal}>
                      + Add New Prize Card
                    </button>
                  </div>

                  <div className="sc-prize-grid">
                    {data.prizes.map((prize) => (
                      <div
                        key={prize.id}
                        className="sc-prize-card"
                        style={{ background: prize.color || '#7c3aed', color: prize.text_color || '#ffffff' }}
                      >
                        <div>
                          <span className="sc-prize-type">{prize.type}</span>
                          <h4 className="sc-prize-title">{prize.label}</h4>
                          {prize.coupon_code && <div className="sc-prize-code">CODE: {prize.coupon_code}</div>}
                        </div>
                        <div>
                          <div className="sc-prize-prob">
                            <span>Probability Weight: {prize.probability}%</span>
                            <span>{prize.is_active !== false ? '✅ Active' : '❌ Disabled'}</span>
                          </div>
                          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'inherit', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                              onClick={() => openEditPrizeModal(prize)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: '#ff4d4d', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                              onClick={() => handleDeletePrize(prize.id)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SPECIFIC USER PERMISSIONS */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="sc-card-title">Specified Customer Permissions & Force Popup</h3>
                      <p className="sc-card-sub" style={{ margin: 0 }}>
                        Target specific customers to receive instant Scratch & Win popups regardless of schedule or orders.
                      </p>
                    </div>

                    {selectedUserIds.length > 0 && (
                      <button
                        onClick={handleBulkForcePopup}
                        className="sc-save-btn"
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        ⚡ Force Scratch for Selected ({selectedUserIds.length})
                      </button>
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      placeholder="Search customer name, email, or phone..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        fetchUsersPermissions(1, e.target.value);
                      }}
                      className="sc-input"
                    />
                  </div>

                  {userListLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading customer list...</div>
                  ) : (
                    <table className="sc-table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px' }}>
                            <input
                              type="checkbox"
                              checked={userList.length > 0 && selectedUserIds.length === userList.length}
                              onChange={handleSelectAllUsers}
                            />
                          </th>
                          <th>Customer Name & Contact</th>
                          <th style={{ textAlign: 'center' }}>Orders Placed</th>
                          <th style={{ textAlign: 'center' }}>Total Scratched</th>
                          <th style={{ textAlign: 'right' }}>Target User Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userList.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>No customers found.</td></tr>
                        ) : (
                          userList.map((userObj) => {
                            const isForced = userObj.force_scratch_popup === true;
                            const isSelected = selectedUserIds.includes(userObj.id);
                            return (
                              <tr key={userObj.id} style={{ background: isSelected ? '#f5f3ff' : undefined }}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectUser(userObj.id)}
                                  />
                                </td>
                                <td>
                                  <strong>{userObj.name || 'Customer'}</strong>
                                  <br />
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    {userObj.email || '-'} · <code>{userObj.phone || '-'}</code>
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                                    {userObj.total_orders || 0} Orders
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <strong style={{ color: '#7c3aed' }}>{userObj.total_scratches || 0} Cards</strong>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    style={{
                                      padding: '5px 12px',
                                      fontSize: '11.5px',
                                      fontWeight: '800',
                                      borderRadius: '16px',
                                      color: isForced ? '#ffffff' : '#7c3aed',
                                      borderColor: isForced ? '#7c3aed' : '#c4b5fd',
                                      background: isForced ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : '#ffffff',
                                      border: '1px solid #c4b5fd',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => handleForceUserPopup(userObj.id)}
                                  >
                                    {isForced ? '⚡ Forced (Popup Pending)' : '⚡ Force Scratch'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 4: AUDIT LOGS */}
              {activeTab === 'logs' && (
                <div>
                  <h3 className="sc-card-title">Scratch Card Audit Logs</h3>
                  <p className="sc-card-sub">History of customer scratch card reveals and claimed prizes.</p>

                  {logsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading logs...</div>
                  ) : (
                    <table className="sc-table">
                      <thead>
                        <tr>
                          <th>Log ID</th>
                          <th>Customer</th>
                          <th>Prize Won</th>
                          <th>Type</th>
                          <th>Coupon Code</th>
                          <th>Date & Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.length === 0 ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>No scratch log history recorded yet.</td></tr>
                        ) : (
                          logs.map((log) => (
                            <tr key={log.id}>
                              <td>#{log.id}</td>
                              <td>
                                <strong>{log.user_name || 'Guest User'}</strong>
                                <br />
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{log.phone || '-'}</span>
                              </td>
                              <td><strong style={{ color: '#7c3aed' }}>{log.prize_label}</strong></td>
                              <td><span style={{ fontSize: '11px', textTransform: 'uppercase', background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>{log.prize_type}</span></td>
                              <td>{log.coupon_code ? <code>{log.coupon_code}</code> : '-'}</td>
                              <td>{new Date(log.scratched_at).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Live Simulator Phone */}
        <div>
          <h3 className="sc-card-title" style={{ marginBottom: '14px' }}>📱 Live Scratch Simulator</h3>
          <div className="sc-phone-wrap">
            <div className="sc-phone-notch" />
            <div className="sc-phone-screen">
              <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', color: '#7c3aed', marginBottom: '8px' }}>
                LIVE PREVIEW
              </span>
              <h4 style={{ fontSize: '16px', fontWeight: '900', margin: '0 0 4px 0' }}>{data.title}</h4>
              <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 16px 0', lineHeight: 1.4 }}>{data.subtitle}</p>

              {/* Scratch Card Box */}
              <div
                className="sc-scratch-box"
                onClick={() => setIsScratched(!isScratched)}
              >
                {!isScratched ? (
                  <div className="sc-scratch-foil" />
                ) : (
                  <div className="sc-scratch-revealed">
                    <span style={{ fontSize: '10px', fontWeight: '900', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '12px', letterSpacing: '1px', marginBottom: '8px' }}>
                      🎉 REWARD UNLOCKED!
                    </span>
                    <span style={{ fontSize: '34px', marginBottom: '4px' }}>🏆</span>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', textAlign: 'center', lineHeight: '1.3' }}>
                      {data.prizes[0]?.label || '₹100 OFF VOUCHER'}
                    </span>
                    {data.prizes[0]?.coupon_code && (
                      <span style={{ fontSize: '13px', fontWeight: '900', background: '#ffffff', color: '#7c3aed', padding: '5px 12px', borderRadius: '10px', marginTop: '10px', letterSpacing: '1.5px', fontFamily: 'monospace', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                        {data.prizes[0]?.coupon_code}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                {isScratched ? 'Click card to reset foil' : 'Click card to reveal prize!'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Prize Modal */}
      {prizeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#ffffff', width: '90%', maxWidth: '480px', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '900' }}>
              {editingPrize ? 'Edit Prize Card' : 'Add New Prize Card'}
            </h3>
            <form onSubmit={handleSavePrize}>
              <div className="sc-field-group">
                <label className="sc-label">Prize Label Title</label>
                <input
                  type="text"
                  value={prizeForm.label}
                  onChange={(e) => setPrizeForm({ ...prizeForm, label: e.target.value })}
                  className="sc-input"
                  placeholder="e.g. ₹100 Cashback Voucher"
                  required
                />
              </div>

              <div className="sc-field-row">
                <div>
                  <label className="sc-label">Prize Type</label>
                  <select
                    value={prizeForm.type}
                    onChange={(e) => setPrizeForm({ ...prizeForm, type: e.target.value })}
                    className="sc-input"
                  >
                    <option value="coupon">Discount Coupon</option>
                    <option value="cashback">Cashback</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="no_prize">Better Luck Next Time</option>
                  </select>
                </div>
                <div>
                  <label className="sc-label">Value (₹ or %)</label>
                  <input
                    type="number"
                    value={prizeForm.value}
                    onChange={(e) => setPrizeForm({ ...prizeForm, value: parseFloat(e.target.value) || 0 })}
                    className="sc-input"
                  />
                </div>
              </div>

              <div className="sc-field-row">
                <div>
                  <label className="sc-label">Coupon Code</label>
                  <input
                    type="text"
                    value={prizeForm.coupon_code}
                    onChange={(e) => setPrizeForm({ ...prizeForm, coupon_code: e.target.value.toUpperCase() })}
                    className="sc-input"
                    placeholder="SCRATCH100"
                  />
                </div>
                <div>
                  <label className="sc-label">Win Probability (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={prizeForm.probability}
                    onChange={(e) => setPrizeForm({ ...prizeForm, probability: parseInt(e.target.value, 10) || 10 })}
                    className="sc-input"
                  />
                </div>
              </div>

              <div className="sc-field-row">
                <div>
                  <label className="sc-label">Card Color</label>
                  <input
                    type="color"
                    value={prizeForm.color}
                    onChange={(e) => setPrizeForm({ ...prizeForm, color: e.target.value })}
                    className="sc-input"
                    style={{ height: '44px', padding: '4px' }}
                  />
                </div>
                <div>
                  <label className="sc-label">Text Color</label>
                  <input
                    type="color"
                    value={prizeForm.text_color}
                    onChange={(e) => setPrizeForm({ ...prizeForm, text_color: e.target.value })}
                    className="sc-input"
                    style={{ height: '44px', padding: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setPrizeModalOpen(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button type="submit" className="sc-save-btn">
                  {editingPrize ? 'Update Prize' : 'Create Prize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
