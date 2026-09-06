import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  Clipboard,
  Alert,
  PanResponder,
} from 'react-native';
import Svg, { Defs, Mask, Rect, Path, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import useScratchCardStore from '../../store/scratchCard.store';
import useAuthStore from '../../store/auth.store';
import { API_URL, COLORS } from '../../config';

const BOX_SIZE = 240;

const getGiftTheme = (prize) => {
  if (!prize) return { bg: '#be185d', borderColor: '#ec4899', textColor: '#be185d', badgeBg: 'rgba(255, 255, 255, 0.25)' };

  // 1. If admin panel assigned a custom card color for this prize item, use it directly!
  if (prize.color && prize.color.trim() !== '') {
    return {
      bg: prize.color,
      borderColor: prize.color,
      textColor: prize.text_color || '#ffffff',
      badgeBg: 'rgba(255, 255, 255, 0.25)',
    };
  }

  // 2. Fallback smart colors by gift category
  const type = (prize.type || '').toLowerCase();
  const label = (prize.label || '').toLowerCase();

  if (type === 'no_prize' || label.includes('better luck') || label.includes('try again')) {
    return {
      bg: '#1e293b',
      borderColor: '#64748b',
      textColor: '#334155',
      badgeBg: 'rgba(241, 245, 249, 0.2)',
    };
  }

  if (type.includes('cashback') || label.includes('cashback') || label.includes('₹') || label.includes('cash')) {
    return {
      bg: '#047857',
      borderColor: '#10b981',
      textColor: '#047857',
      badgeBg: 'rgba(209, 250, 229, 0.25)',
    };
  }

  if (type.includes('discount') || label.includes('off') || label.includes('%') || label.includes('coupon')) {
    return {
      bg: '#6d28d9',
      borderColor: '#a855f7',
      textColor: '#6d28d9',
      badgeBg: 'rgba(243, 232, 255, 0.25)',
    };
  }

  return {
    bg: prize.color || '#be185d',
    borderColor: prize.color || '#ec4899',
    textColor: prize.color || '#be185d',
    badgeBg: 'rgba(252, 231, 243, 0.25)',
  };
};

export default function ScratchCardModal() {
  const { isOpen, closeScratchCard } = useScratchCardStore();
  const { user: authUser, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [prize, setPrize] = useState(null);
  const [svgPath, setSvgPath] = useState('');

  // Animations & Touch Gesture refs
  const foilOpacity = useRef(new Animated.Value(1)).current;
  const prizeScale = useRef(new Animated.Value(0.7)).current;
  const prizeFetchedRef = useRef(false);
  const lastPtRef = useRef(null);
  const rubDistanceRef = useRef(0);
  const [touchPos, setTouchPos] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setIsRevealed(false);
      setPrize(null);
      setTouchPos(null);
      setSvgPath('');
      lastPtRef.current = null;
      rubDistanceRef.current = 0;
      prizeFetchedRef.current = false;
      foilOpacity.setValue(1);
      prizeScale.setValue(0.7);

      const params = new URLSearchParams();
      if (authUser?.id) params.append('user_id', authUser.id);
      if (authUser?.phone) params.append('phone', authUser.phone);

      fetch(`${API_URL}/scratch-card/config?${params.toString()}`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.success) {
            setConfig(res.data);
          }
        })
        .catch(() => {});

      // Pre-fetch prize behind foil right away
      prefetchPrize();
    }
  }, [isOpen, authUser]);

  const prefetchPrize = async () => {
    if (prizeFetchedRef.current) return;
    prizeFetchedRef.current = true;
    try {
      const res = await fetch(`${API_URL}/scratch-card/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authUser?.id || null,
          phone: authUser?.phone || null,
        }),
      });
      const data = await res.json();
      if (data?.success && data?.data?.prize) {
        setPrize(data.data.prize);
      } else {
        setPrize({ label: 'Better Luck Next Time', type: 'no_prize', coupon_code: null, value: 0 });
      }
    } catch {
      setPrize({ label: '15% OFF Special Coupon', type: 'discount', coupon_code: 'SCRATCH15', value: 15 });
    }
  };

  const completeReveal = () => {
    if (isRevealed) return;
    setTouchPos(null);
    Animated.timing(foilOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsRevealed(true);
      Animated.spring(prizeScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    });
  };

  // Standard smooth GPay finger-scratching touch gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        prefetchPrize();
        const { locationX, locationY } = evt.nativeEvent;
        setTouchPos({ x: locationX, y: locationY });
        lastPtRef.current = { x: locationX, y: locationY };
        setSvgPath((prev) => `${prev} M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (evt) => {
        if (isRevealed) return;
        prefetchPrize();
        const { locationX, locationY } = evt.nativeEvent;
        setTouchPos({ x: locationX, y: locationY });

        if (lastPtRef.current) {
          const dx = locationX - lastPtRef.current.x;
          const dy = locationY - lastPtRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 3) {
            rubDistanceRef.current += dist;
            lastPtRef.current = { x: locationX, y: locationY };
            setSvgPath((prev) => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
          }
        }
      },
      onPanResponderRelease: () => {
        setTouchPos(null);
        // ONLY trigger reveal after full thorough card scratching (1800px+ total strokes)
        if (rubDistanceRef.current >= 1800 && !isRevealed) {
          completeReveal();
        }
      },
    })
  ).current;

  const copyCoupon = (code) => {
    if (!code) return;
    Clipboard.setString(code);
    Alert.alert('Copied! 🎉', `Coupon code "${code}" copied to clipboard!`);
  };

  if (!isOpen) return null;

  const currentTheme = getGiftTheme(prize);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={closeScratchCard}>
      <View style={styles.overlay}>
        <View style={styles.cardModal}>
          {/* Top Hot Pink Ribbon */}
          <View style={styles.topRibbon}>
            <Text style={styles.topRibbonText}>DUNDU REWARD CARD</Text>
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={closeScratchCard} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{config?.title || 'Scratch & Win Guaranteed Rewards!'}</Text>
          <Text style={styles.headerSub}>{config?.subtitle || 'Rub your finger across the card to erase foil and reveal your prize!'}</Text>

          {/* Interactive Scratch Box */}
          <View style={styles.scratchBox} {...panResponder.panHandlers}>
            {/* Gift Name Layer sitting underneath foil while scratching */}
            {!isRevealed && (
              <View style={styles.scratchCanvasBackground}>
                <Text style={styles.scratchUnderneathTitle}>{prize?.label || 'Mystery Reward'}</Text>
                {prize?.coupon_code ? (
                  <View style={[styles.scratchUnderneathCodePill, { borderColor: currentTheme.borderColor }]}>
                    <Text style={[styles.scratchUnderneathCodeText, { color: currentTheme.borderColor }]}>{prize.coupon_code}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Revealed Prize Layer with Dynamic Background Color per Gift */}
            {prize && isRevealed && (
              <Animated.View
                style={[
                  styles.prizeLayer,
                  {
                    backgroundColor: currentTheme.bg,
                    borderColor: currentTheme.borderColor,
                    transform: [{ scale: prizeScale }],
                  },
                ]}
              >
                <View style={[styles.prizeHeaderBadge, { backgroundColor: currentTheme.badgeBg, borderColor: currentTheme.borderColor }]}>
                  <Text style={styles.prizeHeaderBadgeText}>REWARD UNLOCKED!</Text>
                </View>
                <Text style={styles.prizeTitle}>{prize.label}</Text>
                {prize.coupon_code ? (
                  <TouchableOpacity
                    style={styles.codePill}
                    onPress={() => copyCoupon(prize.coupon_code)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.codeText, { color: currentTheme.textColor }]}>{prize.coupon_code}</Text>
                    <Text style={[styles.copyBadge, { backgroundColor: 'rgba(0,0,0,0.06)', color: currentTheme.textColor }]}>COPY CODE</Text>
                  </TouchableOpacity>
                ) : null}
              </Animated.View>
            )}

            {/* Continuous SVG Path Mask Pink-Black Metallic Foil Layer */}
            {!isRevealed && (
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: foilOpacity }]} pointerEvents="none">
                <Svg width={BOX_SIZE} height={BOX_SIZE} viewBox={`0 0 ${BOX_SIZE} ${BOX_SIZE}`}>
                  <Defs>
                    {/* SVG Mask: White keeps foil visible, Black Path erases continuous smooth strokes! */}
                    <Mask id="scratchMask">
                      <Rect x="0" y="0" width={BOX_SIZE} height={BOX_SIZE} fill="#FFFFFF" />
                      {svgPath ? (
                        <Path
                          d={svgPath}
                          stroke="#000000"
                          strokeWidth="48"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      ) : null}
                    </Mask>

                    {/* Radiant Metallic Platinum Silver Foil Gradient */}
                    <SvgGradient id="foilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FFFFFF" />
                      <Stop offset="30%" stopColor="#F1F5F9" />
                      <Stop offset="65%" stopColor="#E2E8F0" />
                      <Stop offset="100%" stopColor="#CBD5E1" />
                    </SvgGradient>
                  </Defs>

                  {/* Platinum Silver Foil Surface Masked */}
                  <Rect
                    x="0"
                    y="0"
                    width={BOX_SIZE}
                    height={BOX_SIZE}
                    rx="24"
                    ry="24"
                    fill="url(#foilGrad)"
                    mask="url(#scratchMask)"
                  />
                </Svg>
              </Animated.View>
            )}

            {/* Fingertip Sparkle Trails while scratching */}
            {touchPos && !isRevealed && (
              <View
                style={[
                  styles.fingertipSparkle,
                  { left: touchPos.x - 20, top: touchPos.y - 20 },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.sparkleText}>✨</Text>
              </View>
            )}
          </View>

          {/* Footer controls (Shown ONLY after user completes finger scratching) */}
          {isRevealed && (
            <TouchableOpacity style={styles.doneBtn} onPress={closeScratchCard} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>CLAIM & CONTINUE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#09090b',
    borderRadius: 32,
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 24,
    borderWidth: 1.5,
    borderColor: '#eab308',
    overflow: 'hidden',
  },
  topRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#db2777',
    paddingVertical: 7,
    alignItems: 'center',
  },
  topRibbonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#eab308',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 10,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12.5,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 6,
  },
  scratchBox: {
    width: 240,
    height: 240,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 22,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
  },
  scratchCanvasBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09090b',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#27272a',
  },
  scratchUnderneathEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  scratchUnderneathTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  scratchUnderneathCodePill: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.4)',
  },
  scratchUnderneathCodeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f472b6',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  prizeLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#be185d',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#ec4899',
  },
  prizeHeaderBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  prizeHeaderBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  prizeEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  prizeTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 14,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#be185d',
    fontFamily: 'monospace',
    letterSpacing: 1.5,
  },
  copyBadge: {
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#fce7f3',
    color: '#be185d',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#16a34a',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  doneBtnText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  fingertipSparkle: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sparkleText: {
    fontSize: 26,
    textShadowColor: '#cbd5e1',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
