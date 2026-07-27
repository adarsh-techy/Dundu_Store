import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config';
import useCartStore from '../../store/cart.store';
import useAuthStore from '../../store/auth.store';

export default function AppHeader({
  title,
  logo = false,
  showBack = false,
  showCart = false,
  showWishlist = false,
  rightComponent,
  logoColor,
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.count);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const paddingTop =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 24
      : 20;

  return (
    <View style={[styles.wrapper, { paddingTop }]}>
      <View style={styles.bar}>

        {/* Left */}
        {logo && showBack ? (
          /* Back button on left, logo centered */
          <>
            <TouchableOpacity
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' })}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoCentered}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.logo, logoColor && { color: logoColor }]}>DUNDU</Text>
            </TouchableOpacity>
          </>
        ) : logo ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.logo, logoColor && { color: logoColor }]}>DUNDU</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.leftGroup}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={showBack ? 0.6 : 1}
            disabled={!showBack}
          >
            {showBack && (
              <Text style={styles.backIcon}>‹</Text>
            )}
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </TouchableOpacity>
        )}

        {/* Right icons */}
        <View style={styles.rightGroup}>
          {logo && title && (
            <Text style={styles.pageTitle}>{title}</Text>
          )}
          {/* Wishlist icon — only for logged-in users */}
          {showWishlist && isAuthenticated && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Wishlist')}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.icon}>🤍</Text>
            </TouchableOpacity>
          )}

          {/* Cart icon → Login pill for guests */}
          {showCart && (
            isAuthenticated ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
                style={styles.iconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.icon}>🛍</Text>
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              /* Guest — show Login pill instead of cart */
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.loginPill}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.loginPillText}>Login</Text>
              </TouchableOpacity>
            )
          )}

          {rightComponent && rightComponent}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#040d04',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  // Logo-left (home) / logo-center (back screens)
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 3,
  },
  logoCentered: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  // Back + title group (other screens)
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backBtn: {
    marginRight: 4,
    paddingRight: 6,
  },
  backIcon: {
    fontSize: 30,
    color: COLORS.white,
    lineHeight: 34,
    fontWeight: '200',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    flexShrink: 1,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginRight: 4,
  },
  // Right icons
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    position: 'relative',
  },
  icon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  // Guest login pill
  loginPill: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginLeft: 4,
  },
  loginPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
