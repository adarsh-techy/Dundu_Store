import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, Ticket,
  Image, BarChart2, UserCog, LogOut, ShoppingCart,
  TrendingUp, Star, Sparkles, CreditCard, Megaphone, Gift, Settings2, Heart, FlameKindling, MessageCircle, Cake, Smartphone, Layers, Activity, Bike, Truck, RotateCcw, PartyPopper, PackagePlus, Wallet, Sliders, X, ScrollText,
} from 'lucide-react';
import useAuthStore from '../../store/auth.store';
import dunduLogo from '../../assets/logo.png';

export const allNavGroups = [
  {
    label: 'Online',
    items: [
      { to: '/',                    icon: LayoutDashboard, label: 'Dashboard',       superOnly: true  },
      { to: '/finance',             icon: Wallet,          label: 'Finance & Profit',superOnly: false, permission: 'reports' },
      { to: '/loyalty',       icon: CreditCard,      label: 'Loyalty Cards',superOnly: false, permission: 'loyalty' },
      { to: '/wallets',       icon: Wallet,          label: 'Wallets',      superOnly: false, permission: 'wallet' },
      { to: '/reports/daily', icon: TrendingUp,      label: 'Sales Report', superOnly: false, permission: 'reports' },
    ],
  },
  {
    label: 'Catalog',
    superOnly: true,
    items: [
      { to: '/inventory',    icon: BarChart2,    label: 'Inventory',       superOnly: true },
      { to: '/products',     icon: Package,     label: 'Products',        superOnly: true },
      { to: '/categories',   icon: Tag,         label: 'Categories',      superOnly: true },
      { to: '/combos',       icon: PackagePlus, label: 'Combos',          superOnly: true },
      { to: '/new-arrivals',       icon: Sparkles,       label: 'New Arrivals',      superOnly: true },
      { to: '/insights/products',  icon: FlameKindling,  label: 'Product Insights',  superOnly: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/orders',    icon: ShoppingBag, label: 'Orders',       superOnly: false, permission: 'orders' },
      { to: '/returns',   icon: BarChart2,   label: 'Returns',      superOnly: false, permission: 'returns' },
      { to: '/delivery-staff', icon: Bike,   label: 'Delivery Staff', superOnly: false },
      { to: '/carts',     icon: ShoppingCart,label: 'Cart Monitor', superOnly: true  },
      { to: '/wishlists', icon: Heart,       label: 'Wishlists',    superOnly: true  },
    ],
  },
  {
    label: 'Customers',
    superOnly: true,
    items: [
      { to: '/users',         icon: Users,    label: 'Users',         superOnly: true },
      { to: '/user-activity', icon: Activity, label: 'User Activity', superOnly: true },
      { to: '/admins',        icon: UserCog,  label: 'Admins',        superOnly: true },
      { to: '/audit-log',     icon: ScrollText, label: 'Audit Log',   superOnly: true },
    ],
  },
  {
    label: 'Marketing',
    superOnly: true,
    items: [
      { to: '/marketing-control', icon: Sliders, label: 'Marketing Control', superOnly: true },
      { to: '/coupons',       icon: Ticket,        label: 'Coupons',       superOnly: true },
      { to: '/referral',      icon: Gift,          label: 'Referral',      superOnly: true },
      { to: '/banners',       icon: Image,         label: 'Banners',       superOnly: true },
      { to: '/announcements', icon: Megaphone,     label: 'Announcements', superOnly: true },
      { to: '/whatsapp',      icon: MessageCircle, label: 'WhatsApp',      superOnly: true },
      { to: '/birthdays',     icon: Cake,          label: 'Birthdays',     superOnly: true },
      { to: '/spin-wheel',    icon: Gift,          label: 'Spin & Win',    superOnly: true },
      { to: '/festival',      icon: PartyPopper,   label: 'Festival',      superOnly: true },
      { to: '/first-purchase', icon: Sparkles,     label: '1st Purchase Offer', superOnly: true },
      { to: '/scratch-card',   icon: Ticket,       label: 'Scratch & Win', superOnly: true },
    ],
  },
  {
    label: 'Content',
    superOnly: true,
    items: [
      { to: '/splash-config', icon: Layers, label: 'Splash Screen', superOnly: true },
      { to: '/reviews',       icon: Star,   label: 'Reviews',       superOnly: true },
    ],
  },
  {
    label: 'System',
    superOnly: true,
    items: [
      { to: '/settings',          icon: Settings2,  label: 'Settings',         superOnly: true },
      { to: '/payment-methods',   icon: CreditCard, label: 'Payment Methods',  superOnly: true },
      { to: '/delivery-settings', icon: Truck,      label: 'Delivery',         superOnly: true },
      { to: '/return-settings',   icon: RotateCcw,  label: 'Returns',          superOnly: true },
      { to: '/app-update',        icon: Smartphone, label: 'App Update',       superOnly: true },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isSuperAdmin, hasPermission } = useAuthStore();
  const super_admin = isSuperAdmin();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-60 shrink-0 bg-[#fdf2f8] text-gray-700 flex flex-col h-screen lg:sticky lg:top-0 border-r border-pink-200/90 shadow-2xl lg:shadow-md transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Header */}
        <div className="px-5 py-4 border-b border-pink-200/70 shrink-0 flex items-center justify-between lg:justify-center">
          <img
            src={dunduLogo}
            alt="Dundu Store"
            className="h-11 sm:h-12 w-auto max-w-[170px] object-contain drop-shadow-xs"
          />
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:-pink-100 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {allNavGroups.map((group) => {
            if (group.superOnly && !super_admin) return null;
            const items = group.items.filter((n) => {
              if (n.superOnly && !super_admin) return false;
              if (n.permission && !hasPermission(n.permission)) return false;
              return true;
            });
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <p className={`px-5 mb-1.5 text-[10px] font-extrabold uppercase tracking-widest ${
                  group.label === 'Marketing' ? 'text-emerald-700' : 'text-pink-700'
                }`}>
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      onClick={() => onClose && onClose()}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 mx-2.5 ${
                          isActive
                            ? 'bg-pink-600 text-white font-semibold shadow-sm shadow-pink-600/25'
                            : 'text-gray-700 hover:text-pink-900 hover:bg-pink-100/70 font-medium'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="px-4 py-4 border-t border-pink-200/70 bg-pink-100/40">

          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-pink-800/80 truncate capitalize font-medium">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-red-600 transition-colors w-full font-medium cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
