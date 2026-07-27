import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing, Dimensions } from 'react-native';
import { announcementApi } from '../../api/index';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState([]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const textWidth = useRef(0);
  const animation = useRef(null);

  useEffect(() => {
    announcementApi.getAll()
      .then((res) => {
        const all = res?.announcements || res?.data?.announcements || [];
        const n = new Date();
        const nowMins = n.getHours() * 60 + n.getMinutes();
        const list = all.filter((a) => {
          if (!a.scheduled_time) return true;
          const [h, m] = a.scheduled_time.split(':').map(Number);
          return nowMins >= h * 60 + m;
        });
        setAnnouncements(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!announcements.length || textWidth.current === 0) return;
    startAnimation();
    return () => animation.current?.stop();
  }, [announcements, textWidth.current]);

  function startAnimation() {
    scrollX.setValue(SCREEN_WIDTH);
    animation.current = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -textWidth.current,
        duration: (textWidth.current + SCREEN_WIDTH) * 30,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.current.start();
  }

  if (!announcements.length) return null;

  // Build one long ticker string from all announcements
  const tickerText = announcements
    .map((a) => a.text)
    .join('    •    ');

  const bgColor = announcements[0]?.bg_color || '#E91E8C';
  const textColor = announcements[0]?.text_color || '#ffffff';

  return (
    <View style={[styles.bar, { backgroundColor: bgColor }]}>
      <Animated.Text
        style={[styles.text, { color: textColor, transform: [{ translateX: scrollX }] }]}
        numberOfLines={1}
        onLayout={(e) => {
          textWidth.current = e.nativeEvent.layout.width;
          startAnimation();
        }}
      >
        {tickerText}{'    •    '}{tickerText}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 32,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    whiteSpace: 'nowrap',
  },
});
