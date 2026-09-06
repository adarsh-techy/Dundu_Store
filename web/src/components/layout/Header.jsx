import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Star, Tag, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../store/auth.store';
import useCartStore from '../../store/cart.store';
import { categoryApi } from '../../api';


export default function Header() {
  const { user, logout } = useAuthStore();
  const { totalItems, openCart } = useCartStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const activeCategory = new URLSearchParams(location.search).get('category') || '';
  const isOfferPage = new URLSearchParams(location.search).get('offer') === 'true';

  const { data: catData } = useQuery({
    queryKey: ['categories-nav'],
    queryFn: categoryApi.list,
    staleTime: 5 * 60 * 1000,
  });
  const categories = catData?.data?.categories || [];

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header>
      {/* ── Top navbar ── */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link to="/" className="text-2xl font-black tracking-widest shrink-0 text-pink-600">
              DUNDU
            </Link>

            {/* Search — desktop only */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#888' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for products, brands and more..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#2a2a2a', border: '1px solid #2e2e2e', color: '#f5f5f5' }}
                  onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2e2e2e'; }}
                />
              </div>
            </form>

            {/* Right icons */}
            <div className="flex items-center gap-1 ml-auto">
              {user ? (
                <div className="relative group">
                  <Link to="/profile" className="flex flex-col items-center px-3 py-1 rounded-lg hover:bg-white/5 transition-colors">
                    <User className="h-5 w-5 text-white" />
                    <span className="text-[10px] mt-0.5" style={{ color: '#bbb' }}>{user.name?.split(' ')[0]}</span>
                  </Link>
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-2xl py-1 hidden group-hover:block z-50"
                    style={{ backgroundColor: '#1e1e1e', border: '1px solid #2e2e2e' }}>
                    <Link to="/profile" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 hover:text-white transition-colors">My Profile</Link>
                    <Link to="/orders" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 hover:text-white transition-colors">My Orders</Link>
                    <Link to="/wishlist" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 hover:text-white transition-colors">Wishlist</Link>
                    <Link to="/loyalty-card" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: '#e91e8c' }}>
                      <Star className="h-3.5 w-3.5" /> My Loyalty Card
                    </Link>
                    <Link to="/wallet" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: '#e91e8c' }}>
                      <Wallet className="h-3.5 w-3.5" /> My Wallet
                    </Link>
                    <hr style={{ borderColor: '#2e2e2e', margin: '4px 0' }} />
                    <button onClick={logout} className="block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5" style={{ color: '#e91e8c' }}>
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="flex flex-col items-center px-3 py-1 rounded-lg hover:bg-white/5 transition-colors">
                  <User className="h-5 w-5 text-white" />
                  <span className="text-[10px] mt-0.5" style={{ color: '#bbb' }}>Login</span>
                </Link>
              )}

              <Link to="/wishlist" className="flex flex-col items-center px-3 py-1 rounded-lg hover:bg-white/5 transition-colors">
                <Heart className="h-5 w-5 text-white" />
                <span className="text-[10px] mt-0.5" style={{ color: '#bbb' }}>Wishlist</span>
              </Link>

              <button onClick={openCart} className="flex flex-col items-center px-3 py-1 rounded-lg hover:bg-white/5 transition-colors relative">
                <div className="relative">
                  <ShoppingBag className="h-5 w-5 text-white" />
                  {totalItems() > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#e91e8c' }}>
                      {totalItems()}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5" style={{ color: '#bbb' }}>Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: Search bar ── */}
      <div className="md:hidden px-4 py-2" style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #1e1e1e' }}>
        <form onSubmit={handleSearch}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#666' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e', color: '#f5f5f5' }}
              onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
              onBlur={(e) => { e.target.style.borderColor = '#2e2e2e'; }}
            />
          </div>
        </form>
      </div>

      {/* ── Category circle strip (mobile + desktop) ── */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '2px solid #e91e8c' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4 md:gap-6 overflow-x-auto py-2 md:py-3"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

            {/* Offers bubble */}
            <Link to="/products?offer=true" className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
                  boxShadow: isOfferPage ? '0 0 0 3px #3b82f6, 0 3px 8px rgba(59,130,246,0.4)' : '0 3px 8px rgba(233,30,140,0.4)',
                }}>
                <Tag className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-semibold" style={{ color: isOfferPage ? '#3b82f6' : '#f5f5f5' }}>Offers</span>
            </Link>

            {/* Dynamic categories */}
            {categories.map((c) => {
              const isActive = activeCategory === c.slug;
              return (
                <Link key={c.id} to={`/products?category=${c.slug}`}
                  className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-11 h-11 md:w-14 md:h-14 rounded-full overflow-hidden"
                    style={{
                      border: isActive ? '2.5px solid #3b82f6' : '2px solid #2e2e2e',
                      backgroundColor: '#1a1a1a',
                      boxShadow: isActive ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
                    }}>
                    {c.image_url
                      ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                      : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-base"
                          style={{ color: '#e91e8c', backgroundColor: '#1a0a12' }}>
                          {c.name[0]}
                        </div>
                      )
                    }
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-center leading-tight"
                    style={{ color: isActive ? '#3b82f6' : '#ddd', maxWidth: '56px', fontWeight: isActive ? 700 : 500 }}>
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
