import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Star, Tag, Wallet, Package, LogOut, ChevronDown, X, Sparkles, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../store/auth.store';
import useCartStore from '../../store/cart.store';
import { categoryApi } from '../../api';
import logo from '../../assets/logo.png';
import { isGenzyMatch } from '../../store/theme.store';

const NAV = [
  { to: '/products', label: 'Shop' },
  { to: '/products?new_arrival=true', label: 'New In', icon: Sparkles },
  { to: '/products?offer=true', label: 'Offers', icon: Tag, accent: true },
  { to: '/combos', label: 'Combos', icon: Gift },
];

export default function Header() {
  const { user, logout } = useAuthStore();
  const { totalItems, openCart, lastAdded } = useCartStore();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get('category') || '';
  const isOfferPage = params.get('offer') === 'true';
  const count = totalItems();

  const { data: catData } = useQuery({
    queryKey: ['categories-nav'],
    queryFn: categoryApi.list,
    staleTime: 5 * 60 * 1000,
  });
  const categories = catData?.data?.categories || [];

  // Close the account menu on outside click; links inside it close it on navigation.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
      setSearchOpen(false);
    }
  };

  const searchBox = (cls = '') => (
    <form onSubmit={handleSearch} className={cls} role="search">
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dresses, kids wear, maternity…"
          aria-label="Search products"
          autoFocus={searchOpen}
          className="input pl-10 pr-9 h-10 rounded-full bg-surface"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );

  const iconBtn = 'relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl text-muted hover:text-ink hover:bg-white/5 transition-colors';

  return (
    <header className="glass border-b border-line">
      {/* ── Top bar ── */}
      <div className="container-x">
        <div className="flex items-center gap-3 md:gap-6 h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Dundu home">
            <img src={logo} alt="" className="h-9 w-9 object-contain drop-shadow-[0_0_12px_var(--logo-glow,rgba(233,30,140,.45))]" />
            <span className="font-display text-[1.45rem] font-semibold tracking-wide text-ink">Dundu</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-2" aria-label="Main">
            {NAV.map((n) => {
              const active = location.pathname + location.search === n.to || (n.to === '/products' && location.pathname === '/products' && !location.search);
              return (
                <Link key={n.to} to={n.to}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${active ? 'text-primary-soft bg-primary/10' : n.accent ? 'text-primary-soft hover:bg-primary/10' : 'text-ink-2 hover:text-ink hover:bg-white/5'}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>

          {searchBox('flex-1 max-w-xl hidden md:flex')}

          <div className="flex items-center gap-0.5 ml-auto">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen((o) => !o)} className={iconBtn} aria-haspopup="menu" aria-expanded={menuOpen}>
                  <span className="flex items-center gap-1">
                    <span className="h-6 w-6 rounded-full bg-primary/20 text-primary-soft text-xs font-bold flex items-center justify-center">
                      {(user.name || 'U').trim()[0]?.toUpperCase()}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </span>
                  <span className="text-[10px] max-w-16 truncate">{user.name?.split(' ')[0]}</span>
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-56 card p-1.5 animate-fade-up z-50">
                    <div className="px-3 py-2.5 border-b border-line mb-1">
                      <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                      <p className="text-xs text-muted truncate">{user.email || user.phone}</p>
                    </div>
                    {[
                      ['/profile', 'My Profile', User],
                      ['/orders', 'My Orders', Package],
                      ['/wishlist', 'Wishlist', Heart],
                      ['/loyalty-card', 'Loyalty Card', Star],
                      ['/wallet', 'Wallet', Wallet],
                    ].map(([to, label, Icon]) => (
                      <Link key={to} to={to} role="menuitem" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-white/5 hover:text-ink">
                        <Icon className="h-4 w-4 text-muted" />{label}
                      </Link>
                    ))}
                    <button onClick={() => { setMenuOpen(false); logout(); navigate('/'); }} role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-primary-soft hover:bg-primary/10 mt-1">
                      <LogOut className="h-4 w-4" />Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className={iconBtn}>
                <User className="h-5 w-5" />
                <span className="text-[10px]">Login</span>
              </Link>
            )}

            <button onClick={() => setSearchOpen((o) => !o)} className={`${iconBtn} md:hidden`} aria-label="Search" aria-expanded={searchOpen}>
              <Search className="h-5 w-5" />
              <span className="text-[10px]">Search</span>
            </button>

            <Link to="/wishlist" className={`${iconBtn} hidden md:flex`}>
              <Heart className="h-5 w-5" />
              <span className="text-[10px]">Wishlist</span>
            </Link>

            <button onClick={openCart} className={iconBtn} aria-label={`Open cart, ${count} items`}>
              <span className="relative">
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <span key={lastAdded || 'badge'} className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center animate-pop">
                    {count}
                  </span>
                )}
              </span>
              <span className="text-[10px]">Cart</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile search (toggled) ── */}
      {searchOpen && <div className="md:hidden container-x pb-2.5 animate-fade-in">{searchBox()}</div>}

      {/* ── Category strip ── */}
      {(categories.length > 0) && (
        <div className="border-t border-line/70">
          <div className="container-x">
            <div className="flex gap-4 md:gap-6 overflow-x-auto py-2.5 md:py-3 scrollbar-none">
              <Link to="/products?offer=true" className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${isOfferPage ? 'ring-2 ring-offset-2 ring-offset-bg ring-primary' : ''}`}
                  style={{ background: 'linear-gradient(135deg, #e91e8c, #ff7a3d)', boxShadow: '0 6px 18px -6px rgba(233,30,140,.7)' }}>
                  <Tag className="h-5 w-5 text-white" />
                </div>
                <span className={`text-[11px] font-semibold ${isOfferPage ? 'text-primary-soft' : 'text-ink-2'}`}>Offers</span>
              </Link>
              {categories.map((c) => {
                const isActive = activeCategory === c.slug;
                const isGenzy = isGenzyMatch(c.slug, c.name);
                return (
                  <NavLink key={c.id} to={`/products?category=${c.slug}`} className="flex flex-col items-center gap-1.5 shrink-0 group">
                    <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-elevated border transition-all group-hover:scale-105 ${
                      isActive
                        ? 'border-primary ring-2 ring-primary/30'
                        : isGenzy
                          ? 'border-emerald-500/50 hover:border-emerald-400'
                          : 'border-line'
                    }`}>
                      {c.image_url
                        ? <img src={c.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center font-display text-lg text-primary-soft bg-primary/10">{c.name[0]}</div>}
                      {isGenzy && (
                        <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-500 text-black text-[7px] font-black rounded-full flex items-center justify-center shadow-xs">
                          ⚡
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-semibold text-center leading-tight max-w-16 truncate ${isActive ? 'text-primary-soft font-bold' : isGenzy ? 'text-emerald-400 font-bold' : 'text-ink-2'}`}>{c.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
