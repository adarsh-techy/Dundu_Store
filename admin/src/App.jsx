import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

import Layout from './components/layout/Layout';
import useAuthStore from './store/auth.store';

import Login from './pages/auth/login/Login';
import Register from './pages/auth/register/Register';
import NotFound from './pages/common/not-found/NotFound';
import Dashboard from './pages/dashboard/dashboard/Dashboard';
import ProductList from './pages/catalog/products/ProductList';
import ProductDetail from './pages/catalog/products/ProductDetail';
import ProductFormPage from './pages/catalog/products/ProductFormPage';
import OrderList from './pages/orders/order-list/OrderList';
import OrderDetail from './pages/orders/order-detail/OrderDetail';
import UserList from './pages/users/user-list/UserList';
import UserDetail from './pages/users/user-detail/UserDetail';
import UserActivity from './pages/users/user-activity/UserActivity';
import Categories from './pages/catalog/categories/Categories';
import Combos from './pages/catalog/combos/Combos';
import Returns from './pages/orders/returns/Returns';
import Coupons from './pages/marketing/coupons/Coupons';
import Banners from './pages/marketing/banners/Banners';
import Admins from './pages/users/admins/Admins';
import Wallets from './pages/users/wallets/Wallets';
import DeliveryStaff from './pages/users/delivery-staff/DeliveryStaff';
import CartMonitor from './pages/orders/cart-monitor/CartMonitor';
import SalesReport from './pages/reports/sales-report/SalesReport';
import Reviews from './pages/marketing/reviews/Reviews';
import NewArrivals from './pages/catalog/new-arrivals/NewArrivals';
import LoyaltyCards from './pages/marketing/loyalty-cards/LoyaltyCards';
import Announcements from './pages/marketing/announcements/Announcements';
import Referral from './pages/marketing/referral/Referral';
import Settings from './pages/settings/settings/Settings';
import Wishlists from './pages/users/wishlists/Wishlists';
import ProductInsights from './pages/catalog/product-insights/ProductInsights';
import UserInsights from './pages/users/user-insights/UserInsights';
import WhatsAppBroadcast from './pages/marketing/whatsapp/WhatsAppBroadcast';
import Birthdays from './pages/users/birthdays/Birthdays';
import AppUpdate from './pages/settings/app-update/AppUpdate';
import InventoryDashboard from './pages/dashboard/inventory/InventoryDashboard';
import SplashScreenPage from './pages/settings/splash-screen/SplashScreen';
import PaymentMethods from './pages/settings/payment-methods/PaymentMethods';
import DeliverySettings from './pages/settings/delivery/DeliverySettings';
import ReturnSettings from './pages/settings/returns/ReturnSettings';

import SpinWheelPage from './pages/marketing/spin-wheel/SpinWheelPage';
import FestivalPage from './pages/marketing/festival/FestivalPage';
import FirstPurchasePage from './pages/marketing/first-purchase/FirstPurchasePage';
import ScratchCardPage from './pages/marketing/scratch-card/ScratchCardPage';
import MarketingControlPage from './pages/marketing/marketing-control/MarketingControlPage';
import FinancePage from './pages/reports/finance/FinancePage';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function AppRoutes() {
  const { fetchMe } = useAuthStore();
  useEffect(() => { fetchMe(); }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/finance" element={<Layout><FinancePage /></Layout>} />
      <Route path="/products" element={<Layout><ProductList /></Layout>} />
      <Route path="/products/new" element={<Layout><ProductFormPage /></Layout>} />
      <Route path="/products/:id/edit" element={<Layout><ProductFormPage /></Layout>} />
      <Route path="/products/:id" element={<Layout><ProductDetail /></Layout>} />
      <Route path="/categories" element={<Layout><Categories /></Layout>} />
      <Route path="/combos" element={<Layout><Combos /></Layout>} />
      <Route path="/orders" element={<Layout><OrderList /></Layout>} />
      <Route path="/orders/:id" element={<Layout><OrderDetail /></Layout>} />
      <Route path="/returns" element={<Layout><Returns /></Layout>} />
      <Route path="/users" element={<Layout><UserList /></Layout>} />
      <Route path="/user-activity" element={<Layout><UserActivity /></Layout>} />
      <Route path="/users/:id" element={<Layout><UserDetail /></Layout>} />
      <Route path="/admins" element={<Layout><Admins /></Layout>} />
      <Route path="/delivery-staff" element={<Layout><DeliveryStaff /></Layout>} />
      <Route path="/coupons" element={<Layout><Coupons /></Layout>} />
      <Route path="/marketing-control" element={<Layout><MarketingControlPage /></Layout>} />
      <Route path="/banners" element={<Layout><Banners /></Layout>} />
      <Route path="/carts" element={<Layout><CartMonitor /></Layout>} />
      <Route path="/wishlists" element={<Layout><Wishlists /></Layout>} />
      <Route path="/reports/daily" element={<Layout><SalesReport /></Layout>} />
      <Route path="/reviews" element={<Layout><Reviews /></Layout>} />
      <Route path="/new-arrivals" element={<Layout><NewArrivals /></Layout>} />
      <Route path="/loyalty" element={<Layout><LoyaltyCards /></Layout>} />
      <Route path="/wallets" element={<Layout><Wallets /></Layout>} />
      <Route path="/announcements" element={<Layout><Announcements /></Layout>} />
      <Route path="/referral" element={<Layout><Referral /></Layout>} />
      <Route path="/spin-wheel" element={<Layout><SpinWheelPage /></Layout>} />
      <Route path="/festival" element={<Layout><FestivalPage /></Layout>} />
      <Route path="/first-purchase" element={<Layout><FirstPurchasePage /></Layout>} />
      <Route path="/scratch-card" element={<Layout><ScratchCardPage /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
      <Route path="/payment-methods" element={<Layout><PaymentMethods /></Layout>} />
      <Route path="/delivery-settings" element={<Layout><DeliverySettings /></Layout>} />
      <Route path="/return-settings" element={<Layout><ReturnSettings /></Layout>} />
      <Route path="/insights/products" element={<Layout><ProductInsights /></Layout>} />
      <Route path="/whatsapp" element={<Layout><WhatsAppBroadcast /></Layout>} />
      <Route path="/birthdays" element={<Layout><Birthdays /></Layout>} />
      <Route path="/app-update" element={<Layout><AppUpdate /></Layout>} />
      <Route path="/inventory" element={<Layout><InventoryDashboard /></Layout>} />
      <Route path="/splash-config" element={<Layout><SplashScreenPage /></Layout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
