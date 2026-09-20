import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Bell, ShoppingCart, Heart, ShoppingBag, RotateCcw, Cake, CalendarDays, CheckCircle2,
} from 'lucide-react';
import { birthdayApi, orderApi, wishlistApi, cartApi } from '../../api';
import { allNavGroups } from './Sidebar';
import './TopBar.css';

/* Flat list of {to, label}, longest path first so a specific route like
   /reports/daily matches before a generic parent like /. Used to show the
   current section's name in the topbar when there's no birthday ticker to
   display, instead of leaving that space empty. */
const flatNavItems = allNavGroups
  .flatMap((g) => g.items)
  .sort((a, b) => b.to.length - a.to.length);

function getPageTitle(pathname) {
  const match = flatNavItems.find((item) =>
    item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`)
  );
  return match?.label || 'Dundu Online Admin';
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function daysBetween(dateStr) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const bday = new Date(dateStr);
  let next = new Date(thisYear, bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(thisYear + 1);
  return Math.round((next - today) / 86400000);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSecs = Math.floor((now - d) / 1000);

  if (diffSecs < 60) return 'Just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;

  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${timeStr}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
}

/* Pleasant Web Audio chime for new order */
function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (_) {}
}

/* ── main component ──────────────────────────────────────────────────────── */
export default function TopBar() {
  const now = useClock();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  // Dropdown visibility states
  const [notifOpen, setNotifOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);

  // Data states
  const [birthdays, setBirthdays] = useState([]);
  const [orderCount, setOrderCount] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  const [cartCount, setCartCount] = useState(null);
  const [recentCarts, setRecentCarts] = useState([]);

  const [wishlistCount, setWishlistCount] = useState(null);
  const [recentWishlists, setRecentWishlists] = useState([]);

  const [returnCount, setReturnCount] = useState(null);
  const [recentReturns, setRecentReturns] = useState([]);

  const [newOrderAlert, setNewOrderAlert] = useState(null);

  // Refs for outside click handling
  const notifRef = useRef(null);
  const ordersRef = useRef(null);
  const cartRef = useRef(null);
  const wishlistRef = useRef(null);
  const returnsRef = useRef(null);

  const lastKnownOrderIdRef = useRef(null);
  const isInitialOrderFetchRef = useRef(true);
  const alertTimerRef = useRef(null);

  /* ── 1. Fetch birthdays on mount ── */
  useEffect(() => {
    birthdayApi.getList()
      .then((r) => {
        const list = (r.data?.data || r.data || []);
        const upcoming = list
          .filter((u) => u.birthday)
          .map((u) => ({ ...u, daysLeft: daysBetween(u.birthday) }))
          .filter((u) => u.daysLeft <= 7)
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .slice(0, 10);
        setBirthdays(upcoming);
      })
      .catch(() => {});
  }, []);

  /* ── 2. Live Polling for Orders, Carts, Wishlists & Returns ── */
  const fetchLiveStats = async () => {
    // Orders
    try {
      const res = await orderApi.list({ limit: 6 });
      const orders = res.data?.data?.orders || res.data?.orders || [];
      const total = res.data?.data?.total ?? res.data?.total ?? orders.length;

      setRecentOrders(orders);
      setOrderCount(total);

      if (orders.length > 0) {
        const newestOrder = orders[0];
        if (isInitialOrderFetchRef.current) {
          lastKnownOrderIdRef.current = newestOrder.id;
          isInitialOrderFetchRef.current = false;
        } else if (lastKnownOrderIdRef.current && newestOrder.id !== lastKnownOrderIdRef.current) {
          // New order detected! Trigger popup toast + sound
          lastKnownOrderIdRef.current = newestOrder.id;
          setNewOrderAlert(newestOrder);
          playOrderChime();

          if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
          alertTimerRef.current = setTimeout(() => {
            setNewOrderAlert(null);
          }, 8000);
        }
      }
    } catch (_) {}

    // Carts
    try {
      const res = await cartApi.monitor({ limit: 6 });
      const carts = res.data?.data?.carts || res.data?.carts || [];
      const total = res.data?.data?.total ?? res.data?.total ?? carts.length;
      setRecentCarts(carts);
      setCartCount(total);
    } catch (_) {}

    // Wishlists
    try {
      const res = await wishlistApi.listAll({ limit: 6 });
      const wishlists = res.data?.data?.wishlists || res.data?.wishlists || [];
      const total = res.data?.data?.total ?? res.data?.total ?? wishlists.length;
      setRecentWishlists(wishlists);
      setWishlistCount(total);
    } catch (_) {}

    // Returns
    try {
      const res = await orderApi.getReturns({ limit: 6 });
      const returns = res.data?.data?.returns || res.data?.returns || [];
      const total = res.data?.data?.total ?? res.data?.total ?? returns.length;
      setRecentReturns(returns);
      setReturnCount(total);
    } catch (_) {}
  };

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 6000);
    return () => {
      clearInterval(interval);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  /* ── 3. Close all dropdowns on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (ordersRef.current && !ordersRef.current.contains(e.target)) setOrdersOpen(false);
      if (cartRef.current && !cartRef.current.contains(e.target)) setCartOpen(false);
      if (wishlistRef.current && !wishlistRef.current.contains(e.target)) setWishlistOpen(false);
      if (returnsRef.current && !returnsRef.current.contains(e.target)) setReturnsOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (setter) => {
    setNotifOpen(false);
    setOrdersOpen(false);
    setCartOpen(false);
    setWishlistOpen(false);
    setReturnsOpen(false);
    setter((prev) => !prev);
  };

  // Build ticker messages solely from birthdays
  const tickerMessages = birthdays.map((u) => {
    if (u.daysLeft === 0) {
      return { type: 'birthday', text: `🎂 TODAY IS ${u.name.toUpperCase()}'S BIRTHDAY! 🎉 Wish them a happy birthday!` };
    }
    return { type: 'birthday', text: `🎈 Upcoming Birthday: ${u.name} in ${u.daysLeft} day${u.daysLeft > 1 ? 's' : ''}` };
  });

  const doubled = tickerMessages.length > 0 ? [...tickerMessages, ...tickerMessages] : [];
  const bdayCount = birthdays.length;

  return (
    <>
      {/* Realtime New Order Popup Alert Toast */}
      {newOrderAlert && (
        <div className="new-order-toast">
          <div className="new-order-toast-header">
            <span className="new-order-toast-badge">🔔 NEW ORDER PLACED!</span>
            <button
              className="new-order-toast-close"
              onClick={() => setNewOrderAlert(null)}
            >
              ✕
            </button>
          </div>
          <p className="new-order-toast-body">
            Order <strong>#{newOrderAlert.orderNumber}</strong> was just placed by <strong>{newOrderAlert.customer}</strong> for <strong>₹{Number(newOrderAlert.amount).toLocaleString('en-IN')}</strong>.
          </p>
          <button
            className="new-order-toast-btn"
            onClick={() => {
              setNewOrderAlert(null);
              navigate(`/orders/${newOrderAlert.orderId}`);
            }}
          >
            View Order Details →
          </button>
        </div>
      )}

      <div className="topbar">
        {/* ── LEFT: Universal Back Button & Birthday Ticker ── */}
        <div className="topbar-left">
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              title="Go Back"
              className="topbar-back-btn"
              id="topbar-back-btn"
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>
          )}

          {/* Birthday notifications ticker — falls back to the current section's
              name so the bar never shows an empty void when there's nothing to alert on */}
          <div className="topbar-ticker-wrap">
            {doubled.length > 0 ? (
              <div className="topbar-ticker">
                <div className="topbar-ticker-inner">
                  {doubled.map((msg, i) => (
                    <span
                      key={i}
                      className="topbar-ticker-msg birthday"
                    >
                      {msg.text}
                      {i < doubled.length - 1 && (
                        <span className="topbar-ticker-sep">•</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="topbar-page-title">
                <span className="topbar-page-title-dot" />
                {pageTitle}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Date & Time + Action Icons ── */}
        <div className="topbar-right">
          {/* Live Date & Time */}
          <div className="topbar-datetime">
            <CalendarDays size={13} color="rgba(255,255,255,0.35)" />
            <span className="topbar-date">{formatDate(now)}</span>
            <span className="topbar-time">{formatTime(now)}</span>
          </div>

          <div className="topbar-divider" />

          {/* 1. Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              className={`topbar-icon-btn ${notifOpen ? 'active' : ''}`}
              onClick={() => toggleDropdown(setNotifOpen)}
              title="Notifications"
              id="topbar-notif-btn"
            >
              <Bell size={18} />
              {bdayCount > 0 && (
                <span className="topbar-badge birthday-badge">{bdayCount > 9 ? '9+' : bdayCount}</span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <span className="notif-dropdown-title">🔔 Notifications</span>
                  {bdayCount > 0 && (
                    <span className="notif-dropdown-count">
                      {bdayCount} Birthday{bdayCount !== 1 ? 's' : ''} Coming
                    </span>
                  )}
                </div>

                <div className="notif-list">
                  {birthdays.length === 0 ? (
                    <div className="notif-empty">
                      <Cake size={28} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                      No upcoming birthdays in the next 7 days
                    </div>
                  ) : (
                    birthdays.map((u, i) => (
                      <div key={i} className="notif-item">
                        <div className="notif-avatar">
                          {u.daysLeft === 0 ? '🎂' : '🎁'}
                        </div>
                        <div className="notif-body">
                          <div className="notif-name">{u.name || 'Customer'}</div>
                          <div className="notif-desc">
                            {u.phone && <span style={{ opacity: 0.7 }}>{u.phone} · </span>}
                            {u.daysLeft === 0
                              ? "Birthday is TODAY! 🎉"
                              : `Birthday in ${u.daysLeft} day${u.daysLeft === 1 ? '' : 's'}`}
                          </div>
                        </div>
                        <span className="notif-time">
                          {u.daysLeft === 0 ? 'Today' : `${u.daysLeft}d`}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="notif-dropdown-footer">
                  <NavLink
                    to="/birthdays"
                    className="notif-view-all"
                    onClick={() => setNotifOpen(false)}
                  >
                    View All Birthdays →
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          <div className="topbar-divider" />

          {/* 2. Cart icon with Dropdown Popup */}
          <div ref={cartRef} style={{ position: 'relative' }}>
            <button
              className={`topbar-icon-btn ${cartOpen ? 'active' : ''}`}
              onClick={() => toggleDropdown(setCartOpen)}
              title="Cart Monitor"
              id="topbar-cart-btn"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="topbar-badge" style={{ background: '#0284c7' }}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Cart Dropdown Popup */}
            {cartOpen && (
              <div className="orders-dropdown">
                <div className="notif-dropdown-header">
                  <span className="notif-dropdown-title">🛒 Active Customer Carts</span>
                  {cartCount > 0 && (
                    <span className="notif-dropdown-count" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                      {cartCount} Active
                    </span>
                  )}
                </div>

                <div className="notif-list">
                  {recentCarts.length === 0 ? (
                    <div className="notif-empty">
                      <ShoppingCart size={28} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                      No active customer carts right now
                    </div>
                  ) : (
                    recentCarts.map((c, i) => (
                      <NavLink
                        key={c.user_id || i}
                        to="/carts"
                        className="order-item-link"
                        onClick={() => setCartOpen(false)}
                      >
                        <div className="order-row-top">
                          <span className="order-customer">
                            {c.name || 'Customer'}
                          </span>
                          <span className="cart-items-count-badge">
                            🛍️ {c.items} item{c.items !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="order-row-bottom">
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {c.phone || '-'}
                          </span>
                          <span className="order-placed-time">
                            ⏱️ {formatRelativeTime(c.last_active)}
                          </span>
                        </div>
                      </NavLink>
                    ))
                  )}
                </div>

                <div className="notif-dropdown-footer">
                  <NavLink
                    to="/carts"
                    className="notif-view-all"
                    style={{ color: '#38bdf8' }}
                    onClick={() => setCartOpen(false)}
                  >
                    View Cart Monitor →
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          {/* 3. Wishlist icon with Dropdown Popup */}
          <div ref={wishlistRef} style={{ position: 'relative' }}>
            <button
              className={`topbar-icon-btn ${wishlistOpen ? 'active' : ''}`}
              onClick={() => toggleDropdown(setWishlistOpen)}
              title="Customer Wishlists"
              id="topbar-wishlist-btn"
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <span className="topbar-badge" style={{ background: '#db2777' }}>
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </button>

            {/* Wishlist Dropdown Popup */}
            {wishlistOpen && (
              <div className="orders-dropdown">
                <div className="notif-dropdown-header">
                  <span className="notif-dropdown-title">❤️ Recent Wishlists</span>
                  {wishlistCount > 0 && (
                    <span className="notif-dropdown-count" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6' }}>
                      {wishlistCount} Saved
                    </span>
                  )}
                </div>

                <div className="notif-list">
                  {recentWishlists.length === 0 ? (
                    <div className="notif-empty">
                      <Heart size={28} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                      No wishlisted items yet
                    </div>
                  ) : (
                    recentWishlists.map((w) => (
                      <NavLink
                        key={w.id}
                        to="/wishlists"
                        className="order-item-link"
                        onClick={() => setWishlistOpen(false)}
                      >
                        <div className="wishlist-item-content">
                          {w.image_url ? (
                            <img src={w.image_url} alt={w.product_name} className="wishlist-thumb" />
                          ) : (
                            <div className="wishlist-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                              🛍️
                            </div>
                          )}
                          <div className="wishlist-details">
                            <div className="wishlist-prod-name">
                              {w.product_name || 'Product'}
                            </div>
                            <div className="wishlist-sub-row">
                              <span className="wishlist-user-name">
                                by {w.user_name || 'Customer'}
                              </span>
                              <span className="wishlist-price">
                                ₹{Number(w.offer_price || w.price || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="order-placed-time" style={{ marginTop: '2px' }}>
                              ⏱️ {formatRelativeTime(w.created_at)}
                            </div>
                          </div>
                        </div>
                      </NavLink>
                    ))
                  )}
                </div>

                <div className="notif-dropdown-footer">
                  <NavLink
                    to="/wishlists"
                    className="notif-view-all"
                    style={{ color: '#ec4899' }}
                    onClick={() => setWishlistOpen(false)}
                  >
                    View All Wishlists →
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          {/* 4. Orders icon with Dropdown Popup & Placed Time */}
          <div ref={ordersRef} style={{ position: 'relative' }}>
            <button
              className={`topbar-icon-btn ${ordersOpen ? 'active' : ''}`}
              onClick={() => toggleDropdown(setOrdersOpen)}
              title="Recent Orders"
              id="topbar-orders-btn"
            >
              <ShoppingBag size={18} />
              {orderCount > 0 && (
                <span className="topbar-badge" style={{ background: '#059669' }}>
                  {orderCount > 99 ? '99+' : orderCount}
                </span>
              )}
            </button>

            {/* Orders Dropdown Popup */}
            {ordersOpen && (
              <div className="orders-dropdown">
                <div className="notif-dropdown-header">
                  <span className="notif-dropdown-title">📦 Recent Orders</span>
                  {orderCount > 0 && (
                    <span className="notif-dropdown-count" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                      {orderCount} Total
                    </span>
                  )}
                </div>

                <div className="notif-list">
                  {recentOrders.length === 0 ? (
                    <div className="notif-empty">
                      <ShoppingBag size={28} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                      No orders placed yet
                    </div>
                  ) : (
                    recentOrders.map((o) => (
                      <NavLink
                        key={o.id}
                        to={`/orders/${o.id}`}
                        className="order-item-link"
                        onClick={() => setOrdersOpen(false)}
                      >
                        <div className="order-row-top">
                          <span className="order-customer">
                            {o.user_name || 'Customer'}
                          </span>
                          <span className="order-amount">
                            ₹{Number(o.total_amount || o.total || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="order-row-bottom">
                          <span className={`order-status-pill ${o.status || 'pending'}`}>
                            {o.status || 'pending'}
                          </span>
                          <span className="order-placed-time">
                            ⏱️ {formatRelativeTime(o.created_at)}
                          </span>
                        </div>
                      </NavLink>
                    ))
                  )}
                </div>

                <div className="notif-dropdown-footer">
                  <NavLink
                    to="/orders"
                    className="notif-view-all"
                    style={{ color: '#10b981' }}
                    onClick={() => setOrdersOpen(false)}
                  >
                    View All Orders →
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          {/* 5. Returns icon with Dropdown Popup & Placed Time */}
          <div ref={returnsRef} style={{ position: 'relative' }}>
            <button
              className={`topbar-icon-btn ${returnsOpen ? 'active' : ''}`}
              onClick={() => toggleDropdown(setReturnsOpen)}
              title="Return Requests"
              id="topbar-returns-btn"
            >
              <RotateCcw size={18} />
              {returnCount > 0 && (
                <span className="topbar-badge" style={{ background: '#e11d48' }}>
                  {returnCount > 99 ? '99+' : returnCount}
                </span>
              )}
            </button>

            {/* Returns Dropdown Popup */}
            {returnsOpen && (
              <div className="orders-dropdown">
                <div className="notif-dropdown-header">
                  <span className="notif-dropdown-title">🔄 Return Requests</span>
                  {returnCount > 0 && (
                    <span className="notif-dropdown-count" style={{ background: 'rgba(225,29,72,0.15)', color: '#fb7185' }}>
                      {returnCount} Total
                    </span>
                  )}
                </div>

                <div className="notif-list">
                  {recentReturns.length === 0 ? (
                    <div className="notif-empty">
                      <RotateCcw size={28} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                      No return requests right now
                    </div>
                  ) : (
                    recentReturns.map((r) => (
                      <NavLink
                        key={r.id}
                        to="/returns"
                        className="order-item-link"
                        onClick={() => setReturnsOpen(false)}
                      >
                        <div className="order-row-top">
                          <span className="order-customer">
                            {r.user_name || 'Customer'} · <span style={{ opacity: 0.7 }}>#{r.order_number || r.order_id?.slice(0, 8)}</span>
                          </span>
                          <span className="order-amount" style={{ color: '#fb7185' }}>
                            ₹{Number(r.refund_amount || r.order_total || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="order-row-bottom">
                          <span className={`order-status-pill ${r.status || 'pending'}`}>
                            {r.status || 'pending'}
                          </span>
                          <span className="order-placed-time">
                            ⏱️ {formatRelativeTime(r.created_at)}
                          </span>
                        </div>
                        {r.reason && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Reason: {r.reason}
                          </div>
                        )}
                      </NavLink>
                    ))
                  )}
                </div>

                <div className="notif-dropdown-footer">
                  <NavLink
                    to="/returns"
                    className="notif-view-all"
                    style={{ color: '#fb7185' }}
                    onClick={() => setReturnsOpen(false)}
                  >
                    View All Returns →
                  </NavLink>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
