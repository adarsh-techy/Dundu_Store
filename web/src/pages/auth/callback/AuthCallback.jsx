import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/auth.store';
import useCartStore from '../../../store/cart.store';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';

/** Landing page for Google sign-in: reads the token from the URL fragment. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setToken, fetchMe } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [token] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    return hash.get('token') || query.get('token') || '';
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Scrub the token from the address bar before doing anything else.
    window.history.replaceState(null, '', '/auth/callback');
    let cancelled = false;
    (async () => {
      if (!token) { if (!cancelled) setError('Sign-in was cancelled or the link has expired.'); return; }
      try {
        setToken(token);
        await fetchMe();
        await fetchCart();
        const redirect = sessionStorage.getItem('auth_redirect') || '/';
        sessionStorage.removeItem('auth_redirect');
        if (!cancelled) navigate(redirect, { replace: true });
      } catch {
        if (!cancelled) setError('We could not complete the sign-in. Please try again.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="container-x py-24 text-center">
        <p className="font-display text-2xl text-ink">Could not sign you in</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Button className="mt-6" pill onClick={() => navigate('/login')}>Back to login</Button>
      </div>
    );
  }
  return (
    <div className="py-24 text-center">
      <Spinner />
      <p className="text-sm text-muted -mt-8">Signing you in…</p>
    </div>
  );
}
