import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Text as SvgText,
  Line,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import useAuthStore from '../../store/auth.store';

import useSpinWheelStore from '../../store/spinWheel.store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const WHEEL_SIZE = 280;
const CX = WHEEL_SIZE / 2; // 140
const CY = WHEEL_SIZE / 2; // 140
const R = 125; // Pie slice radius

// Vibrant 12-color auto-palette matching Admin Preview
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
  '#F97316', // Orange
  '#6366F1', // Indigo
];

const FALLING_ITEMS = ['🎁', '🎉', '✨', '🥳', '⭐', '💎', '👑', '💰', '🎈', '🏆', '🎊', '🌟'];

// ─── Falling Emoji Particle ───────────────────────────────────────────────────
function FallingEmojiParticle({ emoji, x, delay, duration, size, sway }) {
  const fallAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fallAnim, {
          toValue: SCREEN_HEIGHT + 60,
          duration,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: duration - 700, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, { toValue: sway, duration: 1200, easing: Easing.sin, useNativeDriver: true }),
            Animated.timing(swayAnim, { toValue: -sway, duration: 1200, easing: Easing.sin, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        fontSize: size,
        zIndex: 9999,
        opacity: opacityAnim,
        transform: [{ translateY: fallAnim }, { translateX: swayAnim }, { rotate }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// ─── Falling Gifts Overlay (Randomly Spread-out Shower) ──────────────────────
function FallingGifts() {
  const particles = useRef(
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      emoji: FALLING_ITEMS[i % FALLING_ITEMS.length],
      x: Math.random() * (SCREEN_WIDTH - 50) + 10,
      delay: Math.random() * 2400,
      duration: 3200 + Math.random() * 2500,
      size: Math.floor(Math.random() * 18) + 22, // 22px to 40px
      sway: Math.random() * 44 - 22,
    }))
  ).current;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {particles.map((p) => (
        <FallingEmojiParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

// ─── Main SpinWheelModal ──────────────────────────────────────────────────────
export default function SpinWheelModal() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState(null);
  const [segments, setSegments] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showWinner, setShowWinner] = useState(false);

  const forceTriggerCount = useSpinWheelStore((s) => s.forceTriggerCount);
  const closeSpinWheel = useSpinWheelStore((s) => s.closeSpinWheel);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const winnerScaleAnim = useRef(new Animated.Value(0)).current;
  const hasClosedSession = useRef(false);
  const timerRef = useRef(null);
  const { user } = useAuthStore();

  // ── Listen for store force triggers ──────────────────────────────────────
  useEffect(() => {
    if (forceTriggerCount > 0) {
      hasClosedSession.current = false;
      fetchConfig(true);
    }
  }, [forceTriggerCount]);

  // ── Polling & AppState ────────────────────────────────────────────────────
  useEffect(() => {
    fetchConfig();

    const interval = setInterval(() => {
      if (!visible && !spinning && !hasClosedSession.current) fetchConfig();
    }, 4000);

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && !hasClosedSession.current) fetchConfig();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, visible, spinning]);

  // ── Pulse animation for SPIN button ──────────────────────────────────────
  useEffect(() => {
    if (visible && !spinning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible, spinning]);

  // ── Winner card pop-in ────────────────────────────────────────────────────
  useEffect(() => {
    if (showWinner) {
      winnerScaleAnim.setValue(0);
      Animated.spring(winnerScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [showWinner]);

  // ── Config Fetch ──────────────────────────────────────────────────────────
  const fetchConfig = async (force = false) => {
    try {
      if (force) {
        hasClosedSession.current = false;
      } else if (hasClosedSession.current) {
        return;
      }

      const phone = user?.phone || '';
      const userId = user?.id || '';
      const res = await fetch(
        `${API_URL}/spin-wheel/config?phone=${encodeURIComponent(phone)}&user_id=${encodeURIComponent(userId)}`
      );
      const data = await res.json();
      if (!data?.success || !data?.data) return;

      const cfg = data.data;

      if (force || cfg.is_forced) {
        if (hasClosedSession.current && !force) return;
        await AsyncStorage.removeItem('@spin_wheel_last');
        const todayKey = `@spin_wheel_views_${new Date().toISOString().split('T')[0]}`;
        await AsyncStorage.setItem(todayKey, '0');
        setConfig(cfg);
        setSegments(cfg.segments);
        setVisible(true);
        return;
      }

      if (cfg.require_login && !user) return;
      if (cfg.already_spun || !cfg.can_spin) return;

      if (cfg.enabled && cfg.segments?.length > 0) {
        if (cfg.start_time && cfg.end_time && cfg.time_slot_mode === 'anytime') {
          const now = new Date();
          const cur = now.getHours() * 60 + now.getMinutes();
          const [sh, sm] = cfg.start_time.split(':').map(Number);
          const [eh, em] = cfg.end_time.split(':').map(Number);
          if (cur < sh * 60 + sm || cur > eh * 60 + em) return;
        }

        const lastSpin = await AsyncStorage.getItem('@spin_wheel_last');
        if (lastSpin) {
          const elapsedHours = (Date.now() - parseInt(lastSpin, 10)) / 3600000;
          if (elapsedHours < (cfg.cooldown_hours || 24)) return;
        }

        const todayKey = `@spin_wheel_views_${new Date().toISOString().split('T')[0]}`;
        const viewsToday = parseInt((await AsyncStorage.getItem(todayKey)) || '0', 10);
        if (cfg.max_per_day > 0 && viewsToday >= cfg.max_per_day) return;

        setConfig(cfg);
        setSegments(cfg.segments);
        await AsyncStorage.setItem(todayKey, String(viewsToday + 1));

        if (timerRef.current) clearTimeout(timerRef.current);
        const delayMs = (cfg.delay_seconds ?? 3) * 1000;
        timerRef.current = setTimeout(() => {
          if (!hasClosedSession.current) {
            setVisible(true);
          }
        }, delayMs);
      }
    } catch (_) {}
  };

  // ── Spin handler ──────────────────────────────────────────────────────────
  const handleSpin = async () => {
    if (spinning || !segments.length) return;
    setSpinning(true);
    setWinner(null);

    try {
      const res = await fetch(`${API_URL}/spin-wheel/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user?.phone || '', user_id: user?.id || '' }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSpinning(false);
        Alert.alert('Spin & Win', data.message || 'Unable to spin right now.');
        return;
      }

      const { winner_index, winning_segment } = data.data;
      const numSegs = segments.length;
      const sliceAngle = 360 / numSegs;
      const targetAngle = (numSegs - winner_index - 0.5) * sliceAngle;
      const totalRotation = 360 * 6 + targetAngle;

      spinAnim.setValue(0);
      Animated.timing(spinAnim, {
        toValue: totalRotation,
        duration: 5000,
        easing: Easing.bezier(0.15, 0.9, 0.25, 1),
        useNativeDriver: true,
      }).start(async () => {
        setSpinning(false);
        setWinner(winning_segment);
        setShowWinner(true);
        await AsyncStorage.setItem('@spin_wheel_last', String(Date.now()));
      });
    } catch (_) {
      setSpinning(false);
      Alert.alert('Error', 'Connection error. Please try again.');
    }
  };

  const handleClose = () => {
    hasClosedSession.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    setShowWinner(false);
    setWinner(null);
    closeSpinWheel();
  };

  if (!visible || !segments.length) return null;

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const activeSegments = segments.filter((s) => s.is_active !== false);
  const numSlices = activeSegments.length;
  const sliceAngle = numSlices > 0 ? 360 / numSlices : 360;

  const getSliceColor = (seg, idx) => seg.color || SLICE_PALETTE[idx % SLICE_PALETTE.length];

  // ── 20 Perimeter Bulb Pegs (Matching Admin Preview 1:1) ─────────────────
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
        <Circle
          key={i}
          cx={px}
          cy={py}
          r="5"
          fill={bulbColors[i % 3]}
          stroke="#B8860B"
          strokeWidth="1"
        />
      );
    }
    return pegs;
  };

  // ── Gold Spoke Dividers (Matching Admin Preview 1:1) ──────────────────────
  const renderSpokes = () => {
    if (numSlices <= 1) return null;
    const spokes = [];
    for (let i = 0; i < numSlices; i++) {
      const angle = (i * sliceAngle - 90) * (Math.PI / 180);
      const x2 = CX + R * Math.cos(angle);
      const y2 = CY + R * Math.sin(angle);
      spokes.push(
        <Line
          key={i}
          x1={CX}
          y1={CY}
          x2={x2}
          y2={y2}
          stroke="rgba(255,215,0,0.75)"
          strokeWidth="1.5"
        />
      );
    }
    return spokes;
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>

          {/* ── Spinning Wheel Card ── */}
          <View style={styles.modalCard}>
            {/* Top Badge Ribbon */}
            <View style={styles.topBar}>
              <View style={styles.topBarInner}>
                <Text style={styles.topBarText}>👑 LUCKY REWARD WHEEL 👑</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} disabled={spinning}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{config?.title || 'Spin & Win Real Rewards! 🎉'}</Text>
            <Text style={styles.subtitle}>
              {config?.subtitle || 'Tap SPIN and win exclusive gift rewards!'}
            </Text>

            {/* ── Wheel Stage ── */}
            <View style={styles.wheelStage}>
              {/* 3D Pointer Arrow */}
              <View style={styles.pointerWrap}>
                <View style={styles.pointerShad} />
                <View style={styles.pointerArrow} />
                <View style={styles.pointerGem} />
              </View>

              {/* ── SVG Wheel Face with Spin Rotation ── */}
              <Animated.View
                style={{
                  width: WHEEL_SIZE,
                  height: WHEEL_SIZE,
                  transform: [{ rotate: spinInterpolation }],
                }}
              >
                <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
                  <Defs>
                    {/* Per-slice radial gradient for 3D depth */}
                    {activeSegments.map((seg, idx) => {
                      const base = getSliceColor(seg, idx);
                      return (
                        <RadialGradient key={`rg-${idx}`} id={`sliceGrad-${idx}`} cx="35%" cy="35%" r="70%">
                          <Stop offset="0%" stopColor={base} stopOpacity="1" />
                          <Stop offset="60%" stopColor={base} stopOpacity="0.9" />
                          <Stop offset="100%" stopColor={base} stopOpacity="0.65" />
                        </RadialGradient>
                      );
                    })}
                    <RadialGradient id="goldRimGrad" cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor="#FFF176" />
                      <Stop offset="55%" stopColor="#FFD700" />
                      <Stop offset="85%" stopColor="#FFA000" />
                      <Stop offset="100%" stopColor="#7A5200" />
                    </RadialGradient>
                    <RadialGradient id="hubGrad" cx="40%" cy="35%" r="65%">
                      <Stop offset="0%" stopColor="#FF6B9D" />
                      <Stop offset="50%" stopColor="#E91E8C" />
                      <Stop offset="100%" stopColor="#880E4F" />
                    </RadialGradient>
                  </Defs>

                  {/* Outer shadow behind wheel */}
                  <Circle cx={CX} cy={CY} r="140" fill="rgba(0,0,0,0.3)" transform="translate(3,5)" />

                  {/* 3D Gold Outer Ring */}
                  <Circle cx={CX} cy={CY} r="138" fill="url(#goldRimGrad)" stroke="#7A5200" strokeWidth="3" />
                  {/* Bright inner ring border */}
                  <Circle cx={CX} cy={CY} r="128" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                  {/* Dark inner edge for depth */}
                  <Circle cx={CX} cy={CY} r="127" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />

                  {/* Perimeter Bulbs */}
                  {renderBulbPegs()}

                  {/* Pie Slices */}
                  {activeSegments.map((seg, idx) => {
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

                    // Highlight arc at top portion of slice for 3D glossy shine
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
                      <G key={seg.id || idx}>
                        {/* Slice path with 3D radial gradient */}
                        <Path
                          d={pathData}
                          fill={`url(#sliceGrad-${idx})`}
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth="1.5"
                        />
                        {/* Glossy highlight */}
                        {highlightPath && (
                          <Path
                            d={highlightPath}
                            fill="rgba(255,255,255,0.18)"
                            stroke="none"
                          />
                        )}
                        {/* Text Label */}
                        <SvgText
                          x={tx}
                          y={ty}
                          fill={seg.text_color || '#FFFFFF'}
                          fontSize="10.5"
                          fontWeight="900"
                          textAnchor="middle"
                          alignmentBaseline="central"
                          transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                        >
                          {seg.label}
                        </SvgText>
                      </G>
                    );
                  })}

                  {/* Gold Spoke Lines */}
                  {renderSpokes()}

                  {/* 3-layer center hub inside SVG */}
                  <Circle cx={CX} cy={CY} r="32" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
                  <Circle cx={CX} cy={CY} r="28" fill="url(#hubGrad)" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                  <SvgText
                    x={CX}
                    y={CY - 4}
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="900"
                    textAnchor="middle"
                    alignmentBaseline="central"
                  >
                    SPIN
                  </SvgText>
                  <SvgText
                    x={CX}
                    y={CY + 6}
                    fill="rgba(255,255,255,0.85)"
                    fontSize="7"
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="central"
                  >
                    NOW
                  </SvgText>
                </Svg>
              </Animated.View>

              {/* ── Tap Area for Center Hub SPIN button ── */}
              <Animated.View
                style={[
                  styles.hubTouchWrap,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.hubTouchArea}
                  onPress={handleSpin}
                  disabled={spinning}
                  activeOpacity={0.8}
                >
                  {spinning && <ActivityIndicator color="#FFFFFF" size="small" />}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Bottom Tip Text */}
            <Text style={styles.tipText}>🎁 Spin once every {config?.cooldown_hours || 24}h</Text>
          </View>
        </View>
      </Modal>

      {/* ── Winner Modal (full screen with falling gifts shower) ── */}
      {showWinner && winner && (
        <Modal visible={showWinner} transparent animationType="fade" onRequestClose={handleClose}>
          <View style={styles.winnerOverlay}>

            {/* ✨ Full-screen falling gifts shower ✨ */}
            <FallingGifts />

            <Animated.View
              style={[styles.winnerCard, { transform: [{ scale: winnerScaleAnim }] }]}
            >
              {/* Gold Ribbon Header */}
              <View style={styles.winnerRibbon}>
                <Text style={styles.winnerRibbonText}>
                  {winner.type === 'no_prize' ? '😅 Oops!' : '🎉 YOU WON!'}
                </Text>
              </View>

              <Text style={styles.winnerEmoji}>
                {winner.type === 'no_prize' ? '😅' : winner.type === 'free_shipping' ? '🚚' : '🎁'}
              </Text>

              <Text style={styles.winnerTitle}>
                {winner.type === 'no_prize'
                  ? 'Better Luck Next Time!'
                  : 'Congratulations! 🥳'}
              </Text>

              <Text style={styles.winnerPrize}>{winner.label}</Text>

              {winner.type === 'free_shipping' && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>🚚 FREE DELIVERY</Text>
                  <Text style={styles.freeBadgeSub}>Auto-applied on your next order!</Text>
                </View>
              )}

              {winner.coupon_code && winner.type !== 'free_shipping' && (
                <View style={styles.couponBox}>
                  <Text style={styles.couponLabel}>🎫 YOUR COUPON CODE</Text>
                  <Text style={styles.couponCode}>{winner.coupon_code}</Text>
                  <Text style={styles.couponSub}>Auto-applied at checkout 🛍️</Text>
                </View>
              )}

              <TouchableOpacity style={styles.claimBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={styles.claimBtnText}>
                  {winner.type === 'no_prize' ? '🔄 OK, Got It' : '🛍️ CLAIM & SHOP NOW'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 28, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 24,
  },
  topBar: {
    width: '100%',
    backgroundColor: '#E91E8C',
    paddingVertical: 10,
    alignItems: 'center',
  },
  topBarInner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 30,
  },
  topBarText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.8,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
  wheelStage: {
    width: WHEEL_SIZE + 20,
    height: WHEEL_SIZE + 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    position: 'relative',
  },
  pointerWrap: {
    position: 'absolute',
    top: -12,
    zIndex: 99,
    alignItems: 'center',
  },
  pointerShad: {
    position: 'absolute',
    top: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.35)',
  },
  pointerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFD700',
  },
  pointerGem: {
    position: 'absolute',
    top: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E91E8C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 8,
  },
  hubTouchWrap: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubTouchArea: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 10,
  },

  // ── Winner modal styles ────────────────────────────────────────────────────
  winnerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 28, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  winnerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 24,
    borderWidth: 2.5,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 32,
    zIndex: 10000,
  },
  winnerRibbon: {
    width: '100%',
    backgroundColor: '#E91E8C',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  winnerRibbonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  winnerEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  winnerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  winnerPrize: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E91E8C',
    marginVertical: 10,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  freeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '88%',
    alignItems: 'center',
    marginVertical: 12,
  },
  freeBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 1,
  },
  freeBadgeSub: {
    fontSize: 11.5,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 4,
  },
  couponBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#16A34A',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 14,
    width: '88%',
    alignItems: 'center',
    marginVertical: 12,
  },
  couponLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 1.5,
  },
  couponCode: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 3,
    marginVertical: 6,
  },
  couponSub: {
    fontSize: 11.5,
    color: '#166534',
    fontWeight: '600',
  },
  claimBtn: {
    backgroundColor: '#E91E8C',
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 32,
    width: '88%',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
