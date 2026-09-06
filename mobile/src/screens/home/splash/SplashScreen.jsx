import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { UPLOADS_URL } from '../../../config';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ config, onDone }) {
  // Core animation values
  const logoScale      = useRef(new Animated.Value(0.6)).current;
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity    = useRef(new Animated.Value(0)).current;
  const screenOpacity  = useRef(new Animated.Value(1)).current;
  // Separate value for background image fade-in once it loads
  const imageOpacity   = useRef(new Animated.Value(0)).current;

  const bgColor   = config?.bg_color   || '#0F0F0F';
  const textColor = config?.text_color || '#FFFFFF';
  const appName   = config?.app_name   || 'Dundu';
  const tagline   = config?.tagline    || '';
  const durationMs = config?.duration_ms || 2500;

  // Build full image URI
  const bgImageUri = config?.bg_image
    ? (config.bg_image.startsWith('http')
        ? config.bg_image
        : `${UPLOADS_URL}${config.bg_image.startsWith('/') ? '' : '/'}${config.bg_image}`)
    : null;

  // When image loads, fade it in smoothly over the background color
  const handleImageLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    // Phase 1 — logo pops in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Phase 2 — tagline fades in (400ms delay)
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Phase 3 — dots fade in (700ms delay)
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(dotsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Phase 4 — fade out whole screen
    const totalDuration = Math.max(durationMs, 1800);
    const fadeTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => { if (onDone) onDone(); });
    }, totalDuration - 400);

    return () => clearTimeout(fadeTimer);
  }, []);

  return (
    // Outermost wrapper — fade-out animation sits here, background color always visible
    <Animated.View style={[styles.screen, { backgroundColor: bgColor, opacity: screenOpacity }]}>
      <StatusBar hidden />

      {/* Background image — layered ON TOP of bgColor, fades in when loaded */}
      {bgImageUri ? (
        <Animated.Image
          source={{ uri: bgImageUri }}
          style={[styles.absoluteFill, { opacity: imageOpacity }]}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={() => {/* silently ignore — bgColor shows as fallback */}}
        />
      ) : null}

      {/* Subtle dark overlay so text stays readable over bright images */}
      {bgImageUri ? (
        <View style={[styles.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.30)' }]} />
      ) : null}

      {/* Center content */}
      <View style={styles.centerContent}>
        <Animated.Text
          style={[
            styles.appName,
            { color: textColor, opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          {appName}
        </Animated.Text>

        {!!tagline && (
          <Animated.Text style={[styles.tagline, { color: textColor, opacity: taglineOpacity }]}>
            {tagline}
          </Animated.Text>
        )}
      </View>

      {/* Loading dots */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
        {[0, 1, 2].map((i) => (
          <LoadingDot key={i} color={textColor} delay={i * 150} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function LoadingDot({ color, delay }) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
