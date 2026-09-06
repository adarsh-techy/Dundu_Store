import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import useSettingsStore from '../../store/settings.store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FESTIVAL_EMOJIS = ['🎁', '🎉', '🪔', '🛍️', '✨', '🌟', '🎊', '🎈', '📦', '🥳', '💰', '🏆', '🎁', '🪔'];

function FallingItem({ emoji, x, delay, duration, size, sway }) {
  const fallAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fallAnim, {
          toValue: SCREEN_HEIGHT + 80,
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
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: duration - 600, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, { toValue: sway, duration: 1000, easing: Easing.sin, useNativeDriver: true }),
            Animated.timing(swayAnim, { toValue: -sway, duration: 1000, easing: Easing.sin, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        fontSize: size,
        opacity: opacityAnim,
        transform: [{ translateY: fallAnim }, { translateX: swayAnim }, { rotate }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

export default function FestivalFallingGifts() {
  const festEnabled = useSettingsStore((s) => s.festivalEnabled);
  const festEmoji   = useSettingsStore((s) => s.festivalEmoji);

  const [active, setActive] = useState(false);
  const hasTriggered = useRef(false);

  // Generate 36 randomized gift particles
  const particles = useRef(
    Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      emoji: i % 3 === 0 && festEmoji ? festEmoji : FESTIVAL_EMOJIS[i % FESTIVAL_EMOJIS.length],
      x: Math.random() * (SCREEN_WIDTH - 40) + 10,
      delay: Math.random() * 2200,
      duration: 2800 + Math.random() * 2000,
      size: Math.floor(Math.random() * 16) + 24, // 24px - 40px
      sway: Math.random() * 35 - 17.5,
    }))
  ).current;

  useEffect(() => {
    if (festEnabled && !hasTriggered.current) {
      hasTriggered.current = true;
      setActive(true);

      // Auto clear after all particles complete falling (~5.5 seconds)
      const timer = setTimeout(() => {
        setActive(false);
      }, 5800);

      return () => clearTimeout(timer);
    }
  }, [festEnabled]);

  if (!active || !festEnabled) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p) => (
        <FallingItem key={p.id} {...p} />
      ))}
    </View>
  );
}
