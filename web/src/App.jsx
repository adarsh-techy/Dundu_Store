import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

import Layout from './components/layout/Layout';
import WelcomePopup from './components/layout/WelcomePopup';
import ProtectedRoute from './components/auth/ProtectedRoute';
import useAuthStore from './store/auth.store';
import useCartStore from './store/cart.store';
import useSettingsStore from './store/settings.store';

import Home from './pages/home/home/Home';
import Products from './pages/products/product-list/Products';
import ProductDetail from './pages/products/product-detail/ProductDetail';
import Combos from './pages/combos/Combos';
import ComboDetail from './pages/combos/ComboDetail';
import Orders from './pages/orders/order-list/Orders';
import OrderDetail from './pages/orders/order-detail/OrderDetail';
import ReturnRequest from './pages/orders/return-request/ReturnRequest';
import Checkout from './pages/checkout/checkout/Checkout';
import Profile from './pages/account/profile/Profile';
import Wishlist from './pages/account/wishlist/Wishlist';
import Login from './pages/auth/login/Login';
import Signup from './pages/auth/signup/Signup';
import ForgotPassword from './pages/auth/forgot-password/ForgotPassword';
import AuthCallback from './pages/auth/callback/AuthCallback';
import LoyaltyCard from './pages/account/loyalty-card/LoyaltyCard';
import Wallet from './pages/account/wallet/Wallet';
import HelpPage from './pages/help/HelpPage';
import NotFound from './pages/not-found/NotFound';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false } } });

function KeyedProductDetail() {
  const { id } = useParams();
  return <ProductDetail key={id} />;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname, search]);
  return null;
}

function AppRoutes() {
  const { fetchMe, token } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchMe();
    fetchSettings();
    if (token) fetchCart();
  }, []);

  return (
    <Layout>
      <WelcomePopup />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<KeyedProductDetail />} />
        <Route path="/combos" element={<Combos />} />
        <Route path="/combos/:id" element={<ComboDetail />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/help/:topic" element={<HelpPage />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/orders/:id/return" element={<ProtectedRoute><ReturnRequest /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/loyalty-card" element={<LoyaltyCard />} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
        <Toaster position="top-center" toastOptions={{
          duration: 2800,
          style: { background: '#1a1a1d', color: '#f4f4f5', border: '1px solid #26262b', borderRadius: 14, fontSize: 14, fontWeight: 500 },
          success: { iconTheme: { primary: '#e91e8c', secondary: '#fff' } },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
