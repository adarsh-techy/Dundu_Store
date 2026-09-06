import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/ui/AppHeader';
import { userApi, announcementApi } from '../../../api/index';
import { COLORS } from '../../../config';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [notifRes, annRes] = await Promise.all([
          userApi.getNotifications().catch(() => null),
          announcementApi.getAll().catch(() => null),
        ]);
        setNotifications(notifRes?.notifications || notifRes?.data?.notifications || []);
        setAnnouncements(annRes?.announcements || annRes?.data?.announcements || []);
        userApi.markNotificationsRead().catch(() => {});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isEmpty = !loading && notifications.length === 0 && announcements.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Notifications" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>

          {/* Announcements */}
          {announcements.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Announcements</Text>
              {announcements.map((a) => (
                <View key={`ann-${a.id}`} style={styles.announcementCard}>
                  <View style={styles.annBadge}>
                    <Text style={styles.annBadgeText}>📢 Announcement</Text>
                  </View>
                  <Text style={styles.annText}>{a.text}</Text>
                </View>
              ))}
            </>
          )}

          {/* User notifications */}
          {notifications.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, announcements.length > 0 && { marginTop: 20 }]}>
                Your Notifications
              </Text>
              {notifications.map((n) => (
                <View key={n.id} style={[styles.notifCard, n.is_read && styles.notifCardRead]}>
                  {!n.is_read && <View style={styles.unreadDot} />}
                  <View style={styles.notifBody}>
                    <Text style={[styles.notifTitle, n.is_read && styles.notifTitleRead]}>{n.title}</Text>
                    {!!n.message && (
                      <Text style={styles.notifMessage}>{n.message}</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  // Announcement card
  announcementCard: {
    backgroundColor: '#fffbea',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0d060',
  },
  annBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0d060',
  },
  annBadgeText: { fontSize: 11, fontWeight: '700', color: '#92700a' },
  annText: { fontSize: 14, color: '#5a4a00', lineHeight: 20 },
  // Notification card
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff0f6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    gap: 10,
  },
  notifCardRead: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 5,
    shrink: 0,
  },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  notifTitleRead: { fontWeight: '500', color: COLORS.textSecondary },
  notifMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3, lineHeight: 18 },
});
