import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, ShoppingBag, ShoppingCart, Heart, RotateCcw,
  TrendingUp, UserPlus, Phone, Cake, ExternalLink,
} from 'lucide-react';
import { insightsApi } from '../../../api';
import { formatPrice } from '../../../utils/format';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value ?? '—'}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TierBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function UserRow({ rank, user, right, navigate }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-gray-100 text-gray-500">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{user.phone || user.email || 'No contact'}</p>
      </div>
      <div className="text-right shrink-0">{right}</div>
      {navigate && (
        <button
          onClick={() => navigate(`/users/${user.id}`)}
          className="ml-1 p-1 rounded-lg text-gray-300 hover:text-pink-500 hover:bg-pink-50 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children, count }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {count !== undefined && (
          <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Top {count}
          </span>
        )}
      </div>
      <div className="px-5 pb-3">{children}</div>
    </div>
  );
}

export default function UserInsights() {
  const navigate = useNavigate();
  const [topTab, setTopTab] = useState('orders');

  const { data, isLoading } = useQuery({
    queryKey: ['insights-users'],
    queryFn: insightsApi.getUsers,
    staleTime: 5 * 60_000,
  });

  const d = data?.data;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = d?.stats || {};
  const tiers = d?.activity_tiers || {};
  const tierTotal = (tiers.inactive || 0) + (tiers.low || 0) + (tiers.medium || 0) + (tiers.high || 0);
  const topList = topTab === 'orders' ? (d?.top_by_orders || []) : (d?.top_by_spend || []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Insights</h1>
          <p className="text-xs text-gray-500">Behaviour analytics for all registered customers</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users}    label="Total Users"     value={stats.total_users}    color="bg-indigo-500" />
        <StatCard icon={UserPlus} label="New This Month"  value={stats.new_this_month} sub={`${stats.new_this_week ?? 0} this week`} color="bg-pink-500" />
        <StatCard icon={ShoppingBag} label="Have Ordered" value={(d?.top_by_orders?.length || 0) > 0 ? undefined : '—'}
          color="bg-emerald-500"
          sub="see Top Customers below" />
        <StatCard icon={Cake}   label="Shared Birthday"  value={stats.with_birthday}  color="bg-orange-400" />
        <StatCard icon={Phone}  label="Phone on File"    value={stats.with_phone}      color="bg-sky-500" />
      </div>

      {/* Activity tiers + Recent users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Activity Tiers */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-800">Customer Activity Tiers</p>
            <span className="ml-auto text-xs text-gray-400">by order count</span>
          </div>
          <div className="space-y-3">
            <TierBar label="Never Ordered (Inactive)" value={tiers.inactive || 0} total={tierTotal} color="bg-gray-300" />
            <TierBar label="1–2 Orders (Occasional)"  value={tiers.low     || 0} total={tierTotal} color="bg-blue-400" />
            <TierBar label="3–5 Orders (Regular)"     value={tiers.medium  || 0} total={tierTotal} color="bg-indigo-500" />
            <TierBar label="5+ Orders (Loyal)"        value={tiers.high    || 0} total={tierTotal} color="bg-pink-500" />
          </div>
        </div>

        {/* Recent Signups */}
        <Section title="Recent Signups" icon={UserPlus} iconColor="bg-pink-500">
          {(d?.recent_users || []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No users yet</p>
          ) : (d?.recent_users || []).map((u, i) => (
            <UserRow
              key={u.id}
              rank={i + 1}
              user={u}
              navigate={navigate}
              right={
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-700">{u.order_count} orders</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </p>
                </div>
              }
            />
          ))}
        </Section>
      </div>

      {/* Top Customers */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-bold text-gray-800">Top Customers</p>
          <div className="ml-auto flex rounded-xl overflow-hidden border border-gray-200">
            {[['orders', 'By Orders'], ['spend', 'By Spend']].map(([key, lbl]) => (
              <button
                key={key}
                onClick={() => setTopTab(key)}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${topTab === key ? 'bg-pink-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-3">
          {topList.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No order data</p>
          ) : topList.map((u, i) => (
            <UserRow
              key={u.id}
              rank={i + 1}
              user={u}
              navigate={navigate}
              right={
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-800">{formatPrice(u.total_spend)}</p>
                  <p className="text-[10px] text-gray-400">{u.order_count} orders</p>
                </div>
              }
            />
          ))}
        </div>
      </div>

      {/* Cart, Wishlist, Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Cart Hoarders */}
        <Section title="Cart Abandoners" icon={ShoppingCart} iconColor="bg-amber-500" count={10}>
          {(d?.cart_hoarders || []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No active carts</p>
          ) : (d?.cart_hoarders || []).map((u, i) => (
            <UserRow
              key={u.id}
              rank={i + 1}
              user={u}
              navigate={navigate}
              right={
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-600">{formatPrice(u.cart_value)}</p>
                  <p className="text-[10px] text-gray-400">{u.cart_items} items</p>
                </div>
              }
            />
          ))}
        </Section>

        {/* Wishlist Champions */}
        <Section title="Wishlist Champions" icon={Heart} iconColor="bg-rose-500" count={10}>
          {(d?.wishlist_hoarders || []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No wishlists yet</p>
          ) : (d?.wishlist_hoarders || []).map((u, i) => (
            <UserRow
              key={u.id}
              rank={i + 1}
              user={u}
              navigate={navigate}
              right={
                <span className="text-xs font-bold text-rose-500">{u.wishlist_items} ♥</span>
              }
            />
          ))}
        </Section>

        {/* Frequent Returners */}
        <Section title="Frequent Returners" icon={RotateCcw} iconColor="bg-red-500" count={10}>
          {(d?.returners || []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No returns on record</p>
          ) : (d?.returners || []).map((u, i) => (
            <UserRow
              key={u.id}
              rank={i + 1}
              user={u}
              navigate={navigate}
              right={
                <span className="text-xs font-bold text-red-500">{u.return_count} returns</span>
              }
            />
          ))}
        </Section>
      </div>
    </div>
  );
}
