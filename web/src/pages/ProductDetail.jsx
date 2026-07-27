import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Star, ImageOff } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import { productApi, userApi, orderApi, settingsApi } from '../api';
import { loadRazorpay, openRazorpayCheckout } from '../utils/razorpay';
import useCartStore from '../store/cart.store';
import useAuthStore from '../store/auth.store';
import useSettingsStore from '../store/settings.store';
import { formatPrice, discount, formatDate } from '../utils/format';
import ProductCard from '../components/product/ProductCard';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart, closeCart, isLoading: cartLoading } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const offerBadgeColor = useSettingsStore((s) => s.offerBadgeColor);
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState(null);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [thumbs, setThumbs] = useState(null);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [bnAddresses, setBnAddresses] = useState([]);
  const [bnSelectedAddress, setBnSelectedAddress] = useState(null);
  const [bnPaymentMethod, setBnPaymentMethod] = useState('online');
  const [bnLoading, setBnLoading] = useState(false);
  const [bnFetching, setBnFetching] = useState(false);
  const [bnCodEnabled, setBnCodEnabled] = useState(true);
  const [bnDeliveryCharge, setBnDeliveryCharge] = useState(50);
  const [bnFreeThreshold, setBnFreeThreshold] = useState(500);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!showBuyConfirm) return;
    setBnFetching(true);
    Promise.all([userApi.getAddresses(), settingsApi.getPayment()])
      .then(([addrRes, settingsRes]) => {
        const addrs = addrRes?.data?.addresses || [];
        setBnAddresses(addrs);
        setBnSelectedAddress(addrs.find((a) => a.is_default)?.id || addrs[0]?.id || null);
        const d = settingsRes?.data;
        const codOn = d?.cod_enabled !== false;
        setBnCodEnabled(codOn);
        if (!codOn) setBnPaymentMethod('online');
        if (d?.delivery_charge !== undefined) setBnDeliveryCharge(d.delivery_charge);
        if (d?.free_delivery_threshold !== undefined) setBnFreeThreshold(d.free_delivery_threshold);
      })
      .catch(() => { })
      .finally(() => setBnFetching(false));
  }, [showBuyConfirm]);


  const { data, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => productApi.getOne(id) });
  const { data: relatedData } = useQuery({ queryKey: ['related', id], queryFn: () => productApi.getRelated(id) });
  const { data: reviewData } = useQuery({ queryKey: ['reviews', id], queryFn: () => productApi.getReviews(id) });
  const { data: canReviewData } = useQuery({
    queryKey: ['can-review', id],
    queryFn: () => productApi.canReview(id),
    enabled: !!user,
  });
  const canReview = canReviewData?.data?.can_review ?? false;
  const existingReview = canReviewData?.data?.existing_review;

  if (isLoading) return <Spinner />;

  const product = data?.data?.product;
  if (!product) return <div className="text-center py-20" style={{ color: '#555' }}>Product not found</div>;

  const allImages = product.images || [];
  const variants = product.variants || [];
  const related = relatedData?.data?.products || [];
  const reviews = reviewData?.data?.reviews || [];
  const off = discount(product.price, product.offer_price);

  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const WOMEN_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
  const isWomens = product.gender === 'Female';
  const sizePool = selectedColor ? variants.filter((v) => v.color === selectedColor) : variants;
  const sizes = isWomens
    ? WOMEN_SIZES
    : [...new Set(sizePool.map((v) => v.size).filter(Boolean))];
  const sizeInStock = (sz) => {
    const pool = selectedColor
      ? variants.filter((v) => v.color === selectedColor && v.size === sz)
      : variants.filter((v) => v.size === sz);
    return pool.some((v) => (v.stock ?? 0) > 0);
  };

  const COLOR_HEX = {
    White: '#ffffff', Black: '#111111', Red: '#ef4444', Pink: '#ec4899', Rose: '#fb7185',
    Orange: '#f97316', Yellow: '#eab308', Green: '#22c55e', Mint: '#6ee7b7', Teal: '#14b8a6',
    Blue: '#3b82f6', 'Sky Blue': '#38bdf8', Navy: '#1e3a5f', Purple: '#a855f7', Lavender: '#c4b5fd',
    Maroon: '#7f1d1d', Brown: '#92400e', Beige: '#d4b896', Cream: '#fef9ef', Grey: '#9ca3af',
    Charcoal: '#374151', Gold: '#d97706', Silver: '#cbd5e1', Mustard: '#ca8a04', Coral: '#fb6f6f',
    Peach: '#ffcba4', Indigo: '#4f46e5', Olive: '#65a30d', Rust: '#c2410c', Ivory: '#fffff0',
  };

  // Show color-specific images when a color is selected, fallback to all images
  const colorImages = selectedColor
    ? allImages.filter((img) => img.color === selectedColor)
    : [];
  const images = colorImages.length > 0 ? colorImages : allImages;

  const handleAddToCart = async () => {
    if (!isAuthenticated()) { sessionStorage.setItem('auth_redirect', location.pathname); navigate('/login', { state: { from: location } }); return; }
    if (sizes.length > 0 && !selectedVariant) { toast.error('Please select a size'); return; }
    if (colors.length > 0 && !selectedColor) { toast.error('Please select a colour'); return; }
    try {
      await addToCart(product.id, selectedVariant?.id);
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) { sessionStorage.setItem('auth_redirect', location.pathname); navigate('/login', { state: { from: location } }); return; }
    setReviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('rating', reviewRating);
      fd.append('review', reviewText);
      if (reviewImage) {
        fd.append('image', reviewImage);
      }
      await productApi.addReview(id, fd);
      toast.success(existingReview ? 'Review updated!' : 'Review submitted!');
      setReviewImage(null);
      setReviewImagePreview(null);
      qc.invalidateQueries({ queryKey: ['reviews', id] });
      qc.invalidateQueries({ queryKey: ['can-review', id] });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not submit review');
    } finally { setReviewLoading(false); }
  };

  const handleBuyNow = () => {
    if (!isAuthenticated()) { sessionStorage.setItem('auth_redirect', location.pathname); navigate('/login', { state: { from: location } }); return; }
    if (sizes.length > 0 && !selectedVariant) {
      toast.error('Please select a size'); return;
    }
    if (colors.length > 0 && !selectedColor) {
      toast.error('Please select a colour'); return;
    }
    setShowBuyConfirm(true);
  };

  const placeBuyNowOrder = async () => {
    if (!bnSelectedAddress) { toast.error('Please select a delivery address'); return; }
    setBnLoading(true);
    try {
      const res = await orderApi.place({
        address_id: bnSelectedAddress,
        payment_method: bnPaymentMethod,
        buy_now_item: { product_id: product.id, variant_id: selectedVariant?.id || null, quantity: 1 },
      });
      const order = res.data.order;
      if (bnPaymentMethod === 'online' && res.data.razorpay) {
        const loaded = await loadRazorpay();
        if (!loaded) { toast.error('Failed to load payment gateway'); setBnLoading(false); return; }
        setShowBuyConfirm(false);
        openRazorpayCheckout({
          order: res.data.razorpay,
          user,
          onSuccess: async (paymentData) => {
            await orderApi.verifyPayment({ ...paymentData, order_id: order.id });
            navigate(`/orders/${order.id}?success=true`);
          },
          onError: () => toast.error('Payment failed. Please try again.'),
        });
        setBnLoading(false);
        return;
      }
      setShowBuyConfirm(false);
      navigate(`/orders/${order.id}?success=true`);
    } catch (e) {
      toast.error(e.message || 'Failed to place order');
      setBnLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated()) { sessionStorage.setItem('auth_redirect', location.pathname); navigate('/login', { state: { from: location } }); return; }
    try {
      const res = await userApi.toggleWishlist(product.id);
      toast.success(res.data.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch { toast.error('Something went wrong'); }
  };

  return (
    <div className="max-w-7xl mx-auto md:px-4 md:py-8 pt-3 md:pt-8">
      <div className="grid md:grid-cols-2 md:gap-10">

        {/* ── Images ── */}
        <div>
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center mx-3 md:mx-0 rounded-2xl"
              style={{ aspectRatio: '1/1', backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
              <ImageOff style={{ width: 32, height: 32, marginBottom: 8, color: '#444' }} />
              <p style={{ color: '#555', fontSize: 12 }}>No image available</p>
            </div>
          ) : (
            <>
              {/* Mobile — native CSS scroll-snap, no Swiper */}
              <div className="md:hidden" style={{ position: 'relative' }}>
                <div
                  key={`m-${selectedColor || 'all'}`}
                  style={{
                    display: 'flex',
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                  }}
                  className="scrollbar-none"
                >
                  {images.map((img, i) => (
                    <div
                      key={img.id || i}
                      style={{
                        flex: '0 0 100%',
                        scrollSnapAlign: 'start',
                        aspectRatio: '4/5',
                        backgroundColor: '#111',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={img.url}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ))}
                </div>
                {images.length > 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      backdropFilter: 'blur(4px)',
                      pointerEvents: 'none',
                    }}
                  >
                    {images.length} photos
                  </span>
                )}
              </div>

              {/* Desktop */}
              <div className="hidden md:block">
                <Swiper
                  key={`d-${selectedColor || 'all'}`}
                  modules={[Thumbs, Navigation, Pagination]}
                  {...(thumbs ? { thumbs: { swiper: thumbs } } : {})}
                  navigation
                  pagination={{ clickable: true }}
                  style={{ backgroundColor: '#1a1a1a' }}
                  className="product-swiper rounded-2xl overflow-hidden"
                >
                  {images.map((img, i) => (
                    <SwiperSlide key={img.id || i}>
                      <div style={{ aspectRatio: '3/4' }}>
                        <img src={img.url} alt={product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                {images.length > 1 && (
                  <div className="mt-3">
                    <Swiper onSwiper={setThumbs} modules={[Thumbs]} slidesPerView={4} spaceBetween={8}
                      watchSlidesProgress className="!h-20" key={`t-${selectedColor || 'all'}`}>
                      {images.map((img, i) => (
                        <SwiperSlide key={img.id || i}>
                          <div className="h-full rounded-lg overflow-hidden cursor-pointer" style={{ backgroundColor: '#222' }}>
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                          </div>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Info ── */}
        <div className="space-y-3 md:space-y-5 px-3 pt-3 pb-2 md:px-0 md:py-0">

          {/* Name + rating */}
          <div>
            <p className="text-[11px] font-medium mb-0.5 uppercase tracking-wide" style={{ color: '#e91e8c' }}>
              {product.brand_name || product.category_name}
            </p>
            <h1 className="text-base md:text-2xl font-bold leading-snug" style={{ color: '#f5f5f5' }}>
              {product.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="flex text-xs" style={{ color: '#facc15' }}>
                {'★'.repeat(Math.round(product.avg_rating || 0))}{'☆'.repeat(5 - Math.round(product.avg_rating || 0))}
              </span>
              <span className="text-[11px]" style={{ color: '#666' }}>({reviews.length})</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl md:text-3xl font-bold" style={{ color: product.offer_price ? '#22c55e' : '#f5f5f5' }}>
              {formatPrice(product.offer_price || product.price)}
            </span>
            {product.offer_price && (
              <>
                <span className="text-sm line-through" style={{ color: '#555' }}>{formatPrice(product.price)}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ color: offerBadgeColor, backgroundColor: '#1a0a12' }}>
                  {off}% off
                </span>
              </>
            )}
          </div>

          {/* Size */}
          {sizes.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#aaa' }}>Size</p>
              <div className="flex gap-1.5 flex-wrap">
                {sizes.map((s) => {
                  const v = variants.find((x) => x.size === s && (selectedColor ? x.color === selectedColor : true) && (x.stock ?? 0) > 0);
                  const active = selectedVariant?.size === s;
                  const inStock = sizeInStock(s);
                  return (
                    <button key={s}
                      onClick={() => inStock && setSelectedVariant(v || null)}
                      disabled={!inStock}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                      style={active
                        ? { border: '1.5px solid #e91e8c', backgroundColor: '#1a0a12', color: '#e91e8c' }
                        : inStock
                          ? { border: '1px solid #2e2e2e', color: '#999', backgroundColor: 'transparent', cursor: 'pointer' }
                          : { border: '1px solid #1a1a1a', color: '#333', backgroundColor: 'transparent', textDecoration: 'line-through', cursor: 'not-allowed', opacity: 0.45 }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color */}
          {colors.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#aaa' }}>
                Color{selectedColor ? <span className="normal-case font-normal ml-1" style={{ color: '#e91e8c' }}>· {selectedColor}</span> : ''}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {colors.map((c) => {
                  const v = variants.find((x) => x.color === c && (!selectedVariant?.size || x.size === selectedVariant?.size));
                  const active = selectedColor === c;
                  const hasColorImages = allImages.some((img) => img.color === c);
                  return (
                    <button key={c}
                      onClick={() => {
                        const nextColor = active ? null : c;
                        setThumbs(null);
                        setSelectedColor(nextColor);
                        // keep size if it's available in the new color, else clear
                        if (selectedVariant) {
                          const kept = variants.find((x) => x.color === nextColor && x.size === selectedVariant.size && x.stock > 0);
                          setSelectedVariant(kept || null);
                        }
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={active
                        ? { border: '1.5px solid #e91e8c', backgroundColor: '#1a0a12', color: '#e91e8c' }
                        : { border: '1px solid #2e2e2e', color: '#999', backgroundColor: 'transparent' }}>
                      <span className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: COLOR_HEX[c] || '#888' }} />
                      {c}
                      {hasColorImages && (
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#e91e8c' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock badge */}
          <div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: product.stock > 0 ? '#052e16' : '#2d1515',
                color: product.stock > 0 ? '#4ade80' : '#f87171',
                border: `1px solid ${product.stock > 0 ? '#166534' : '#7f1d1d'}`,
              }}>
              {product.stock > 0 ? `✓ In Stock (${product.stock})` : '✕ Out of Stock'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleBuyNow} size="sm" className="flex-1" disabled={product.stock === 0}
              style={{ backgroundColor: '#f86809', color: '#f4eff2', border: '1.5px solid #e96208' }}>
              Buy Now
            </Button>
            <Button onClick={handleAddToCart} loading={cartLoading} size="sm" className="flex-1 bg-blue-600 text-white border-none hover:bg-blue-700" disabled={product.stock === 0}>
              <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
            </Button>
            <Button onClick={handleWishlist} variant="outline" size="sm" className="px-3">
              <Heart className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Trust + Return Policy */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: '🔍', title: 'Checked 5 Times', desc: 'Quality-checked before packing' },
                { icon: '🎥', title: 'Video Proof', desc: 'We record a video before packing' },
                { icon: '📦', title: 'Safe Packaging', desc: 'Packed securely for safe delivery' },
                { icon: '🤝', title: "We're With You", desc: 'Support before & after delivery' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-1.5 rounded-lg p-2"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                  <span className="text-base shrink-0 leading-none mt-0.5">{icon}</span>
                  <div>
                    <p className="text-[11px] font-bold leading-tight" style={{ color: '#e5e5e5' }}>{title}</p>
                    <p className="text-[10px] mt-0.5 leading-snug" style={{ color: '#777' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ef4444' }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#450a0a' }}>
                <span className="text-sm">↩️</span>
                <p className="text-xs font-bold" style={{ color: '#fca5a5' }}>Return Policy</p>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}>48 hr window</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2" style={{ backgroundColor: '#1c0a0a' }}>
                {[
                  { icon: '🕐', rule: 'Submit within 24 hrs', detail: 'Request within 24 hrs of delivery' },
                  { icon: '📦', rule: 'Return within 48 hrs', detail: 'Send item back within 48 hrs' },
                  { icon: '🏷️', rule: 'Original condition', detail: 'Tags & packaging must be intact' },
                  { icon: '📱', rule: 'Easy to request', detail: 'My Orders → Request Return' },
                ].map(({ icon, rule, detail }) => (
                  <div key={rule} className="flex items-start gap-1.5 rounded-lg p-2"
                    style={{ backgroundColor: '#2d0f0f', border: '1px solid #5a1e1e' }}>
                    <span className="text-sm shrink-0 leading-none mt-0.5">{icon}</span>
                    <div>
                      <p className="text-[11px] font-bold leading-tight" style={{ color: '#fca5a5' }}>{rule}</p>
                      <p className="text-[10px] mt-0.5 leading-snug" style={{ color: '#9a6060' }}>{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 text-center" style={{ backgroundColor: '#2d0f0f', borderTop: '1px solid #5a1e1e' }}>
                <p className="text-[10px]" style={{ color: '#fca5a5' }}>
                  Returns for defects or wrong items only — <span style={{ color: '#fff', fontWeight: 600 }}>continuous unboxing video is mandatory</span>
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pt-3" style={{ borderTop: '1px solid #1e1e1e' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#aaa' }}>Description</p>
              <p className="text-xs leading-relaxed" style={{ color: '#888' }}>{product.description}</p>
            </div>
          )}

          {/* Details grid */}
          {[['Material', product.material], ['Type', product.type], ['Gender', product.gender], ['Age Group', product.age_group]].some(([, v]) => v) && (
            <div className="pt-3 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid #1e1e1e' }}>
              {[['Material', product.material], ['Type', product.type], ['Gender', product.gender], ['Age Group', product.age_group]]
                .filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: '#111', border: '1px solid #1e1e1e' }}>
                    <p className="text-[10px] uppercase tracking-wide mb-0.5 text-pink-900">{k}</p>
                    <p className="text-xs font-medium truncate" style={{ color: '#ccc' }}>{v}</p>
                  </div>
                ))}
            </div>
          )}

        </div>
      </div>

      {/* Return Policy */}
      <div className="mt-4 mx-3 md:mx-0 rounded-xl overflow-hidden" style={{ border: '1px solid #ef4444' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#450a0a' }}>
          <span style={{ fontSize: 16 }}>↩️</span>
          <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>Return Policy</p>
          <span className="ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}>Defects &amp; wrong items only</span>
        </div>
        <div className="px-4 py-3 space-y-2" style={{ backgroundColor: '#1c0a0a' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 18 }}>🕐</span>
            <div>
              <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>Submit return request within 24 hours</p>
              <p className="text-xs mt-0.5" style={{ color: '#9a6060' }}>You must raise a return request within 24 hours of delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-3" style={{ borderTop: '1px solid #3a1010', paddingTop: 8 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <div>
              <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>Send item back within 48 hours</p>
              <p className="text-xs mt-0.5" style={{ color: '#9a6060' }}>Item must be returned in original condition with tags intact</p>
            </div>
          </div>
          <div className="flex items-center gap-3" style={{ borderTop: '1px solid #3a1010', paddingTop: 8 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <div>
              <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>How to request</p>
              <p className="text-xs mt-0.5" style={{ color: '#9a6060' }}>Go to My Orders → select order → tap Request Return</p>
            </div>
          </div>
          <div className="flex items-center gap-3" style={{ borderTop: '1px solid #3a1010', paddingTop: 8 }}>
            <span style={{ fontSize: 18 }}>🎥</span>
            <div>
              <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>Continuous Unboxing Video Required</p>
              <p className="text-xs mt-0.5" style={{ color: '#9a6060' }}>You must record a continuous, uncut unboxing video starting from package opening for return approval.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-5 md:mt-10 px-3 md:px-0 pb-4">
        <div className="flex items-center gap-2 mb-3 md:mb-6">
          <h2 className="text-sm md:text-xl font-bold text-yellow-400" >Reviews</h2>
          {reviews.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#1a1a1a', color: '#888', border: '1px solid #2e2e2e' }}>
              {reviews.length}
            </span>
          )}
        </div>

        {/* Write Review Form */}
        {!user ? (
          <div className="rounded-xl p-4 mb-6 flex items-center justify-between"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <p className="text-xs" style={{ color: '#888' }}>Sign in to leave a review</p>
            <Button size="sm" onClick={() => { sessionStorage.setItem('auth_redirect', location.pathname); navigate('/login', { state: { from: location } }); }}>Sign In</Button>
          </div>
        ) : !canReview ? (
          <div className="rounded-xl p-4 mb-6 flex items-center gap-2"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <ShoppingBag className="h-4 w-4 shrink-0" style={{ color: '#555' }} />
            <p className="text-xs" style={{ color: '#888' }}>
              Only customers who have <span style={{ color: '#ddd' }}>purchased and received</span> this product can leave a review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="rounded-xl p-4 mb-6"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#ddd' }}>
              {existingReview ? 'Update your review' : 'Write a Review'}
            </p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button"
                  onClick={() => setReviewRating(s)}
                  onMouseEnter={() => setReviewHover(s)}
                  onMouseLeave={() => setReviewHover(0)}
                  className="transition-transform hover:scale-110">
                  <Star className="h-5 w-5 md:h-7 md:w-7"
                    style={{
                      fill: s <= (reviewHover || reviewRating) ? '#facc15' : 'transparent',
                      color: s <= (reviewHover || reviewRating) ? '#facc15' : '#444',
                    }} />
                </button>
              ))}
              <span className="ml-1.5 text-xs self-center" style={{ color: '#666' }}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewHover || reviewRating]}
              </span>
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-xs md:text-sm resize-none outline-none transition-colors"
              style={{ backgroundColor: '#222', border: '1px solid #2e2e2e', color: '#f5f5f5' }}
              onFocus={(e) => (e.target.style.borderColor = '#e91e8c')}
              onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                  style={{ backgroundColor: '#222', border: '1px solid #2e2e2e', color: '#aaa' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2a2a2a'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#222'; e.currentTarget.style.color = '#aaa'; }}>
                  📷 Attach Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReviewImage(file);
                        setReviewImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                {reviewImagePreview && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-800">
                    <img src={reviewImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setReviewImage(null);
                        setReviewImagePreview(null);
                      }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] font-bold text-red-500 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <Button type="submit" loading={reviewLoading} size="sm">
                {existingReview ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </form>
        )}

        {/* Review List */}
        {reviews.length === 0 ? (
          <p className="text-xs" style={{ color: '#555' }}>No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl p-3 md:p-4" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                    style={{ backgroundColor: '#1a0a12', color: '#e91e8c' }}>
                    {r.user_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium" style={{ color: '#ddd' }}>{r.user_name}</p>
                    <p className="text-[10px]" style={{ color: '#666' }}>{formatDate(r.created_at)}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3 w-3"
                        style={{ fill: s <= r.rating ? '#facc15' : 'transparent', color: s <= r.rating ? '#facc15' : '#333' }} />
                    ))}
                  </div>
                </div>
                {r.review && <p className="text-xs" style={{ color: '#888' }}>{r.review}</p>}
                {r.image_url && (
                  <div className="mt-2.5 max-w-[120px] rounded-lg overflow-hidden border border-zinc-800">
                    <img
                      src={r.image_url}
                      alt="Review attachment"
                      className="w-full h-auto max-h-[120px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(r.image_url, '_blank')}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-6 md:mt-10 px-3 md:px-0">
          <h2 className="text-base md:text-xl font-bold mb-3 md:mb-5 text-violet-500">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}


      {/* Buy Now Modal */}
      {showBuyConfirm && (() => {
        const bnPrice = product.offer_price || product.price;
        const bnShipping = bnPrice >= bnFreeThreshold ? 0 : bnDeliveryCharge;
        const bnTotal = bnPrice + bnShipping;
        const selAddr = bnAddresses.find((a) => a.id === bnSelectedAddress);
        return (
          <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
            onClick={() => !bnLoading && setShowBuyConfirm(false)}
          >
            <div
              className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#141414', border: '1px solid #2e2e2e', maxHeight: '92vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid #222' }}>
                <p className="text-base font-bold text-center" style={{ color: '#f5f5f5' }}>Confirm Order</p>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Product */}
                <div className="flex gap-3 items-center rounded-xl p-3" style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a' }}>
                  <div className="w-14 h-18 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: '#2a2a2a', width: 56, height: 72 }}>
                    {images[0]?.url || product.primary_image || product.image
                      ? <img src={images[0]?.url || product.primary_image || product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👗</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: '#f0f0f0' }}>{product.name}</p>
                    {(selectedVariant?.size || selectedColor) && (
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                        {[selectedVariant?.size, selectedColor].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-bold" style={{ color: product.offer_price ? '#22c55e' : '#f5f5f5' }}>
                        {formatPrice(bnPrice)}
                      </span>
                      {product.offer_price && (
                        <span className="text-xs line-through" style={{ color: '#555' }}>{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {bnFetching ? (
                  <div className="flex justify-center py-6">
                    <Spinner />
                  </div>
                ) : bnAddresses.length === 0 ? (
                  <div className="rounded-xl p-4 text-center space-y-2" style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a' }}>
                    <p className="text-sm" style={{ color: '#888' }}>No delivery address found.</p>
                    <button
                      onClick={() => { setShowBuyConfirm(false); navigate('/profile', { state: { addAddress: true } }); }}
                      className="text-sm font-semibold underline" style={{ color: '#e91e8c' }}
                    >
                      Add address in Profile
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Delivery Address */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#888' }}>Delivery Address</p>
                      <div className="space-y-2">
                        {bnAddresses.map((a) => (
                          <label
                            key={a.id}
                            className="flex gap-3 p-3 rounded-xl cursor-pointer"
                            style={bnSelectedAddress === a.id
                              ? { border: '1.5px solid #e91e8c', backgroundColor: '#1a0a12' }
                              : { border: '1px solid #2a2a2a', backgroundColor: '#1e1e1e' }}
                          >
                            <input
                              type="radio" name="bn-address" value={a.id}
                              checked={bnSelectedAddress === a.id}
                              onChange={() => setBnSelectedAddress(a.id)}
                              style={{ accentColor: '#e91e8c', marginTop: 2 }}
                            />
                            <div className="text-xs">
                              <p className="font-semibold" style={{ color: '#ddd' }}>{a.name} · {a.phone}</p>
                              <p style={{ color: '#666' }}>{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ''}</p>
                              <p style={{ color: '#666' }}>{a.city}, {a.state} — {a.pincode}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#888' }}>Payment Method</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBnPaymentMethod('online')}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                          style={bnPaymentMethod === 'online'
                            ? { border: '1.5px solid #e91e8c', backgroundColor: '#1a0a12', color: '#e91e8c' }
                            : { border: '1px solid #2a2a2a', backgroundColor: '#1e1e1e', color: '#888' }}
                        >
                          Online Payment
                        </button>
                        {bnCodEnabled && (
                          <button
                            onClick={() => setBnPaymentMethod('cod')}
                            className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                            style={bnPaymentMethod === 'cod'
                              ? { border: '1.5px solid #e91e8c', backgroundColor: '#1a0a12', color: '#e91e8c' }
                              : { border: '1px solid #2a2a2a', backgroundColor: '#1e1e1e', color: '#888' }}
                          >
                            Cash on Delivery
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Price Summary */}
                    <div className="rounded-xl p-3 space-y-1.5 text-sm" style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a' }}>
                      <div className="flex justify-between" style={{ color: '#888' }}>
                        <span>Price</span><span>{formatPrice(bnPrice)}</span>
                      </div>
                      <div className="flex justify-between" style={bnShipping === 0 ? { color: '#888', textDecoration: 'line-through' } : { color: '#888' }}>
                        <span>Delivery</span>
                        <span>{bnShipping === 0 ? formatPrice(bnDeliveryCharge) : formatPrice(bnShipping)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1" style={{ borderTop: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                        <span>Total</span>
                        <span className="flex items-center gap-2">
                          {bnShipping === 0 && (
                            <span style={{ color: '#888', textDecoration: 'line-through red', fontWeight: 'normal', fontSize: '13px' }}>
                              {formatPrice(bnTotal + bnDeliveryCharge)}
                            </span>
                          )}
                          <span style={{ color: '#e91e8c' }}>{formatPrice(bnTotal)}</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              {!bnFetching && (
                <div className="px-5 pb-6 pt-1 flex gap-3">
                  <button
                    onClick={() => setShowBuyConfirm(false)}
                    disabled={bnLoading}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                    style={{ border: '1px solid #2e2e2e', color: '#777', backgroundColor: 'transparent' }}
                  >
                    Cancel
                  </button>
                  {bnAddresses.length > 0 && (
                    <button
                      onClick={placeBuyNowOrder}
                      disabled={bnLoading || !bnSelectedAddress}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold transition-opacity"
                      style={{ backgroundColor: '#f86809', color: '#fff', border: 'none', opacity: (bnLoading || !bnSelectedAddress) ? 0.6 : 1 }}
                    >
                      {bnLoading ? 'Placing…' : bnPaymentMethod === 'online' ? 'Pay Now' : 'Confirm Order'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
