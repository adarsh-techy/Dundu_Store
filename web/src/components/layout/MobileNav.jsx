import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, Heart, User } from 'lucide-react';
import useCartStore from '../../store/cart.store';
import useAuthStore from '../../store/auth.store';

export default function MobileNav() {
  const { totalItems, openCart } = useCartStore();
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const count = totalItems();

  const item = 'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10.5px] font-semibold transition-colors';
  const cls = ({ isActive }) => `${item} ${isActive ? 'text-primary-soft' : 'text-muted'}`;

  if (pathname.startsWith('/checkout')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-line safe-bottom" aria-label="Primary">
      <div className="flex items-stretch">
        <NavLink to="/" end className={cls}><Home className="h-5 w-5" />Home</NavLink>
        <NavLink to="/products" className={cls}><LayoutGrid className="h-5 w-5" />Shop</NavLink>
        <button onClick={openCart} className={`${item} text-muted relative`} aria-label={`Cart, ${count} items`}>
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center animate-pop">
                {count}
              </span>
            )}
          </span>
          Cart
        </button>
        <NavLink to="/wishlist" className={cls}><Heart className="h-5 w-5" />Wishlist</NavLink>
        <NavLink to={user ? '/profile' : '/login'} className={cls}><User className="h-5 w-5" />{user ? 'Account' : 'Login'}</NavLink>
      </div>
    </nav>
  );
}
