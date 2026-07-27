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

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import ReturnRequest from './pages/ReturnRequest';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import LoyaltyCard from './pages/LoyaltyCard';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } });

function KeyedProductDetail() {
  const { id } = useParams();
  return <ProductDetail key={id} />;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);
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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/orders/:id/return" element={<ProtectedRoute><ReturnRequest /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/loyalty-card" element={<LoyaltyCard />} />

        <Route path="*" element={
          <div className="text-center py-32" style={{ color: '#555' }}>
            <p className="text-6xl mb-4">404</p>
            <p>Page not found</p>
          </div>
        } />
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
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1a1a1a', color: '#f5f5f5', border: '1px solid #2e2e2e' },
          className: 'text-sm font-medium',
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
