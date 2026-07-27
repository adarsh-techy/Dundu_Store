import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, Ticket,
  Image, BarChart2, UserCog, LogOut, ShoppingCart,
  TrendingUp, Star, Sparkles, CreditCard, Megaphone, Gift, Settings2, Heart, FlameKindling, MessageCircle, Cake, Smartphone, Layers, Activity, Bike,
} from 'lucide-react';
import useAuthStore from '../../store/auth.store';

const allNavGroups = [
  {
    label: 'Online',
    items: [
      { to: '/',                    icon: LayoutDashboard, label: 'Dashboard',       superOnly: true  },
      { to: '/loyalty',       icon: CreditCard,      label: 'Loyalty Cards',superOnly: false, permission: 'loyalty' },
      { to: '/reports/daily', icon: TrendingUp,      label: 'Sales Report', superOnly: false, permission: 'reports' },
    ],
  },
  {
    label: 'Catalog',
    superOnly: true,
    items: [
      { to: '/inventory',    icon: BarChart2, label: 'Inventory',    superOnly: true },
      { to: '/products',     icon: Package,  label: 'Products',     superOnly: true },
      { to: '/categories',   icon: Tag,      label: 'Categories',   superOnly: true },
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
    ],
  },
  {
    label: 'Marketing',
    superOnly: true,
    items: [
      { to: '/coupons',       icon: Ticket,        label: 'Coupons',       superOnly: true },
      { to: '/referral',      icon: Gift,          label: 'Referral',      superOnly: true },
      { to: '/banners',       icon: Image,         label: 'Banners',       superOnly: true },
      { to: '/announcements', icon: Megaphone,     label: 'Announcements', superOnly: true },
      { to: '/whatsapp',      icon: MessageCircle, label: 'WhatsApp',      superOnly: true },
      { to: '/birthdays',     icon: Cake,          label: 'Birthdays',     superOnly: true },
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
      { to: '/settings',    icon: Settings2,  label: 'Settings',   superOnly: true },
      { to: '/app-update',  icon: Smartphone, label: 'App Update', superOnly: true },
    ],
  },
];

export default function Sidebar() {
  const { user, logout, isSuperAdmin, hasPermission } = useAuthStore();
  const super_admin = isSuperAdmin();

  return (
    <aside className="w-60 shrink-0 bg-black text-gray-300 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800 shrink-0">
        <p className="text-xl font-bold text-pink-500">Dundu</p>
        <p className="text-xs text-gray-500 mt-0.5">Admin Panel · Online Store</p>
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
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-pink-600">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </div>
    </aside>
  );
}
