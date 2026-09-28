import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, AppState } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import useAuthStore from '../store/auth.store';
import useCartStore from '../store/cart.store';
import useSettingsStore from '../store/settings.store';
import useLanguageStore, { useTranslation } from '../store/language.store';
import { COLORS, API_URL, UPLOADS_URL } from '../config';

// Auth screens
import LoginScreen from '../screens/auth/login/LoginScreen';
import SignupScreen from '../screens/auth/signup/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/forgot-password/ForgotPasswordScreen';

// Main screens
import HomeScreen from '../screens/home/home/HomeScreen';
import ProductsScreen from '../screens/products/products/ProductsScreen';
import CartScreen from '../screens/checkout/cart/CartScreen';
import ProfileScreen from '../screens/profile/profile/ProfileScreen';
import ProductDetailScreen from '../screens/products/product-detail/ProductDetailScreen';
import CheckoutScreen from '../screens/checkout/checkout/CheckoutScreen';
import OrdersScreen from '../screens/orders/orders/OrdersScreen';
import OrderDetailScreen from '../screens/orders/order-detail/OrderDetailScreen';
import WishlistScreen from '../screens/profile/wishlist/WishlistScreen';
import ReferralScreen from '../screens/profile/referral/ReferralScreen';
import OrderSuccessScreen from '../screens/checkout/order-success/OrderSuccessScreen';
import HelpScreen from '../screens/policy/help/HelpScreen';
import LoyaltyCardScreen from '../screens/profile/loyalty-card/LoyaltyCardScreen';
import WalletScreen from '../screens/profile/wallet/WalletScreen';
import NotificationsScreen from '../screens/profile/notifications/NotificationsScreen';
import PrivacyPolicyScreen from '../screens/policy/privacy/PrivacyPolicyScreen';
import ReturnRefundPolicyScreen from '../screens/policy/return-refund/ReturnRefundPolicyScreen';
import ShippingPolicyScreen from '../screens/policy/shipping/ShippingPolicyScreen';
import CancellationPolicyScreen from '../screens/policy/cancellation/CancellationPolicyScreen';
import TermsConditionsScreen from '../screens/policy/terms/TermsConditionsScreen';
import PaymentScreen from '../screens/checkout/payment/PaymentScreen';
import ComboListScreen from '../screens/combos/ComboListScreen';
import ComboDetailScreen from '../screens/combos/ComboDetailScreen';

// Splash screen
import SplashScreen from '../screens/home/splash/SplashScreen';

// Delivery staff role — separate app entirely (own navigator, no tabs)
import DeliveryNavigator from './DeliveryNavigator';

// Global auth prompt modal
import LoginPromptModal from '../components/ui/LoginPromptModal';
import BirthdayPopupModal from '../components/ui/BirthdayPopupModal';
import SpinWheelModal from '../components/ui/SpinWheelModal';
import FestivalPopupModal from '../components/ui/FestivalPopupModal';
import FestivalFallingGifts from '../components/ui/FestivalFallingGifts';
import ScratchCardModal from '../components/ui/ScratchCardModal';
import FreeShippingModal from '../components/ui/FreeShippingModal';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Ionicons: outline when inactive, filled when active; colour comes from the tab bar's
// active/inactive tint (so the festival navbar colour applies too).
const TAB_ICON_SIZE = 24;

function TabIcon({ name, focused, color }) {
  return <Ionicons name={focused ? name : `${name}-outline`} size={TAB_ICON_SIZE} color={color} />;
}

function CartTabIcon({ focused, color }) {
  const count = useCartStore((state) => state.count);
  return (
    <View style={styles.cartIconContainer}>
      <TabIcon name="cart" focused={focused} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  const festEnabled     = useSettingsStore((s) => s.festivalEnabled);
  const festNavbarColor = useSettingsStore((s) => s.festivalNavbarColor);
  const festBgColor     = useSettingsStore((s) => s.festivalBgColor);
  const { t }           = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          festEnabled && {
            backgroundColor: festBgColor || COLORS.white,
            shadowColor: festNavbarColor || COLORS.primary,
          },
        ],
        tabBarActiveTintColor: festEnabled ? (festNavbarColor || COLORS.primary) : COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home', 'Home'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ProductsScreen}
        options={{
          tabBarLabel: t('shop', 'Shop'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="bag-handle" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: t('cart', 'Cart'),
          tabBarIcon: ({ focused, color }) => <CartTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile', 'Profile'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="person" focused={focused} color={color} />,
        }}
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
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />

      {/* Policy screens — public (no auth required) */}
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="ReturnRefundPolicy" component={ReturnRefundPolicyScreen} />
      <Stack.Screen name="ShippingPolicy" component={ShippingPolicyScreen} />
      <Stack.Screen name="CancellationPolicy" component={CancellationPolicyScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="ComboList" component={ComboListScreen} />
      <Stack.Screen name="ComboDetail" component={ComboDetailScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const initAuth = useAuthStore((state) => state.initAuth);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const festivalEnabled = useSettingsStore((state) => state.festivalEnabled);
  const festivalBgColor = useSettingsStore((state) => state.festivalBgColor);

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

    // Initialize language & auth in parallel; mark done when settled
    useLanguageStore.getState().initLanguage();
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

    // Re-fetch settings every time the app comes to foreground so that
    // festival mode changes in admin take effect without a full app restart.
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        fetchSettings();
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      appStateSub.remove();
    };
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
    colors: {
      ...DefaultTheme.colors,
      background: festivalEnabled ? (festivalBgColor || COLORS.white) : COLORS.white,
    },
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
          {/* Spin & Win Wheel popup — configurable in Admin Panel */}
          <SpinWheelModal />
          {/* Festival Offer popup — configurable in Admin Panel */}
          <FestivalPopupModal />
          {/* Scratch & Win Card popup */}
          <ScratchCardModal />
          {/* Free Shipping Goal popup */}
          <FreeShippingModal />
          {/* Festival Opening Falling Gifts & Items Shower */}
          <FestivalFallingGifts />
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
  cartIconContainer: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    borderWidth: 1.5,
    borderColor: COLORS.white,
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
