import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { announcementApi } from '../../api/index';

// Module-level flag — resets on each app launch (like localStorage on web)
let lastShownAt = 0;

const SCREEN_WIDTH = Dimensions.get('window').width;


export default function WelcomePopup() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const slideAnim = new Animated.Value(40);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    announcementApi.getAll()
      .then((res) => {
        const allList = res?.announcements || res?.data?.announcements || [];
        const n = new Date();
        const nowMins = n.getHours() * 60 + n.getMinutes();
        const list = allList.filter((a) => {
          if (!a.show_popup) return false;
          if (!a.scheduled_time) return true;
          const [h, m] = a.scheduled_time.split(':').map(Number);
          return nowMins >= h * 60 + m;
        });
        const interval = res?.popup_interval_minutes ?? res?.data?.popup_interval_minutes ?? 10;
        setAnnouncements(list);
        setIntervalMinutes(interval);
        if (!list.length) return;
        const elapsedMinutes = (Date.now() - lastShownAt) / 60000;
        if (elapsedMinutes < interval) return;
        setTimeout(() => setVisible(true), 700);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function close() {
    lastShownAt = Date.now();
    setVisible(false);
  }

  function shopNow() {
    close();
    navigation.navigate('Shop');
  }

  if (!visible || !announcements.length) return null;

  const hero = announcements[0];
  const bgColor = hero.bg_color || '#E91E8C';
  const textColor = hero.text_color || '#ffffff';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.card,
                { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* ✕ Close button */}
              <TouchableOpacity style={styles.closeBtn} onPress={close}>
                <Text style={[styles.closeX, { color: textColor }]}>✕</Text>
              </TouchableOpacity>

              {/* Body */}
              <View style={styles.body}>
                <Text style={[styles.brand, { color: textColor }]}>DUNDU</Text>

                <Text style={[styles.heroText, { color: textColor }]}>
                  {hero.text}
                </Text>

                {announcements.slice(1).map((a) => (
                  <Text key={a.id} style={[styles.subText, { color: textColor }]}>
                    {a.text}
                  </Text>
                ))}

                {/* Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.shopBtn, { backgroundColor: textColor }]}
                    onPress={shopNow}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.shopBtnText, { color: bgColor }]}>
                      Shop Now
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.laterBtn, { borderColor: textColor }]}
                    onPress={close}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.laterBtnText, { color: textColor }]}>
                      Maybe Later
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 40, 420),
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    padding: 36,
    paddingTop: 44,
    alignItems: 'center',
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    opacity: 0.65,
    marginBottom: 12,
  },
  heroText: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  shopBtn: {
    paddingHorizontal: 30,
    paddingVertical: 13,
    borderRadius: 50,
  },
  shopBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  laterBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 50,
    borderWidth: 2,
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
});
