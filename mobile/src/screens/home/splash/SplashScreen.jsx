import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { UPLOADS_URL } from '../../../config';

export default function SplashScreen({ config, onDone }) {
  // Core animation values
  const logoScale      = useRef(new Animated.Value(0.7)).current;
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity    = useRef(new Animated.Value(0)).current;
  const screenOpacity  = useRef(new Animated.Value(1)).current;
  const imageOpacity   = useRef(new Animated.Value(0)).current;

  const bgColor    = config?.bg_color   || '#0F0F0F';
  const textColor  = config?.text_color || '#FFFFFF';
  const appName    = config?.app_name   || 'Dundu';
  const tagline    = config?.tagline    || '';
  const durationMs = config?.duration_ms || 2500;

  // Build full image URI
  const bgImageUri = config?.bg_image
    ? (config.bg_image.startsWith('http')
        ? config.bg_image
        : `${UPLOADS_URL}${config.bg_image.startsWith('/') ? '' : '/'}${config.bg_image}`)
    : null;

  // When image loads, fade it in smoothly
  const handleImageLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    // If no background image, make sure screen is ready immediately
    if (!bgImageUri) {
      imageOpacity.setValue(0);
    }

    // Phase 1 — Logo springs into view
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    // Phase 2 — Tagline fades in
    Animated.sequence([
      Animated.delay(350),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    // Phase 3 — Dots fade in
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(dotsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Phase 4 — Fade out whole screen smoothly at end of duration
    const totalDuration = Math.max(durationMs, 1800);
    const fadeTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => { if (onDone) onDone(); });
    }, totalDuration - 350);

    return () => clearTimeout(fadeTimer);
  }, [durationMs, bgImageUri]);

  return (
    <Animated.View
      style={[
        styles.screen,
        {
          backgroundColor: bgColor,
          opacity: screenOpacity,
        },
      ]}
    >
      <StatusBar hidden translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Full screen background image — fills the entire screen edge-to-edge */}
      {bgImageUri ? (
        <Animated.Image
          source={{ uri: bgImageUri }}
          style={[styles.backgroundImage, { opacity: imageOpacity }]}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={() => {/* fallback to bgColor seamlessly */}}
        />
      ) : null}

      {/* Center content */}
      <View style={styles.centerContent} pointerEvents="none">
        <Animated.Text
          style={[
            styles.appName,
            {
              color: textColor,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {appName}
        </Animated.Text>

        {!!tagline && (
          <Animated.Text
            style={[
              styles.tagline,
              {
                color: textColor,
                opacity: taglineOpacity,
              },
            ]}
          >
            {tagline}
          </Animated.Text>
        )}
      </View>

      {/* Bottom loading dots */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]} pointerEvents="none">
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
  }, [delay]);

  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />;
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 9999,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 2,
  },
  appName: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    gap: 8,
    zIndex: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
