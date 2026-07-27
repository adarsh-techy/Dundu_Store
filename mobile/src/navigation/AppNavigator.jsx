import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import useAuthStore from '../store/auth.store';
import useCartStore from '../store/cart.store';
import useSettingsStore from '../store/settings.store';
import { COLORS, API_URL, UPLOADS_URL } from '../config';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main screens
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import WishlistScreen from '../screens/WishlistScreen';
import ReferralScreen from '../screens/ReferralScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import HelpScreen from '../screens/HelpScreen';
import LoyaltyCardScreen from '../screens/LoyaltyCardScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import ReturnRefundPolicyScreen from '../screens/ReturnRefundPolicyScreen';
import ShippingPolicyScreen from '../screens/ShippingPolicyScreen';
import CancellationPolicyScreen from '../screens/CancellationPolicyScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';
import PaymentScreen from '../screens/PaymentScreen';

// Splash screen
import SplashScreen from '../screens/SplashScreen';

// Delivery staff role — separate app entirely (own navigator, no tabs)
import DeliveryNavigator from './DeliveryNavigator';

// Global auth prompt modal
import LoginPromptModal from '../components/ui/LoginPromptModal';
import BirthdayPopupModal from '../components/ui/BirthdayPopupModal';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icon}
    </Text>
  );
}

function CartTabIcon({ focused }) {
  const count = useCartStore((state) => state.count);
  return (
    <View style={styles.cartIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>🛒</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Shop"
        component={ProductsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🛍" focused={focused} /> }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarIcon: ({ focused }) => <CartTabIcon focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

/**
 * All screens are in one stack — guests can browse Home, Shop, ProductDetail.
 * Auth screens (Login, Signup) are also in this stack so we can navigate to them
 * from anywhere when a protected action is triggered.
 */
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main browsable area */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ presentation: 'card' }} />

      {/* Auth — pushed on top when needed */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ presentation: 'modal' }} />

      {/* Protected screens (only reachable when logged in — guarded at entry points) */}
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="LoyaltyCard" component={LoyaltyCardScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />

      {/* Policy screens — public (no auth required) */}
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="ReturnRefundPolicy" component={ReturnRefundPolicyScreen} />
      <Stack.Screen name="ShippingPolicy" component={ShippingPolicyScreen} />
      <Stack.Screen name="CancellationPolicy" component={CancellationPolicyScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const initAuth = useAuthStore((state) => state.initAuth);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  // Splash state — waits for BOTH splash animation AND auth to complete
  const [showSplash, setShowSplash] = useState(true);
  const [splashConfig, setSplashConfig] = useState(null);
  // Gate: wait briefly for config before rendering SplashScreen,
  // so it always mounts with the bg_image available
  const [configReady, setConfigReady] = useState(false);
  const splashDone = useRef(false);
  const authDone = useRef(false);

  const maybeExitSplash = () => {
    if (splashDone.current && authDone.current) {
      setShowSplash(false);
    }
  };

  const handleSplashDone = () => {
    splashDone.current = true;
    maybeExitSplash();
  };

  useEffect(() => {
    // Allow at most 800ms total for config+image prefetch, then show splash anyway
    const configTimeout = setTimeout(() => setConfigReady(true), 800);

    // Fetch splash config, then prefetch the bg image before showing the splash
    fetch(`${API_URL}/settings/splash`)
      .then((r) => r.json())
      .then(async (data) => {
        const splash = data?.data?.splash;
        if (splash) {
          setSplashConfig(splash);
          // Prefetch the background image into RN cache so ImageBackground shows it instantly
          if (splash.bg_image) {
            const imgUrl = splash.bg_image.startsWith('http')
              ? splash.bg_image
              : `${UPLOADS_URL}${splash.bg_image.startsWith('/') ? '' : '/'}${splash.bg_image}`;
            try { await Image.prefetch(imgUrl); } catch (_) {}
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(configTimeout);
        setConfigReady(true);
      });

    // Initialize auth in parallel; mark done when settled
    initAuth().finally(() => {
      authDone.current = true;
      maybeExitSplash();
    });
    fetchSettings();

    // Safety timeout — force exit splash after 8 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      authDone.current = true;
      splashDone.current = true;
      setShowSplash(false);
    }, 8000);

    return () => clearTimeout(safetyTimeout);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated]);

  // When config loads with is_active=false, immediately skip the splash
  useEffect(() => {
    if (configReady && splashConfig !== null && splashConfig.is_active === false) {
      splashDone.current = true;
      maybeExitSplash();
    }
  }, [configReady, splashConfig]);

  // Show a plain dark screen while waiting for config (max 800ms)
  if (!configReady) {
    return (
      <View style={{ flex: 1, backgroundColor: splashConfig?.bg_color || '#0F0F0F' }} />
    );
  }

  // Splash is active — show it
  if (showSplash && splashConfig?.is_active !== false) {
    return <SplashScreen config={splashConfig} onDone={handleSplashDone} />;
  }

  // Splash disabled or done — if auth is still running show blank screen, then NavigationContainer
  if (showSplash) {
    // is_active=false but auth not finished yet — hold on a plain screen
    return <View style={{ flex: 1, backgroundColor: '#0F0F0F' }} />;
  }

  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: COLORS.white },
  };

  // Delivery staff get a completely separate app (no shopping tabs, no cart) —
  // they log in through the same LoginScreen inside AppStack, and once
  // authenticated with role='delivery_staff' this swaps them straight over.
  const isDeliveryStaff = isAuthenticated && user?.role === 'delivery_staff';

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {isDeliveryStaff ? (
        <DeliveryNavigator />
      ) : (
        <>
          {/* Single navigator for everyone — guests and logged-in customers alike */}
          <AppStack />
          {/* Global login prompt modal — shown from anywhere via loginPrompt.store */}
          <LoginPromptModal />
          {/* Birthday popup — shown on user's birthday if enabled */}
          <BirthdayPopupModal />
        </>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 20,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabLabel: { fontSize: 11, fontWeight: '500' },
  tabIcon: { fontSize: 22 },
  tabIconFocused: { transform: [{ scale: 1.1 }] },
  cartIconContainer: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
});
