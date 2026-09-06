import React, { useEffect, useState } from 'react';
import { spinWheelApi } from '../../../api';
import NotificationModal from '../../../components/ui/NotificationModal';
import ToastNotification, { useToasts } from '../../../components/ui/ToastNotification';
import './SpinWheelPage.css';

// Vibrant 12-color auto-palette for wheel slices
const SLICE_PALETTE = [
  '#E91E8C', // Vivid Pink
  '#FF6B35', // Orange
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Hot Pink
  '#14B8A6', // Teal
  '#F97316', // Vivid Orange
  '#6366F1', // Indigo
];

const FALLING_ITEMS = ['🎁', '🎉', '✨', '🥳', '⭐', '💎', '👑', '💰', '🎈', '🏆', '🎊', '🌟'];

function LiveWheelPreview({ segments, title, subtitle }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [testWinner, setTestWinner] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const activeSegments = (segments || []).filter((s) => s.is_active);
  const numSlices = activeSegments.length;

  const getSliceColor = (seg, idx) => seg.color || SLICE_PALETTE[idx % SLICE_PALETTE.length];

  const handleTestSpin = () => {
    if (spinning || numSlices === 0) return;
    setSpinning(true);
    setTestWinner(null);
    setShowWinnerModal(false);

    const randomIndex = Math.floor(Math.random() * numSlices);
    const winningSeg = activeSegments[randomIndex];
    const sliceAngle = 360 / numSlices;
    const targetSliceAngle = (numSlices - randomIndex - 0.5) * sliceAngle;
    const newRotation = rotation + 1800 + targetSliceAngle - (rotation % 360);

    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      setTestWinner(winningSeg);
      setShowWinnerModal(true);
    }, 4600);
  };

  const R = 125;
  const CX = 140;
  const CY = 140;
  const sliceAngle = numSlices > 0 ? 360 / numSlices : 360;

  // 20 perimeter bulbs — 3 alternating colors
  const renderBulbPegs = () => {
    const pegs = [];
    const numPegs = 20;
    const pegDist = 133;
    const bulbColors = ['#FFFFFF', '#FFD700', '#FF6B35'];
    for (let i = 0; i < numPegs; i++) {
      const angle = (i * 360) / numPegs - 90;
      const rad = (angle * Math.PI) / 180;
      const px = CX + pegDist * Math.cos(rad);
      const py = CY + pegDist * Math.sin(rad);
      pegs.push(
        <circle
          key={i}
          cx={px}
          cy={py}
          r="5"
          fill={bulbColors[i % 3]}
          stroke="#B8860B"
          strokeWidth="1"
          style={{ filter: `drop-shadow(0 0 4px ${bulbColors[i % 3]})` }}
        />
      );
    }
    return pegs;
  };

  // Gold spoke lines between slices
  const renderSpokes = () => {
    if (numSlices <= 1) return null;
    const spokes = [];
    for (let i = 0; i < numSlices; i++) {
      const angle = (i * sliceAngle - 90) * (Math.PI / 180);
      const x2 = CX + R * Math.cos(angle);
      const y2 = CY + R * Math.sin(angle);
      spokes.push(
        <line
          key={i}
          x1={CX} y1={CY}
          x2={x2} y2={y2}
          stroke="rgba(255,215,0,0.75)"
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 0 2px #FFD700)' }}
        />
      );
    }
    return spokes;
  };

  return (
    <div className="phone-mockup-wrapper">
      <div className="phone-header-bar">
        <div className="phone-camera-notch" />
      </div>

      <div className="phone-screen">

        {/* ── Main Wheel UI ── */}
        <div className="mobile-modal-overlay">
          <div className="mobile-popup-card">
            <span className="live-preview-badge">✨ LIVE 3D SIMULATOR ✨</span>
            <h4 className="mobile-popup-title">{title || 'Spin & Win Real Rewards! 🎉'}</h4>
            <p className="mobile-popup-subtitle">{subtitle || 'Spin the wheel and win exclusive rewards!'}</p>

            <div className="mobile-wheel-stage">
              {/* Pointer */}
              <div className="mobile-wheel-pointer">
                <div className="pointer-shadow-3d" />
                <div className="pointer-arrow-3d" />
                <div className="pointer-gem-3d" />
              </div>

              <svg
                width="280"
                height="280"
                viewBox="0 0 280 280"
                className="mobile-svg-wheel"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
                }}
              >
                <defs>
                  {/* Per-slice radial gradient for 3D depth */}
                  {activeSegments.map((seg, idx) => {
                    const base = getSliceColor(seg, idx);
                    return (
                      <radialGradient key={`rg-${idx}`} id={`sliceGrad-${idx}`} cx="35%" cy="35%" r="70%">
                        <stop offset="0%" stopColor={base} stopOpacity="1" />
                        <stop offset="60%" stopColor={base} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={base} stopOpacity="0.65" />
                      </radialGradient>
                    );
                  })}
                  <radialGradient id="goldRimGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFF176" />
                    <stop offset="55%" stopColor="#FFD700" />
                    <stop offset="85%" stopColor="#FFA000" />
                    <stop offset="100%" stopColor="#7A5200" />
                  </radialGradient>
                  <radialGradient id="hubGrad" cx="40%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#FF6B9D" />
                    <stop offset="50%" stopColor="#E91E8C" />
                    <stop offset="100%" stopColor="#880E4F" />
                  </radialGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="wheelShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000000" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Outer shadow behind wheel */}
                <circle cx={CX} cy={CY} r="140" fill="rgba(0,0,0,0.3)" transform="translate(3,5)" />

                {/* 3D Gold Outer Ring */}
                <circle cx={CX} cy={CY} r="138" fill="url(#goldRimGrad)" stroke="#7A5200" strokeWidth="3" filter="url(#wheelShadow)" />
                {/* Bright inner ring border */}
                <circle cx={CX} cy={CY} r="128" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                {/* Dark inner edge for depth */}
                <circle cx={CX} cy={CY} r="127" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />

                {/* Perimeter Bulbs */}
                {renderBulbPegs()}

                {/* Pie Slices */}
                {numSlices === 0 ? (
                  <text x={CX} y={CY} fill="#64748b" fontSize="12" textAnchor="middle" dominantBaseline="middle">
                    No Active Slices
                  </text>
                ) : (
                  activeSegments.map((seg, idx) => {
                    const startAngle = idx * sliceAngle - 90;
                    const endAngle = (idx + 1) * sliceAngle - 90;
                    const midAngle = (idx + 0.5) * sliceAngle - 90;

                    const rad1 = (startAngle * Math.PI) / 180;
                    const rad2 = (endAngle * Math.PI) / 180;
                    const radMid = (midAngle * Math.PI) / 180;

                    const x1 = CX + R * Math.cos(rad1);
                    const y1 = CY + R * Math.sin(rad1);
                    const x2 = CX + R * Math.cos(rad2);
                    const y2 = CY + R * Math.sin(rad2);

                    const tx = CX + (R * 0.64) * Math.cos(radMid);
                    const ty = CY + (R * 0.64) * Math.sin(radMid);

                    // Highlight arc at top 30% of slice
                    const hR = R * 0.95;
                    const hR2 = R * 0.55;
                    const hx1 = CX + hR2 * Math.cos(rad1);
                    const hy1 = CY + hR2 * Math.sin(rad1);
                    const hx2 = CX + hR * Math.cos(rad1);
                    const hy2 = CY + hR * Math.sin(rad1);
                    const hx3 = CX + hR * Math.cos(rad2);
                    const hy3 = CY + hR * Math.sin(rad2);
                    const hx4 = CX + hR2 * Math.cos(rad2);
                    const hy4 = CY + hR2 * Math.sin(rad2);

                    const largeArc = sliceAngle > 180 ? 1 : 0;
                    const pathData = numSlices === 1
                      ? `M ${CX - R} ${CY} A ${R} ${R} 0 1 0 ${CX + R} ${CY} A ${R} ${R} 0 1 0 ${CX - R} ${CY}`
                      : `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    const highlightPath = numSlices > 1
                      ? `M ${hx1} ${hy1} L ${hx2} ${hy2} A ${hR} ${hR} 0 ${largeArc} 1 ${hx3} ${hy3} L ${hx4} ${hy4} A ${hR2} ${hR2} 0 ${largeArc} 0 ${hx1} ${hy1} Z`
                      : null;

                    return (
                      <g key={seg.id || idx}>
                        {/* Base slice with radial gradient */}
                        <path
                          d={pathData}
                          fill={`url(#sliceGrad-${idx})`}
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth="1.5"
                        />
                        {/* Glossy highlight overlay */}
                        {highlightPath && (
                          <path
                            d={highlightPath}
                            fill="rgba(255,255,255,0.18)"
                            stroke="none"
                          />
                        )}
                        {/* Label */}
                        <text
                          x={tx}
                          y={ty}
                          fill={seg.text_color || '#FFFFFF'}
                          fontSize="10.5"
                          fontWeight="900"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }}
                        >
                          {seg.label}
                        </text>
                      </g>
                    );
                  })
                )}

                {/* Gold spoke dividers */}
                {renderSpokes()}

                {/* 3-layer center hub */}
                <circle cx={CX} cy={CY} r="32" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
                <circle cx={CX} cy={CY} r="28" fill="url(#hubGrad)" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                <text x={CX} y={CY - 4} fill="#FFFFFF" fontSize="9" fontWeight="900" textAnchor="middle" dominantBaseline="middle"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                  SPIN
                </text>
                <text x={CX} y={CY + 6} fill="rgba(255,255,255,0.85)" fontSize="7" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
                  NOW
                </text>
              </svg>
            </div>

            <button
              type="button"
              className="spin-test-btn"
              onClick={handleTestSpin}
              disabled={spinning || numSlices === 0}
            >
              {spinning ? '🌀 Wheel Spinning...' : '🎲 TEST SPIN NOW'}
            </button>
          </div>
        </div>

        {/* ── Winner Overlay (covers full phone screen) ── */}
        {showWinnerModal && testWinner && (
          <div className="winner-phone-overlay">
            {/* Falling gifts ABOVE winner card */}
            <div className="falling-gifts-container">
              {Array.from({ length: 32 }).map((_, idx) => {
                const emoji = FALLING_ITEMS[idx % FALLING_ITEMS.length];
                const left = ((idx * 29 + (idx * 11) % 70) % 90);
                const duration = 5.0 + (idx % 6) * 0.6;
                const delay = (idx * 0.18) % 2.8;
                const size = 18 + (idx % 5) * 5;
                return (
                  <span
                    key={idx}
                    className="falling-gift-particle"
                    style={{
                      left: `${left}%`,
                      fontSize: `${size}px`,
                      animationDuration: `${duration}s`,
                      animationDelay: `${delay}s`,
                    }}
                  >
                    {emoji}
                  </span>
                );
              })}
            </div>

            {/* Winner card */}
            <div className="winner-phone-card">
              <div className="winner-phone-ribbon">
                <span>{testWinner.type === 'no_prize' ? '😅 Better Luck!' : '🎉 YOU WON!'}</span>
              </div>

              <div className="winner-phone-emoji">
                {testWinner.type === 'no_prize' ? '😅' :
                  testWinner.type === 'free_shipping' ? '🚚' : '🎁'}
              </div>

              <p className="winner-phone-title">
                {testWinner.type === 'no_prize' ? 'Try Again Next Time' : 'Congratulations! 🥳'}
              </p>
              <p className="winner-phone-prize">{testWinner.label}</p>

              {testWinner.type === 'free_shipping' && (
                <div className="winner-phone-free">
                  <span>🚚 FREE DELIVERY</span>
                  <small>Applied on your next order!</small>
                </div>
              )}

              {testWinner.coupon_code && testWinner.type !== 'free_shipping' && (
                <div className="winner-phone-coupon">
                  <small>🎫 COUPON CODE</small>
                  <strong>{testWinner.coupon_code}</strong>
                  <small>Auto-applied at checkout 🛍️</small>
                </div>
              )}

              <button
                className="winner-phone-close-btn"
                onClick={() => { setShowWinnerModal(false); setTestWinner(null); }}
              >
                {testWinner.type === 'no_prize' ? 'OK, Got It' : '🛍️ Claim & Shop Now'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SpinWheelPage() {
  const [activeTab, setActiveTab] = useState('segments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    enabled: true,
    cooldown_hours: 24,
    title: 'Spin & Win Real Rewards! 🎉',
    subtitle: 'Spin the wheel today and win exclusive discounts & gift rewards!',
    total_spins: 0,
    segments: [],
    user_targets: [],
    min_orders: 0,
    active_from: '',
    active_until: '',
  });

  // Quick permission rules local edit state (separate from main settings)
  const [rulesForm, setRulesForm] = useState({ min_orders: 0, active_from: '', active_until: '', max_per_day: 1, cooldown_hours: 24 });
  const [rulesSaving, setRulesSaving] = useState(false);

  // Modal Segment State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [formData, setFormData] = useState({
    label: '',
    type: 'coupon',
    value: 10,
    coupon_code: '',
    color: '#E91E8C',
    text_color: '#FFFFFF',
    probability: 15,
    is_active: true,
    sort_order: 1,
    target_user_type: 'all',
  });

  // Modal User Target State
  const [isUserTargetModalOpen, setIsUserTargetModalOpen] = useState(false);
  const [userTargetForm, setUserTargetForm] = useState({
    phone: '',
    segment_id: '',
    custom_prize_label: '',
    custom_prize_type: 'coupon',
    custom_prize_value: 50,
    custom_coupon_code: '',
  });

  // Customer Spin Permissions State
  const [userList, setUserList] = useState([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Logs State
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Settings Snapshot State
  const [initialSettings, setInitialSettings] = useState(null);

  // ── Toast notifications (success / error / warning / info) ──────────────
  const { toasts, addToast, removeToast } = useToasts();

  // ── Confirm modal (blocking dialog for destructive / confirm actions) ───
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'Yes, Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
  });

  /**
   * showConfirm — open the blocking confirm dialog.
   * Only use for destructive / irreversible actions.
   */
  const showConfirm = ({
    type = 'confirm',
    title = '',
    message = '',
    confirmText = 'Yes, Confirm',
    cancelText = 'Cancel',
    onConfirm = null,
  }) => {
    setConfirmModal({ isOpen: true, type, title, message, confirmText, cancelText, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await spinWheelApi.getConfig();
      const resData = res.data || res;
      setData(resData);
      setInitialSettings(JSON.stringify({
        enabled: resData.enabled,
        cooldown_hours: resData.cooldown_hours,
        delay_seconds: resData.delay_seconds,
        max_per_day: resData.max_per_day,
        start_time: resData.start_time,
        end_time: resData.end_time,
        require_login: resData.require_login,
        time_slot_mode: resData.time_slot_mode,
        morning_start: resData.morning_start,
        morning_end: resData.morning_end,
        evening_start: resData.evening_start,
        evening_end: resData.evening_end,
        night_start: resData.night_start,
        night_end: resData.night_end,
        title: resData.title,
        subtitle: resData.subtitle,
      }));
      // Sync quick rules form from fetched config
      setRulesForm({
        min_orders: resData.min_orders ?? 0,
        active_from: resData.active_from || '',
        active_until: resData.active_until || '',
        max_per_day: resData.max_per_day ?? 1,
        cooldown_hours: resData.cooldown_hours ?? 24,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error Loading Settings', message: err.response?.data?.message || 'Failed to load spin wheel settings' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersPermissions = async (p = 1, search = userSearch, silent = false) => {
    try {
      if (!silent) setUserListLoading(true);
      const res = await spinWheelApi.getUsersPermissions({ page: p, limit: 15, search });
      const resData = res.data || res;
      setUserList(resData.users || []);
      setTotalUsers(resData.total || 0);
      setUserPage(p);
    } catch (err) {
      // ignore
    } finally {
      if (!silent) setUserListLoading(false);
    }
  };

  const fetchLogs = async (p = 1, silent = false) => {
    try {
      if (!silent) setLogsLoading(true);
      const res = await spinWheelApi.getLogs({ page: p, limit: 15 });
      const resData = res.data || res;
      setLogs(resData.logs || []);
      setTotalLogs(resData.total || 0);
      setPage(p);
    } catch (err) {
      // ignore log fetch error
    } finally {
      if (!silent) setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    let interval;
    if (activeTab === 'users-permissions') {
      // First load: show spinner
      fetchUsersPermissions(userPage, userSearch, false);
      // Background polls: silent — no spinner, just swap data
      interval = setInterval(() => {
        fetchUsersPermissions(userPage, userSearch, true);
      }, 5000);
    } else if (activeTab === 'logs') {
      fetchLogs(page, false);
      interval = setInterval(() => {
        fetchLogs(page, true);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, userPage, userSearch, page]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await spinWheelApi.updateSettings({
        enabled: data.enabled,
        cooldown_hours: data.cooldown_hours,
        delay_seconds: data.delay_seconds,
        max_per_day: data.max_per_day,
        start_time: data.start_time,
        end_time: data.end_time,
        require_login: data.require_login,
        time_slot_mode: data.time_slot_mode,
        morning_start: data.morning_start,
        morning_end: data.morning_end,
        evening_start: data.evening_start,
        evening_end: data.evening_end,
        night_start: data.night_start,
        night_end: data.night_end,
        title: data.title,
        subtitle: data.subtitle,
      });
      addToast({
        type: 'success',
        title: 'Settings Saved! 💾',
        message: 'Spin wheel timing & login settings saved successfully!',
      });
      fetchConfig();
    } catch (err) {
      addToast({ type: 'error', title: 'Error Saving Settings', message: err.response?.data?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenModal = (segment = null) => {
    if (segment) {
      setEditingSegment(segment);
      setFormData({
        label: segment.label,
        type: segment.type,
        value: segment.value,
        coupon_code: segment.coupon_code || '',
        color: segment.color || '#E91E8C',
        text_color: segment.text_color || '#FFFFFF',
        probability: segment.probability,
        is_active: segment.is_active,
        sort_order: segment.sort_order,
        target_user_type: segment.target_user_type || 'all',
      });
    } else {
      setEditingSegment(null);
      setFormData({
        label: '',
        type: 'coupon',
        value: 10,
        coupon_code: '',
        color: '#E91E8C',
        text_color: '#FFFFFF',
        probability: 15,
        is_active: true,
        sort_order: data.segments.length + 1,
        target_user_type: 'all',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveSegment = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingSegment) {
        await spinWheelApi.updateSegment(editingSegment.id, formData);
        addToast({ type: 'success', title: 'Slice Updated! 🎯', message: 'Wheel slice updated successfully!' });
      } else {
        await spinWheelApi.createSegment(formData);
        addToast({ type: 'success', title: 'Slice Created! 🎯', message: 'New wheel slice created successfully!' });
      }
      setIsModalOpen(false);
      fetchConfig();
    } catch (err) {
      addToast({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Failed to save wheel segment' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSegment = async (id) => {
    showConfirm({
      type: 'confirm',
      title: 'Delete Prize Slice?',
      message: 'Are you sure you want to delete this prize segment from the wheel?',
      confirmText: 'Yes, Delete',
      onConfirm: async () => {
        closeConfirm();
        try {
          await spinWheelApi.deleteSegment(id);
          addToast({ type: 'success', title: 'Slice Deleted ✓', message: 'Prize segment removed successfully.' });
          fetchConfig();
        } catch (err) {
          addToast({ type: 'error', title: 'Delete Failed', message: err.response?.data?.message || 'Failed to delete segment' });
        }
      },
    });
  };

  const handleToggleSegmentActive = async (segment) => {
    try {
      await spinWheelApi.updateSegment(segment.id, {
        ...segment,
        is_active: !segment.is_active,
      });
      fetchConfig();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to toggle segment' });
    }
  };

  const handleSaveUserTarget = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await spinWheelApi.createUserTarget(userTargetForm);
      setIsUserTargetModalOpen(false);
      fetchConfig();
      addToast({
        type: 'success',
        title: 'VIP Target Rule Created! 🎁',
        message: 'Guaranteed reward rule created successfully for target user!',
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Failed to save user target rule' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUserTarget = async (id) => {
    showConfirm({
      type: 'confirm',
      title: 'Remove Target Rule?',
      message: 'Are you sure you want to remove this VIP user target rule?',
      confirmText: 'Yes, Remove',
      onConfirm: async () => {
        closeConfirm();
        try {
          await spinWheelApi.deleteUserTarget(id);
          addToast({ type: 'success', title: 'Rule Removed ✓', message: 'VIP target rule removed successfully.' });
          fetchConfig();
        } catch (err) {
          addToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to delete rule' });
        }
      },
    });
  };

  // ── Quick Eligibility Rules save handler ────────────────────────────────
  const handleSavePermissionRules = async () => {
    try {
      setRulesSaving(true);
      await spinWheelApi.updatePermissionRules({
        min_orders: parseInt(rulesForm.min_orders, 10) || 0,
        active_from: rulesForm.active_from || '',
        active_until: rulesForm.active_until || '',
        max_per_day: parseInt(rulesForm.max_per_day, 10) || 1,
        cooldown_hours: parseFloat(rulesForm.cooldown_hours) || 24,
      });
      // Sync back to data so the live status badge + main data reacts
      setData((prev) => ({
        ...prev,
        min_orders: parseInt(rulesForm.min_orders, 10) || 0,
        active_from: rulesForm.active_from || '',
        active_until: rulesForm.active_until || '',
        max_per_day: parseInt(rulesForm.max_per_day, 10) || 1,
        cooldown_hours: parseFloat(rulesForm.cooldown_hours) || 24,
      }));
      addToast({ type: 'success', title: 'Rules Saved ✓', message: 'Eligibility rules updated successfully!' });
    } catch (err) {
      addToast({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Failed to save eligibility rules' });
    } finally {
      setRulesSaving(false);
    }
  };

  // Toggle user spin popup permission
  const handleToggleUserPermission = async (userObj) => {
    // Optimistic update — feels instant, no blink
    const newStatus = !userObj.spin_wheel_enabled;
    setUserList((prev) => prev.map((u) => (u.id === userObj.id ? { ...u, spin_wheel_enabled: newStatus } : u)));
    try {
      await spinWheelApi.toggleUserSpinPermission(userObj.id, newStatus);
      // Silent refresh to confirm final server state
      fetchUsersPermissions(userPage, userSearch, true);
    } catch (err) {
      // Revert optimistic update on failure
      setUserList((prev) => prev.map((u) => (u.id === userObj.id ? { ...u, spin_wheel_enabled: !newStatus } : u)));
      addToast({ type: 'error', title: 'Error', message: 'Failed to toggle user spin permission' });
    }
  };

  const handleBulkToggleUserPermissions = async (enabledStatus) => {
    try {
      setSaving(true);
      await spinWheelApi.bulkToggleUserSpinPermission(
        selectedUserIds.length > 0 ? selectedUserIds : null,
        enabledStatus
      );
      addToast({
        type: 'success',
        title: 'Permissions Updated ✓',
        message: `Spin popup ${enabledStatus ? 'enabled' : 'disabled'} successfully!`,
      });
      setSelectedUserIds([]);
      fetchUsersPermissions(userPage, userSearch, true);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update user permissions' });
    } finally {
      setSaving(false);
    }
  };

  const handleForceUserPopup = async (userId = null) => {
    // Early validation BEFORE setting saving=true, to avoid getting stuck
    const ids = userId ? [userId] : (selectedUserIds.length > 0 ? selectedUserIds : null);
    if (!ids) {
      addToast({ type: 'warning', title: 'No User Selected', message: 'Please select at least one user to force the popup!' });
      return;
    }
    // Optimistic update — instantly flip button to ⋯ Pending Spin...
    setUserList((prev) =>
      prev.map((u) => ids.includes(u.id) ? { ...u, force_spin_popup: true, spin_wheel_enabled: true } : u)
    );
    try {
      setSaving(true);
      await spinWheelApi.forceUserSpinPopup(userId || null, ids);
      addToast({
        type: 'success',
        title: '⚡ Spin Popup Forced!',
        message: `Spin popup forced for ${ids.length} user(s). They’ll see it on next app open.`,
      });
      // Silent refresh to confirm server state
      fetchUsersPermissions(userPage, userSearch, true);
    } catch (err) {
      // Revert optimistic update on failure
      setUserList((prev) =>
        prev.map((u) => ids.includes(u.id) ? { ...u, force_spin_popup: false } : u)
      );
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to force user spin popup' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Cancel / un-force a pending forced spin popup for a specific user.
   * Only visible when force_spin_popup === true (user hasn’t spun yet).
   * Once the user spins, the backend resets force_spin_popup = false automatically,
   * and the 5s silent poll picks up the change, switching the button back.
   */
  const handleCancelForcePopup = async (userId) => {
    // Optimistic update — instantly revert button to ⋯ Force Popup
    setUserList((prev) =>
      prev.map((u) => u.id === userId ? { ...u, force_spin_popup: false } : u)
    );
    try {
      setSaving(true);
      await spinWheelApi.cancelForceUserSpinPopup([userId]);
      addToast({
        type: 'info',
        title: 'Force Cancelled',
        message: 'Pending forced popup has been cancelled for this user.',
      });
      fetchUsersPermissions(userPage, userSearch, true);
    } catch (err) {
      // Revert optimistic update on failure
      setUserList((prev) =>
        prev.map((u) => u.id === userId ? { ...u, force_spin_popup: true } : u)
      );
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to cancel forced popup' });
    } finally {
      setSaving(false);
    }
  };

  const handleForceAllUsersPopup = async () => {
    showConfirm({
      type: 'warning',
      title: '⚡ Force Popup to ALL Users?',
      message: 'Are you sure you want to FORCE the Spin Wheel Popup to ALL registered users globally right now?',
      confirmText: 'Yes, Force All Now',
      onConfirm: async () => {
        closeConfirm();
        try {
          setSaving(true);
          await spinWheelApi.forceAllUsersSpinPopup();
          addToast({
            type: 'success',
            title: '⚡ Global Force Activated!',
            message: 'Spin Wheel popup successfully forced for ALL users globally!',
          });
          fetchConfig();
          fetchUsersPermissions(userPage, userSearch, true);
        } catch (err) {
          addToast({ type: 'error', title: 'Error', message: 'Failed to force spin popup globally' });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleSelectAllUsers = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(userList.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleUserCheckbox = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const totalWeight = data.segments
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (parseInt(s.probability, 10) || 0), 0);

  const activeSlicesCount = data.segments.filter((s) => s.is_active).length;
  const userTargetsCount = (data.user_targets || []).filter((t) => !t.is_claimed).length;

  const previewSegments = isModalOpen
    ? (editingSegment
        ? data.segments.map((s) => (s.id === editingSegment.id ? { ...s, ...formData } : s))
        : [...data.segments, { ...formData, id: 'temp-preview' }])
    : data.segments;

  const currentSettingsSnapshot = JSON.stringify({
    enabled: data.enabled,
    cooldown_hours: data.cooldown_hours,
    delay_seconds: data.delay_seconds,
    max_per_day: data.max_per_day,
    start_time: data.start_time,
    end_time: data.end_time,
    require_login: data.require_login,
    time_slot_mode: data.time_slot_mode,
    morning_start: data.morning_start,
    morning_end: data.morning_end,
    evening_start: data.evening_start,
    evening_end: data.evening_end,
    night_start: data.night_start,
    night_end: data.night_end,
    title: data.title,
    subtitle: data.subtitle,
  });

  const isSettingsChanged = initialSettings !== null && currentSettingsSnapshot !== initialSettings;

  return (
    <div className="spin-page-container">
      {/* Top Banner Header */}
      <div className="spin-page-header">
        <div>
          <h1 className="header-title">Spin & Win Lucky Wheel</h1>
          <p className="header-subtitle">
            Configure gift slices, probability odds, user permissions, target specific users, and manage mobile popup timing.
          </p>
        </div>

        <div className="header-actions-group">
          <button className="secondary-btn" onClick={() => setIsUserTargetModalOpen(true)}>
            🎯 Target Specific User
          </button>
          <button className="primary-action-btn" onClick={() => handleOpenModal()}>
            <span>+ Add Wheel Slice</span>
          </button>
        </div>
      </div>

      {/* Top Summary Stat Cards */}
      <div className="stats-summary-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper active-bg">🟢</div>
          <div>
            <div className="stat-label">POPUP STATUS</div>
            <div className="stat-value">{data.enabled ? 'Active in App' : 'Disabled'}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper total-spins-bg">🎰</div>
          <div>
            <div className="stat-label">TOTAL SPINS</div>
            <div className="stat-value">{data.total_spins}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper slices-bg">🎯</div>
          <div>
            <div className="stat-label">ACTIVE SLICES & VIP RULES</div>
            <div className="stat-value">{activeSlicesCount} Slices · {userTargetsCount} VIP Rules</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper frequency-bg">⏳</div>
          <div>
            <div className="stat-label">SPIN FREQUENCY</div>
            <div className="stat-value">
              {data.cooldown_hours === 0 ? 'Unlimited' : `Every ${data.cooldown_hours} Hours`}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-link ${activeTab === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveTab('segments')}
        >
          🎯 Wheel Slices ({data.segments.length})
        </button>
        <button
          className={`tab-link ${activeTab === 'users-permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('users-permissions')}
        >
          👥 Customer Spin Permissions
        </button>
        <button
          className={`tab-link ${activeTab === 'user-targets' ? 'active' : ''}`}
          onClick={() => setActiveTab('user-targets')}
        >
          🎁 User Target Rewards ({data.user_targets?.length || 0})
        </button>
        <button
          className={`tab-link ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Wheel & Popup Settings
        </button>
        <button
          className={`tab-link ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📜 Spin Audit Logs
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading Spin & Win settings...</span>
        </div>
      ) : activeTab === 'segments' ? (
        /* WHEEL SLICES TAB: 2-COLUMN LAYOUT WITH PHONE PREVIEW */
        <div className="content-grid-layout">
          {/* LEFT PANEL */}
          <div className="left-content-panel">
            <div className="panel-card">
              <div className="section-toolbar">
                <div>
                  <h3 className="panel-title">Configured Wheel Segments</h3>
                  <p className="panel-sub">
                    Total probability weight: <strong>{totalWeight}</strong> points. Slices with higher weight win more frequently.
                  </p>
                </div>
                <button className="primary-action-btn" onClick={() => handleOpenModal()}>
                  + Add Slice
                </button>
              </div>

              <div className="table-wrapper">
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Color</th>
                      <th>Prize Label</th>
                      <th>Target Audience</th>
                      <th>Reward Type</th>
                      <th>Value</th>
                      <th>Coupon Code</th>
                      <th>Weight</th>
                      <th>Win Rate</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.segments.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="empty-table">
                          No prize slices configured. Click "+ Add Wheel Slice" to build your wheel!
                        </td>
                      </tr>
                    ) : (
                      data.segments.map((seg) => {
                        const chance = totalWeight > 0 && seg.is_active
                          ? ((parseInt(seg.probability, 10) / totalWeight) * 100).toFixed(1) + '%'
                          : '0%';

                        return (
                          <tr key={seg.id} className={!seg.is_active ? 'row-inactive' : ''}>
                            <td>
                              <div
                                className="slice-color-dot"
                                style={{ backgroundColor: seg.color, color: seg.text_color }}
                              >
                                {seg.sort_order || seg.id}
                              </div>
                            </td>
                            <td>
                              <strong className="prize-name">{seg.label}</strong>
                            </td>
                            <td>
                              <span className="audience-pill">
                                {seg.target_user_type === 'new_users' && '🆕 New Users'}
                                {seg.target_user_type === 'existing_users' && '🛍️ Existing Users'}
                                {seg.target_user_type === 'vip_users' && '👑 VIP Customers'}
                                {(!seg.target_user_type || seg.target_user_type === 'all') && '🌍 All Users'}
                              </span>
                            </td>
                            <td>
                              <span className={`reward-badge ${seg.type}`}>
                                {seg.type === 'coupon' && '🏷️ Coupon'}
                                {seg.type === 'loyalty_points' && '⭐ Points'}
                                {seg.type === 'free_shipping' && '🚚 Free Shipping'}
                                {seg.type === 'no_prize' && '❌ No Prize'}
                              </span>
                            </td>
                            <td>{seg.value ? `₹${seg.value}` : '-'}</td>
                            <td>
                              {seg.coupon_code ? (
                                <code className="code-pill">{seg.coupon_code}</code>
                              ) : (
                                <span className="muted-text">-</span>
                              )}
                            </td>
                            <td><strong>{seg.probability}</strong></td>
                            <td>
                              <span className="chance-pill">{chance}</span>
                            </td>
                            <td>
                              <button
                                className={`switch-badge ${seg.is_active ? 'active' : 'disabled'}`}
                                onClick={() => handleToggleSegmentActive(seg)}
                              >
                                {seg.is_active ? 'Active' : 'Disabled'}
                              </button>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="btn-group-end">
                                <button className="icon-btn edit-btn" onClick={() => handleOpenModal(seg)} title="Edit Slice">
                                  ✏️
                                </button>
                                <button className="icon-btn delete-btn" onClick={() => handleDeleteSegment(seg.id)} title="Delete Slice">
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: PHONE PREVIEW SIMULATOR */}
          <div className="right-content-panel">
            <LiveWheelPreview
              segments={previewSegments}
              title={data.title}
              subtitle={data.subtitle}
            />
          </div>
        </div>
      ) : (
        /* OTHER TABS: FULL WIDTH CLEAN PANELS */
        <div className="full-width-panel">
          {/* TAB: CUSTOMER SPIN PERMISSIONS (CHECKBOX USER LIST) */}
          {activeTab === 'users-permissions' && (
            <div className="panel-card">
              {/* ── QUICK ELIGIBILITY RULES PANEL ── */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const from = data.active_from || '';
                const until = data.active_until || '';
                let statusLabel = '🟢 Always Active';
                let statusColor = '#15803d';
                let statusBg = '#f0fdf4';
                if (from && today < from) {
                  statusLabel = `⏰ Scheduled — starts ${from}`;
                  statusColor = '#b45309';
                  statusBg = '#fefce8';
                } else if (until && today > until) {
                  statusLabel = '🔴 Expired — event ended';
                  statusColor = '#b91c1c';
                  statusBg = '#fff5f5';
                } else if (from || until) {
                  statusLabel = `🟢 Active Now${until ? ` — ends ${until}` : ''}`;
                  statusColor = '#15803d';
                  statusBg = '#f0fdf4';
                }
                return (
                  <div style={{
                    margin: '0 0 22px 0',
                    borderRadius: '14px',
                    border: '1.5px solid #e0e7ff',
                    background: 'linear-gradient(135deg, #f8f9ff 0%, #eef2ff 100%)',
                    padding: '20px 24px',
                    boxShadow: '0 2px 12px rgba(99,102,241,0.07)',
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🛡️</span>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e1b4b' }}>Quick Eligibility Rules</div>
                          <div style={{ fontSize: '11.5px', color: '#6366f1', fontWeight: '600' }}>Control who can see & spin the wheel</div>
                        </div>
                      </div>
                      <span style={{
                        padding: '5px 14px',
                        borderRadius: '20px',
                        background: statusBg,
                        color: statusColor,
                        fontSize: '11.5px',
                        fontWeight: '800',
                        border: `1px solid ${statusColor}33`,
                        letterSpacing: '0.2px',
                      }}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Rule inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>

                      {/* Min Orders */}
                      <div>
                        <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', color: '#4338ca', marginBottom: '6px' }}>
                          🛎️ Min. Completed Orders
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rulesForm.min_orders}
                            onChange={(e) => setRulesForm((f) => ({ ...f, min_orders: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: '10px',
                              border: '1.5px solid #c7d2fe',
                              background: '#fff',
                              fontSize: '14px',
                              fontWeight: '700',
                              color: '#1e1b4b',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <p style={{ fontSize: '10.5px', color: '#6b7280', margin: '4px 0 0 2px' }}>
                          {rulesForm.min_orders == 0 ? 'All users (no minimum)' : `User must have ≥${rulesForm.min_orders} order(s)`}
                        </p>
                      </div>

                      {/* Active From */}
                      <div>
                        <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', color: '#4338ca', marginBottom: '6px' }}>
                          📅 Active From Date
                        </label>
                        <input
                          type="date"
                          value={rulesForm.active_from}
                          onChange={(e) => setRulesForm((f) => ({ ...f, active_from: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #c7d2fe',
                            background: '#fff',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#1e1b4b',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <p style={{ fontSize: '10.5px', color: '#6b7280', margin: '4px 0 0 2px' }}>
                          {rulesForm.active_from ? `Wheel visible from ${rulesForm.active_from}` : 'No start limit'}
                        </p>
                      </div>

                      {/* Active Until */}
                      <div>
                        <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', color: '#4338ca', marginBottom: '6px' }}>
                          📅 Active Until Date
                        </label>
                        <input
                          type="date"
                          value={rulesForm.active_until}
                          onChange={(e) => setRulesForm((f) => ({ ...f, active_until: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #c7d2fe',
                            background: '#fff',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#1e1b4b',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <p style={{ fontSize: '10.5px', color: '#6b7280', margin: '4px 0 0 2px' }}>
                          {rulesForm.active_until ? `Wheel stops after ${rulesForm.active_until}` : 'No end limit'}
                        </p>
                      </div>

                      {/* Spins Per Day */}
                      <div>
                        <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', color: '#4338ca', marginBottom: '6px' }}>
                          🎰 Max Spins Per Day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={rulesForm.max_per_day}
                          onChange={(e) => setRulesForm((f) => ({ ...f, max_per_day: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #c7d2fe',
                            background: '#fff',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#1e1b4b',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <p style={{ fontSize: '10.5px', color: '#6b7280', margin: '4px 0 0 2px' }}>
                          {rulesForm.max_per_day == 1 ? '1 spin per day per user' : `Up to ${rulesForm.max_per_day} spins per day`}
                        </p>
                      </div>

                      {/* Cooldown Hours */}
                      <div>
                        <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', color: '#4338ca', marginBottom: '6px' }}>
                          ⏳ Cooldown Between Spins
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="168"
                            step="0.5"
                            value={rulesForm.cooldown_hours}
                            onChange={(e) => setRulesForm((f) => ({ ...f, cooldown_hours: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: '9px 12px',
                              borderRadius: '10px',
                              border: '1.5px solid #c7d2fe',
                              background: '#fff',
                              fontSize: '14px',
                              fontWeight: '700',
                              color: '#1e1b4b',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: '700', whiteSpace: 'nowrap' }}>hrs</span>
                        </div>
                        <p style={{ fontSize: '10.5px', color: '#6b7280', margin: '4px 0 0 2px' }}>
                          {rulesForm.cooldown_hours == 0 ? 'No cooldown' : rulesForm.cooldown_hours < 1 ? `${rulesForm.cooldown_hours * 60} min between spins` : rulesForm.cooldown_hours == 24 ? '1 spin per day' : `${rulesForm.cooldown_hours}h wait between spins`}
                        </p>
                      </div>

                      {/* Save button */}
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                          onClick={handleSavePermissionRules}
                          disabled={rulesSaving}
                          style={{
                            width: '100%',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            background: rulesSaving ? '#a5b4fc' : 'linear-gradient(135deg, #4338ca, #6366f1)',
                            color: '#fff',
                            fontWeight: '800',
                            fontSize: '13px',
                            border: 'none',
                            cursor: rulesSaving ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '7px',
                          }}
                        >
                          {rulesSaving ? '⏳ Saving...' : '💾 Save Rules'}
                        </button>
                      </div>
                    </div>

                    {/* Quick reference pills */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e0e7ff' }}>
                      <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600' }}>Min Orders:</span>
                      {[
                        { label: 'Anyone', val: 0 },
                        { label: '1+', val: 1 },
                        { label: '2+', val: 2 },
                        { label: '3+ (VIP)', val: 3 },
                        { label: '5+', val: 5 },
                      ].map(({ label, val }) => (
                        <button
                          key={val}
                          onClick={() => setRulesForm((f) => ({ ...f, min_orders: val }))}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            border: `1.5px solid ${rulesForm.min_orders == val ? '#4338ca' : '#c7d2fe'}`,
                            background: rulesForm.min_orders == val ? '#4338ca' : '#fff',
                            color: rulesForm.min_orders == val ? '#fff' : '#4338ca',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                      <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', marginLeft: '8px' }}>Cooldown:</span>
                      {[
                        { label: 'None', val: 0 },
                        { label: '1h', val: 1 },
                        { label: '6h', val: 6 },
                        { label: '12h', val: 12 },
                        { label: '24h', val: 24 },
                        { label: '48h', val: 48 },
                      ].map(({ label, val }) => (
                        <button
                          key={val}
                          onClick={() => setRulesForm((f) => ({ ...f, cooldown_hours: val }))}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            border: `1.5px solid ${rulesForm.cooldown_hours == val ? '#7c3aed' : '#c7d2fe'}`,
                            background: rulesForm.cooldown_hours == val ? '#7c3aed' : '#fff',
                            color: rulesForm.cooldown_hours == val ? '#fff' : '#7c3aed',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                      {(rulesForm.active_from || rulesForm.active_until) && (
                        <button
                          onClick={() => setRulesForm((f) => ({ ...f, active_from: '', active_until: '' }))}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            border: '1.5px solid #fca5a5',
                            background: '#fff5f5',
                            color: '#b91c1c',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Clear Dates
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="section-toolbar">
                <div>
                  <h3 className="panel-title">👥 Customer Spin Popup Permissions</h3>
                  <p className="panel-sub">
                    Control which registered customers can see and spin the wheel popup. Uncheck the checkbox to disable the spin popup for a user.
                  </p>
                </div>

                <div className="bulk-actions-group" style={{ flexWrap: 'wrap' }}>
                  <button
                    className="primary-action-btn"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
                    onClick={handleForceAllUsersPopup}
                    disabled={saving}
                  >
                    ⚡ FORCE POPUP TO ALL USERS NOW
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button
                      className="secondary-btn"
                      style={{ color: '#7c3aed', borderColor: '#c4b5fd' }}
                      onClick={() => handleForceUserPopup(null)}
                      disabled={saving}
                    >
                      ⚡ Force Popup for {selectedUserIds.length} Selected
                    </button>
                  )}
                  <button
                    className="secondary-btn"
                    onClick={() => handleBulkToggleUserPermissions(true)}
                    disabled={saving}
                  >
                    🟢 Enable Spin
                  </button>
                  <button
                    className="secondary-btn"
                    style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                    onClick={() => handleBulkToggleUserPermissions(false)}
                    disabled={saving}
                  >
                    🔴 Disable Spin
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search customer by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    fetchUsersPermissions(1, e.target.value);
                  }}
                  className="field-input"
                />
              </div>

              {userListLoading ? (
                <div className="loading-container">
                  <div className="spinner" />
                  <span>Loading customer permissions list...</span>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="styled-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={userList.length > 0 && selectedUserIds.length === userList.length}
                            onChange={handleSelectAllUsers}
                          />
                        </th>
                        <th>Customer Name & Email</th>
                        <th>Phone Number</th>
                        <th>Total Spins</th>
                        <th>Registered Date</th>
                        <th style={{ textAlign: 'right' }}>Spin Popup Permission & Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-table">
                            No customers found.
                          </td>
                        </tr>
                      ) : (
                        userList.map((userObj) => {
                          const isSelected = selectedUserIds.includes(userObj.id);
                          const isEnabled = userObj.spin_wheel_enabled !== false;
                          const isUserForced = userObj.force_spin_popup === true;

                          return (
                            <tr key={userObj.id} className={!isEnabled ? 'row-inactive' : ''}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleUserCheckbox(userObj.id)}
                                />
                              </td>
                              <td>
                                <strong>{userObj.name || 'Customer'}</strong>
                                <br />
                                <span className="muted-text">{userObj.email || '-'}</span>
                              </td>
                              <td>
                                <code className="code-pill">{userObj.phone || '-'}</code>
                              </td>
                              <td><strong>{userObj.total_spins || 0} Spins</strong></td>
                              <td>{new Date(userObj.created_at).toLocaleDateString()}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>

                                  {isUserForced ? (
                                    /* ── Already forced — show status pill + cancel button ── */
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '4px 10px',
                                        borderRadius: '16px',
                                        background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        letterSpacing: '0.2px',
                                      }}>
                                        ⚡ Pending Spin...
                                      </span>
                                      <button
                                        className="secondary-btn"
                                        style={{
                                          padding: '4px 10px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          borderRadius: '16px',
                                          color: '#b91c1c',
                                          borderColor: '#fca5a5',
                                          background: '#fff5f5',
                                          cursor: 'pointer',
                                        }}
                                        onClick={() => handleCancelForcePopup(userObj.id)}
                                        disabled={saving}
                                        title="Cancel this pending forced popup"
                                      >
                                        ✕ Cancel Force
                                      </button>
                                    </div>
                                  ) : (
                                    /* ── Not forced — show Force Popup button ── */
                                    <button
                                      className="secondary-btn"
                                      style={{
                                        padding: '5px 12px',
                                        fontSize: '11.5px',
                                        fontWeight: '800',
                                        borderRadius: '16px',
                                        color: '#7c3aed',
                                        borderColor: '#c4b5fd',
                                        background: '#faf5ff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onClick={() => handleForceUserPopup(userObj.id)}
                                      disabled={saving}
                                      title="Force Wheel Popup to show immediately on user next app open"
                                    >
                                      ⚡ Force Popup
                                    </button>
                                  )}

                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={() => handleToggleUserPermission(userObj)}
                                      style={{ width: '18px', height: '18px', accentColor: '#db2777' }}
                                    />
                                    <span className={`switch-badge ${isEnabled ? 'active' : 'disabled'}`}>
                                      {isEnabled ? 'Spin Allowed' : 'Spin Blocked'}
                                    </span>
                                  </label>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="pagination-bar">
                    <button
                      disabled={userPage <= 1}
                      onClick={() => fetchUsersPermissions(userPage - 1, userSearch)}
                      className="secondary-btn"
                    >
                      Previous
                    </button>
                    <span className="page-indicator">Page {userPage} of {Math.ceil(totalUsers / 15) || 1}</span>
                    <button
                      disabled={userPage * 15 >= totalUsers}
                      onClick={() => fetchUsersPermissions(userPage + 1, userSearch)}
                      className="secondary-btn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: USER TARGET SPECIFIC REWARDS */}
          {activeTab === 'user-targets' && (
            <div className="panel-card">
              <div className="section-toolbar">
                <div>
                  <h3 className="panel-title">🎯 User-Specific Guaranteed Rewards ("VIP Gifts")</h3>
                  <p className="panel-sub">
                    Assign a specific gift or prize slice to a customer's phone number or user ID. When this specific customer spins the wheel next, they are 100% guaranteed to land on and win this assigned prize!
                  </p>
                </div>
                <button className="primary-action-btn" onClick={() => setIsUserTargetModalOpen(true)}>
                  + Target Specific Phone / User
                </button>
              </div>

              <div className="table-wrapper">
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Rule ID</th>
                      <th>Target Phone / User</th>
                      <th>Guaranteed Gift Slice / Custom Prize</th>
                      <th>Reward Type</th>
                      <th>Value</th>
                      <th>Coupon Code</th>
                      <th>Status</th>
                      <th>Date Assigned</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.user_targets || data.user_targets.length === 0) ? (
                      <tr>
                        <td colSpan="9" className="empty-table">
                          No user target rules created yet. Click "+ Target Specific Phone / User" to assign a guaranteed gift to a specific customer!
                        </td>
                      </tr>
                    ) : (
                      data.user_targets.map((target) => (
                        <tr key={target.id} className={target.is_claimed ? 'row-inactive' : ''}>
                          <td>#{target.id}</td>
                          <td>
                            <strong>{target.user_name || 'Target Phone'}</strong>
                            <br />
                            <span className="code-pill">{target.phone || target.user_id}</span>
                          </td>
                          <td>
                            <strong style={{ color: '#E91E8C' }}>
                              {target.segment_label || target.custom_prize_label || 'Assigned Gift'}
                            </strong>
                          </td>
                          <td>
                            <span className={`reward-badge ${target.custom_prize_type || 'coupon'}`}>
                              {target.custom_prize_type || 'coupon'}
                            </span>
                          </td>
                          <td>{target.custom_prize_value ? `₹${target.custom_prize_value}` : '-'}</td>
                          <td>
                            {target.custom_coupon_code ? <code>{target.custom_coupon_code}</code> : <span className="muted-text">-</span>}
                          </td>
                          <td>
                            <span className={`switch-badge ${target.is_claimed ? 'disabled' : 'active'}`}>
                              {target.is_claimed ? '✅ Claimed (Spun)' : '⏳ Pending Next Spin'}
                            </span>
                          </td>
                          <td>{new Date(target.created_at).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="icon-btn delete-btn"
                              onClick={() => handleDeleteUserTarget(target.id)}
                              title="Remove Target Rule"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="panel-card">
              <form onSubmit={handleSaveSettings}>
                <h3 className="panel-title">Wheel Popup, User Login & Timing Settings</h3>
                <p className="panel-sub">Manage global wheel behavior, login enforcement, morning/evening/night time slots, and text content.</p>

                <div className="form-row-2col" style={{ marginBottom: '22px' }}>
                  <div className="setting-box" style={{ margin: 0 }}>
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={data.enabled}
                        onChange={(e) => setData({ ...data, enabled: e.target.checked })}
                      />
                      <div className="switch-slider" />
                      <span className="switch-title">Enable Spin & Win Wheel in Mobile App</span>
                    </label>
                    <p className="form-help">Turn this toggle ON to show the lucky gift wheel popup in the mobile app.</p>
                  </div>

                  <div className="setting-box" style={{ margin: 0 }}>
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={data.require_login !== false}
                        onChange={(e) => setData({ ...data, require_login: e.target.checked })}
                      />
                      <div className="switch-slider" />
                      <span className="switch-title">Require User Login to Spin</span>
                    </label>
                    <p className="form-help">Only logged-in registered customers will see the spin wheel popup.</p>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-field-group">
                    <label className="field-label">Spin Cooldown Frequency</label>
                    <select
                      value={data.cooldown_hours}
                      onChange={(e) => setData({ ...data, cooldown_hours: parseFloat(e.target.value) })}
                      className="field-input"
                    >
                      <option value={24}>Every 24 Hours (Once per day - Recommended)</option>
                      <option value={12}>Every 12 Hours</option>
                      <option value={6}>Every 6 Hours</option>
                      <option value={1}>Every 1 Hour</option>
                      <option value={0}>Unlimited (No Cooldown)</option>
                    </select>
                    <p className="form-help">Once a user spins and receives a prize result, popup is hidden until cooldown expires!</p>
                  </div>

                  <div className="form-field-group">
                    <label className="field-label">Daily Time Slot Triggering</label>
                    <select
                      value={data.time_slot_mode || 'anytime'}
                      onChange={(e) => setData({ ...data, time_slot_mode: e.target.value })}
                      className="field-input"
                    >
                      <option value="anytime">☀️ Anytime / All Day (24 Hours)</option>
                      <option value="morning">🌅 Morning Slot Only</option>
                      <option value="evening">🌆 Evening Slot Only</option>
                      <option value="night">🌙 Night Slot Only</option>
                      <option value="morning_evening_night">🌅🌆🌙 Morning, Evening & Night Slots</option>
                    </select>
                    <p className="form-help">Controls during which time period of the day the popup will appear.</p>
                  </div>
                </div>

                {/* TIME SLOTS CONFIGURATION */}
                {data.time_slot_mode === 'morning_evening_night' ? (
                  <div className="setting-box">
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>🌅 Morning, 🌆 Evening & 🌙 Night Time Windows</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="field-label">🌅 Morning Slot</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="time"
                            value={data.morning_start || '06:00'}
                            onChange={(e) => setData({ ...data, morning_start: e.target.value })}
                            className="field-input"
                          />
                          <span style={{ alignSelf: 'center' }}>-</span>
                          <input
                            type="time"
                            value={data.morning_end || '12:00'}
                            onChange={(e) => setData({ ...data, morning_end: e.target.value })}
                            className="field-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="field-label">🌆 Evening Slot</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="time"
                            value={data.evening_start || '16:00'}
                            onChange={(e) => setData({ ...data, evening_start: e.target.value })}
                            className="field-input"
                          />
                          <span style={{ alignSelf: 'center' }}>-</span>
                          <input
                            type="time"
                            value={data.evening_end || '20:00'}
                            onChange={(e) => setData({ ...data, evening_end: e.target.value })}
                            className="field-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="field-label">🌙 Night Slot</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="time"
                            value={data.night_start || '20:00'}
                            onChange={(e) => setData({ ...data, night_start: e.target.value })}
                            className="field-input"
                          />
                          <span style={{ alignSelf: 'center' }}>-</span>
                          <input
                            type="time"
                            value={data.night_end || '23:59'}
                            onChange={(e) => setData({ ...data, night_end: e.target.value })}
                            className="field-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="form-row-2col">
                    <div className="form-field-group">
                      <label className="field-label">Popup Show Delay (Seconds)</label>
                      <select
                        value={data.delay_seconds || 3}
                        onChange={(e) => setData({ ...data, delay_seconds: parseInt(e.target.value, 10) })}
                        className="field-input"
                      >
                        <option value={0}>0 Seconds (Immediately on App Open)</option>
                        <option value={1}>1 Second</option>
                        <option value={3}>3 Seconds (Recommended)</option>
                        <option value={5}>5 Seconds</option>
                        <option value={10}>10 Seconds</option>
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Max Popup Displays Per Day</label>
                      <select
                        value={data.max_per_day || 1}
                        onChange={(e) => setData({ ...data, max_per_day: parseInt(e.target.value, 10) })}
                        className="field-input"
                      >
                        <option value={1}>1 Time Per Day (Recommended)</option>
                        <option value={2}>2 Times Per Day</option>
                        <option value={3}>3 Times Per Day</option>
                        <option value={0}>Unlimited (Every Session)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-field-group">
                  <label className="field-label">Popup Header Title</label>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData({ ...data, title: e.target.value })}
                    className="field-input"
                    placeholder="Spin & Win Real Rewards! 🎉"
                  />
                </div>

                <div className="form-field-group">
                  <label className="field-label">Popup Description Subtitle</label>
                  <textarea
                    rows={3}
                    value={data.subtitle}
                    onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                    className="field-input"
                    placeholder="Spin the wheel today and win exclusive discounts & gift rewards!"
                  />
                </div>

                {isSettingsChanged && (
                  <div className="form-actions-bar">
                    <button type="submit" className="primary-action-btn" disabled={saving}>
                      {saving ? 'Saving...' : '💾 Save Settings'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 4: LOGS */}
          {activeTab === 'logs' && (
            <div className="panel-card">
              <h3 className="panel-title">Customer Spin Audit Logs</h3>
              <p className="panel-sub">Complete history of customer spins and claimed coupons.</p>

              {logsLoading ? (
                <div className="loading-container">
                  <div className="spinner" />
                  <span>Loading spin logs...</span>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="styled-table">
                    <thead>
                      <tr>
                        <th>Log ID</th>
                        <th>Customer</th>
                        <th>Prize Won</th>
                        <th>Reward Type</th>
                        <th>Value</th>
                        <th>Coupon Code</th>
                        <th>Spin Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-table">
                            No spin history recorded yet.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id}>
                            <td>#{log.id}</td>
                            <td>
                              <strong>{log.user_name || 'Guest User'}</strong>
                              <br />
                              <span className="muted-text">{log.phone || '-'}</span>
                            </td>
                            <td><strong style={{ color: '#E91E8C' }}>{log.prize_label}</strong></td>
                            <td>
                              <span className={`reward-badge ${log.prize_type}`}>
                                {log.prize_type}
                              </span>
                            </td>
                            <td>{log.prize_value ? `₹${log.prize_value}` : '-'}</td>
                            <td>
                              {log.coupon_code ? <code>{log.coupon_code}</code> : <span className="muted-text">-</span>}
                            </td>
                            <td>{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <div className="pagination-bar">
                    <button
                      disabled={page <= 1}
                      onClick={() => fetchLogs(page - 1)}
                      className="secondary-btn"
                    >
                      Previous
                    </button>
                    <span className="page-indicator">Page {page} of {Math.ceil(totalLogs / 15) || 1}</span>
                    <button
                      disabled={page * 15 >= totalLogs}
                      onClick={() => fetchLogs(page + 1)}
                      className="secondary-btn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT SLICE MODAL */}
      {isModalOpen && (
        <div className="dialog-overlay">
          <div className="dialog-card">
            <div className="dialog-header">
              <h3>{editingSegment ? 'Edit Wheel Slice' : 'Add New Wheel Slice'}</h3>
              <button className="dialog-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveSegment}>
              <div className="dialog-body">
                <div className="form-field-group">
                  <label className="field-label">Slice Label (Text on Wheel)</label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="field-input"
                    placeholder="e.g. 10% OFF, ₹100 Off, Better Luck!"
                  />
                </div>

                <div className="form-field-group">
                  <label className="field-label">Target Audience Tier</label>
                  <select
                    value={formData.target_user_type}
                    onChange={(e) => setFormData({ ...formData, target_user_type: e.target.value })}
                    className="field-input"
                  >
                    <option value="all">🌍 All Customers</option>
                    <option value="new_users">🆕 New Customers Only (0 orders)</option>
                    <option value="existing_users">🛍️ Existing Customers (1+ orders)</option>
                    <option value="vip_users">👑 VIP High Spenders (3+ orders)</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="field-label">Reward Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="field-input"
                  >
                    <option value="coupon">Discount Coupon</option>
                    <option value="loyalty_points">Loyalty Points</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="no_prize">No Prize (Better Luck Next Time)</option>
                  </select>
                </div>

                {formData.type !== 'no_prize' && (
                  <div className="form-field-group">
                    <label className="field-label">
                      Reward Value ({formData.type === 'loyalty_points' ? 'Points' : 'Amount / Discount %'})
                    </label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      className="field-input"
                    />
                  </div>
                )}

                {(formData.type === 'coupon' || formData.type === 'free_shipping') && (
                  <div className="form-field-group">
                    <label className="field-label">Coupon Code (Optional - Auto-generated if left blank)</label>
                    <input
                      type="text"
                      value={formData.coupon_code}
                      onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                      className="field-input"
                      placeholder="e.g. SPIN10"
                    />
                  </div>
                )}

                <div className="form-row-2col">
                  <div className="form-field-group">
                    <label className="field-label">Slice Color</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="color-picker-input"
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="field-label">Text Color</label>
                    <input
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="color-picker-input"
                    />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-field-group">
                    <label className="field-label">Probability Weight (Win Odds)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value, 10) || 1 })}
                      className="field-input"
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="field-label">Sort Position</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="setting-box">
                  <label className="toggle-switch-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <div className="switch-slider" />
                    <span>Active Slice on Wheel</span>
                  </label>
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Slice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER SPECIFIC TARGET REWARD MODAL */}
      {isUserTargetModalOpen && (
        <div className="dialog-overlay">
          <div className="dialog-card">
            <div className="dialog-header">
              <h3>🎯 Target Specific Customer / Phone Number</h3>
              <button className="dialog-close-btn" onClick={() => setIsUserTargetModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveUserTarget}>
              <div className="dialog-body">
                <div className="form-field-group">
                  <label className="field-label">Customer Phone Number (e.g., 9846333075)</label>
                  <input
                    type="text"
                    required
                    value={userTargetForm.phone}
                    onChange={(e) => setUserTargetForm({ ...userTargetForm, phone: e.target.value })}
                    className="field-input"
                    placeholder="Enter customer 10-digit phone number"
                  />
                </div>

                <div className="form-field-group">
                  <label className="field-label">Option A: Assign Existing Wheel Slice</label>
                  <select
                    value={userTargetForm.segment_id}
                    onChange={(e) => setUserTargetForm({ ...userTargetForm, segment_id: e.target.value })}
                    className="field-input"
                  >
                    <option value="">-- Custom Special Gift Below --</option>
                    {data.segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.label} ({seg.type} - Value: {seg.value})
                      </option>
                    ))}
                  </select>
                </div>

                {!userTargetForm.segment_id && (
                  <>
                    <div className="form-field-group">
                      <label className="field-label">Option B: Custom Special Gift Label</label>
                      <input
                        type="text"
                        value={userTargetForm.custom_prize_label}
                        onChange={(e) => setUserTargetForm({ ...userTargetForm, custom_prize_label: e.target.value })}
                        className="field-input"
                        placeholder="e.g. VIP Special 50% OFF Gift!"
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Reward Type</label>
                      <select
                        value={userTargetForm.custom_prize_type}
                        onChange={(e) => setUserTargetForm({ ...userTargetForm, custom_prize_type: e.target.value })}
                        className="field-input"
                      >
                        <option value="coupon">Discount Coupon</option>
                        <option value="loyalty_points">Loyalty Points</option>
                        <option value="free_shipping">Free Shipping</option>
                        <option value="no_prize">No Prize</option>
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Reward Value / Discount %</label>
                      <input
                        type="number"
                        value={userTargetForm.custom_prize_value}
                        onChange={(e) => setUserTargetForm({ ...userTargetForm, custom_prize_value: parseFloat(e.target.value) || 0 })}
                        className="field-input"
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Coupon Code (Optional)</label>
                      <input
                        type="text"
                        value={userTargetForm.custom_coupon_code}
                        onChange={(e) => setUserTargetForm({ ...userTargetForm, custom_coupon_code: e.target.value.toUpperCase() })}
                        className="field-input"
                        placeholder="e.g. VIP50"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="dialog-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsUserTargetModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn" disabled={saving}>
                  {saving ? 'Saving...' : '🎯 Save Guaranteed Target Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BLOCKING CONFIRM DIALOG ── */}
      <NotificationModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
        onClose={closeConfirm}
      />

      {/* ── STACKABLE TOAST NOTIFICATIONS ── */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
