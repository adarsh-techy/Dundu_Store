import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

import Layout from './components/layout/Layout';
import useAuthStore from './store/auth.store';

import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/products/ProductList';
import ProductDetail from './pages/products/ProductDetail';
import OrderList from './pages/orders/OrderList';
import OrderDetail from './pages/orders/OrderDetail';
import UserList from './pages/users/UserList';
import UserDetail from './pages/users/UserDetail';
import UserActivity from './pages/UserActivity';
import Categories from './pages/Categories';
import Returns from './pages/Returns';
import Coupons from './pages/Coupons';
import Banners from './pages/Banners';
import Admins from './pages/Admins';
import DeliveryStaff from './pages/DeliveryStaff';
import CartMonitor from './pages/CartMonitor';
import SalesReport from './pages/SalesReport';
import Reviews from './pages/Reviews';
import NewArrivals from './pages/NewArrivals';
import LoyaltyCards from './pages/LoyaltyCards';
import Announcements from './pages/Announcements';
import Referral from './pages/Referral';
import Settings from './pages/Settings';
import Wishlists from './pages/Wishlists';
import ProductInsights from './pages/ProductInsights';
import UserInsights from './pages/UserInsights';
import WhatsAppBroadcast from './pages/WhatsAppBroadcast';
import Birthdays from './pages/Birthdays';
import AppUpdate from './pages/AppUpdate';
import InventoryDashboard from './pages/InventoryDashboard';
import SplashScreenPage from './pages/SplashScreen';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function AppRoutes() {
  const { fetchMe } = useAuthStore();
  useEffect(() => { fetchMe(); }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/products" element={<Layout><ProductList /></Layout>} />
      <Route path="/products/:id" element={<Layout><ProductDetail /></Layout>} />
      <Route path="/categories" element={<Layout><Categories /></Layout>} />
      <Route path="/orders" element={<Layout><OrderList /></Layout>} />
      <Route path="/orders/:id" element={<Layout><OrderDetail /></Layout>} />
      <Route path="/returns" element={<Layout><Returns /></Layout>} />
      <Route path="/users" element={<Layout><UserList /></Layout>} />
      <Route path="/user-activity" element={<Layout><UserActivity /></Layout>} />
      <Route path="/users/:id" element={<Layout><UserDetail /></Layout>} />
      <Route path="/admins" element={<Layout><Admins /></Layout>} />
      <Route path="/delivery-staff" element={<Layout><DeliveryStaff /></Layout>} />
      <Route path="/coupons" element={<Layout><Coupons /></Layout>} />
      <Route path="/banners" element={<Layout><Banners /></Layout>} />
      <Route path="/carts" element={<Layout><CartMonitor /></Layout>} />
      <Route path="/wishlists" element={<Layout><Wishlists /></Layout>} />
      <Route path="/reports/daily" element={<Layout><SalesReport /></Layout>} />
      <Route path="/reviews" element={<Layout><Reviews /></Layout>} />
      <Route path="/new-arrivals" element={<Layout><NewArrivals /></Layout>} />
      <Route path="/loyalty" element={<Layout><LoyaltyCards /></Layout>} />
      <Route path="/announcements" element={<Layout><Announcements /></Layout>} />
      <Route path="/referral" element={<Layout><Referral /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
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
