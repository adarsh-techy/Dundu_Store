import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, ShoppingBag, Star, ImageOff, Zap, Truck, ShieldCheck, RotateCcw, PackageCheck, Camera, Minus, Plus, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import toast from 'react-hot-toast';
import { productApi, userApi, settingsApi } from '../../../api';
import useCartStore from '../../../store/cart.store';
import useAuthStore from '../../../store/auth.store';
import { formatPrice, discount, formatDate, pluralize } from '../../../utils/format';
import { imageUrl } from '../../../utils/image';
import ProductCard from '../../../components/product/ProductCard';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import SectionHeader from '../../../components/ui/SectionHeader';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import useThemeStore, { isGenzyMatch } from '../../../store/theme.store';

const COLOR_HEX = {
  white: '#ffffff', black: '#111111', red: '#ef4444', pink: '#ec4899', rose: '#fb7185',
  orange: '#f97316', yellow: '#eab308', green: '#22c55e', mint: '#6ee7b7', teal: '#14b8a6',
  blue: '#3b82f6', 'sky blue': '#38bdf8', navy: '#1e3a5f', purple: '#a855f7', lavender: '#c4b5fd',
  maroon: '#7f1d1d', brown: '#92400e', beige: '#d4b896', cream: '#fef9ef', grey: '#9ca3af', gray: '#9ca3af',
  charcoal: '#374151', gold: '#d97706', silver: '#cbd5e1', mustard: '#ca8a04', coral: '#fb6f6f',
  peach: '#ffcba4', indigo: '#4f46e5', olive: '#65a30d', rust: '#c2410c', ivory: '#fffff0',
};
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const TRUST = [
  { icon: PackageCheck, title: 'Quality checked', text: 'Every piece inspected before packing' },
  { icon: Truck, title: 'Fast delivery', text: 'Tracked shipping across India' },
  { icon: RotateCcw, title: '48-hour returns', text: 'Easy returns for defects or wrong items' },
  { icon: ShieldCheck, title: 'Secure payment', text: 'UPI, cards, wallet or cash on delivery' },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { addToCart, isLoading: cartLoading } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [thumbs, setThumbs] = useState(null);
  const [wishlisted, setWishlisted] = useState(null);
  const [descOpen, setDescOpen] = useState(true);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => productApi.getOne(id) });
  const { data: relatedData } = useQuery({ queryKey: ['related', id], queryFn: () => productApi.getRelated(id) });
  const { data: reviewData } = useQuery({ queryKey: ['reviews', id], queryFn: () => productApi.getReviews(id) });
  const { data: canReviewData } = useQuery({ queryKey: ['can-review', id], queryFn: () => productApi.canReview(id), enabled: !!user });
  const { data: settings } = useQuery({ queryKey: ['payment-settings'], queryFn: settingsApi.getPayment, staleTime: 5 * 60 * 1000 });

  const product = data?.data?.product;
  useDocumentTitle(product?.name || 'Product');

  const setOverrideCategory = useThemeStore((s) => s.setOverrideCategory);
  useEffect(() => {
    if (product) {
      const isGenzy = isGenzyMatch(product.category_slug, product.category_name);
      if (isGenzy) setOverrideCategory(product.category_slug || product.category_name);
      else setOverrideCategory(null);
    }
    return () => setOverrideCategory(null);
  }, [product, setOverrideCategory]);

  const variants = product?.variants || [];
  const allImages = product?.images || [];
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color).filter(Boolean))], [variants]);
  const sizes = useMemo(() => {
    const pool = selectedColor ? variants.filter((v) => v.color === selectedColor) : variants;
    const list = [...new Set(pool.map((v) => v.size).filter(Boolean))];
    return list.sort((a, b) => (SIZE_ORDER.indexOf(a) === -1 ? 99 : SIZE_ORDER.indexOf(a)) - (SIZE_ORDER.indexOf(b) === -1 ? 99 : SIZE_ORDER.indexOf(b)));
  }, [variants, selectedColor]);

  if (isLoading) return <Spinner />;
  if (!product) return <EmptyState emoji="🧵" title="Product not found" description="It may have been removed or is no longer available." action="Browse products" to="/products" />;

  const reviews = reviewData?.data?.reviews || [];
  const related = relatedData?.data?.products || [];
  const canReview = canReviewData?.data?.can_review ?? false;
  const existingReview = canReviewData?.data?.existing_review;
  const off = discount(product.price, product.offer_price);
  const rating = Number(product.avg_rating) || 0;
  const isWishlisted = wishlisted ?? !!product.is_wishlisted;
  const freeThreshold = Number(settings?.data?.free_delivery_threshold ?? 500);
  const deliveryText = settings?.data?.delivery_estimate_text;

  const colorImages = selectedColor ? allImages.filter((img) => (img.color || '').toLowerCase() === selectedColor.toLowerCase()) : [];
  const images = colorImages.length ? colorImages : allImages;

  const sizeInStock = (sz) => variants.some((v) => v.size === sz && (!selectedColor || v.color === selectedColor) && (v.stock ?? 0) > 0);
  const colorInStock = (c) => variants.some((v) => v.color === c && (!selectedSize || v.size === selectedSize) && (v.stock ?? 0) > 0);
  const selectedVariant = variants.find((v) => (!sizes.length || v.size === selectedSize) && (!colors.length || v.color === selectedColor)) || null;
  const hasVariants = sizes.length > 0 || colors.length > 0;
  const availableStock = hasVariants ? (selectedVariant?.stock ?? null) : product.stock;
  const soldOut = Number(product.stock) <= 0;

  const requireLogin = () => {
    sessionStorage.setItem('auth_redirect', location.pathname);
    navigate('/login', { state: { from: location } });
  };

  const validateSelection = () => {
    if (sizes.length > 0 && !selectedSize) { toast.error('Please choose a size'); return false; }
    if (colors.length > 0 && !selectedColor) { toast.error('Please choose a colour'); return false; }
    if (hasVariants && !selectedVariant) { toast.error('That combination is unavailable'); return false; }
    return true;
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated()) return requireLogin();
    if (!validateSelection()) return;
    try {
      await addToCart(product.id, selectedVariant?.id, qty);
      toast.success('Added to your bag');
    } catch (e) { toast.error(e?.message || 'Could not add to bag'); }
  };

  const handleBuyNow = () => {
    if (!isAuthenticated()) return requireLogin();
    if (!validateSelection()) return;
    navigate('/checkout', {
      state: {
        buyNow: {
          product_id: product.id, variant_id: selectedVariant?.id || null, quantity: qty,
          name: product.name, price: product.price, offer_price: product.offer_price,
          image: images[0]?.url || product.primary_image, size: selectedVariant?.size || null, color: selectedVariant?.color || null,
        },
      },
    });
  };

  const handleWishlist = async () => {
    if (!isAuthenticated()) return requireLogin();
    try {
      const res = await userApi.toggleWishlist(product.id);
      setWishlisted(!!res.data.wishlisted);
      toast.success(res.data.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch { toast.error('Something went wrong'); }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) return requireLogin();
    setReviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('rating', reviewRating);
      fd.append('review', reviewText);
      if (reviewImage) fd.append('image', reviewImage);
      await productApi.addReview(id, fd);
      toast.success(existingReview ? 'Review updated' : 'Thanks for your review!');
      setReviewImage(null); setReviewImagePreview(null); setReviewText('');
      qc.invalidateQueries({ queryKey: ['reviews', id] });
      qc.invalidateQueries({ queryKey: ['can-review', id] });
    } catch (err) {
      toast.error(err?.message || 'Could not submit review');
    } finally { setReviewLoading(false); }
  };

  const details = [['Material', product.material], ['Type', product.type], ['Gender', product.gender], ['Age group', product.age_group], ['Brand', product.brand_name], ['SKU', product.sku || product.product_code]].filter(([, v]) => v);

  return (
    <div className="container-x py-4 md:py-8">
      <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-xs text-muted mb-5">
        <Link to="/" className="hover:text-ink">Home</Link><ChevronRight className="h-3 w-3 text-faint" />
        <Link to="/products" className="hover:text-ink">Shop</Link><ChevronRight className="h-3 w-3 text-faint" />
        {product.category_name && <><Link to={`/products?category=${product.category_slug || ''}`} className="hover:text-ink">{product.category_name}</Link><ChevronRight className="h-3 w-3 text-faint" /></>}
        <span className="text-ink-2 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-[1.1fr_1fr] lg:grid-cols-[1.2fr_1fr] gap-6 md:gap-10 lg:gap-14">
        {/* ── Gallery ── */}
        <div className="md:sticky md:top-32 h-fit min-w-0">
          {images.length === 0 ? (
            <div className="aspect-[3/4] rounded-3xl bg-card border border-line flex flex-col items-center justify-center text-faint">
              <ImageOff className="h-8 w-8 mb-2" /><p className="text-xs">No image available</p>
            </div>
          ) : (
            <>
              {/* Mobile: scroll-snap strip */}
              <div className="md:hidden relative -mx-4">
                <div key={`m-${selectedColor || 'all'}`} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
                  {images.map((im, i) => (
                    <div key={im.id || i} className="shrink-0 w-full snap-start aspect-[4/5] bg-elevated">
                      <img src={imageUrl(im.url)} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" loading={i ? 'lazy' : 'eager'} />
                    </div>
                  ))}
                </div>
                {images.length > 1 && <span className="absolute top-3 right-7 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur">{images.length} photos</span>}
                {off > 0 && <span className="absolute top-3 left-7 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary text-white">{off}% OFF</span>}
              </div>

              {/* Desktop: swiper + thumbs */}
              <div className="hidden md:block">
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-line bg-elevated">
                  <Swiper key={`d-${selectedColor || 'all'}`} modules={[Thumbs, Navigation, Pagination]} {...(thumbs && !thumbs.destroyed ? { thumbs: { swiper: thumbs } } : {})}
                    navigation pagination={{ clickable: true }} className="product-swiper absolute inset-0">
                    {images.map((im, i) => (
                      <SwiperSlide key={im.id || i}>
                        <img src={imageUrl(im.url)} alt={`${product.name} ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  {off > 0 && <span className="absolute top-4 left-4 z-10 text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-white shadow">{off}% OFF</span>}
                </div>
                {images.length > 1 && (
                  <Swiper key={`t-${selectedColor || 'all'}`} onSwiper={setThumbs} modules={[Thumbs]} slidesPerView={5} spaceBetween={10} watchSlidesProgress className="mt-3 !h-24">
                    {images.map((im, i) => (
                      <SwiperSlide key={im.id || i}>
                        <div className="h-full rounded-xl overflow-hidden border border-line bg-elevated cursor-pointer opacity-70 hover:opacity-100 [.swiper-slide-thumb-active_&]:opacity-100 [.swiper-slide-thumb-active_&]:border-primary transition">
                          <img src={imageUrl(im.url)} alt="" className="w-full h-full object-cover" />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Info ── */}
        <div className="space-y-6 animate-fade-up min-w-0">
          <div>
            <p className="eyebrow mb-2">{product.brand_name || product.category_name}</p>
            <h1 className="font-display text-2xl md:text-[2.1rem] leading-tight text-ink">{product.name}</h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'fill-warning text-warning' : 'text-faint'}`} />)}
                </div>
                <span className="text-xs text-muted">{rating > 0 ? rating.toFixed(1) : 'No ratings'} · {pluralize(reviews.length, 'review')}</span>
              </div>
              {soldOut ? <Badge color="red" dot>Out of stock</Badge>
                : Number(product.stock) <= 5 ? <Badge color="yellow" dot>Only {product.stock} left</Badge>
                : <Badge color="green" dot>In stock</Badge>}
            </div>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-3xl md:text-4xl font-bold ${product.offer_price ? 'text-success' : 'text-ink'}`}>{formatPrice(product.offer_price || product.price)}</span>
            {product.offer_price && (
              <>
                <span className="text-base line-through text-faint">{formatPrice(product.price)}</span>
                <span className="text-sm font-bold text-primary-soft">Save {formatPrice(product.price - product.offer_price)}</span>
              </>
            )}
            <span className="w-full text-xs text-muted">Inclusive of all taxes{Number(product.offer_price || product.price) >= freeThreshold ? ' · Free delivery' : ''}</span>
          </div>

          {colors.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted mb-2">
                COLOUR {selectedColor && <span className="text-primary-soft normal-case font-medium">· {selectedColor}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const active = selectedColor === c;
                  const inStock = colorInStock(c);
                  return (
                    <button key={c} onClick={() => { setThumbs(null); setSelectedColor(active ? null : c); }} disabled={!inStock}
                      className={`chip capitalize ${active ? 'is-active' : ''} ${!inStock ? 'opacity-40 line-through' : ''}`} aria-pressed={active}>
                      <span className="w-3.5 h-3.5 rounded-full border border-white/25" style={{ backgroundColor: COLOR_HEX[c.toLowerCase()] || '#888' }} />{c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold tracking-wide text-muted">SIZE {selectedSize && <span className="text-primary-soft font-medium">· {selectedSize}</span>}</p>
                <Link to="/help/faq" className="text-xs text-muted hover:text-ink underline-offset-2 hover:underline">Size guide</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const active = selectedSize === s;
                  const inStock = sizeInStock(s);
                  return (
                    <button key={s} onClick={() => setSelectedSize(active ? null : s)} disabled={!inStock} aria-pressed={active}
                      className={`min-w-12 h-11 px-3 rounded-xl text-sm font-semibold border transition-all ${active ? 'border-primary bg-primary/10 text-primary-soft' : inStock ? 'border-line text-ink-2 hover:border-line-strong hover:text-ink' : 'border-line/50 text-faint line-through cursor-not-allowed'}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {hasVariants && selectedVariant && (selectedVariant.stock ?? 0) <= 5 && <p className="text-xs text-warning mt-2">Only {selectedVariant.stock} left in this size</p>}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-full border border-line bg-card h-12">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-12 w-11 flex items-center justify-center text-muted hover:text-ink" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-semibold text-ink">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(availableStock ? Math.min(99, availableStock) : 99, q + 1))} className="h-12 w-11 flex items-center justify-center text-muted hover:text-ink" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={handleWishlist} aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={isWishlisted}
              className="h-12 px-4 rounded-full border border-line bg-card flex items-center gap-2 text-sm font-semibold text-ink-2 hover:border-primary hover:text-ink transition-colors">
              <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-primary text-primary' : ''}`} />
              <span className="hidden sm:inline">{isWishlisted ? 'Saved' : 'Save'}</span>
            </button>
          </div>
          <div className="grid gap-3">
            <Button onClick={handleAddToCart} loading={cartLoading} size="lg" pill fullWidth disabled={soldOut} icon={ShoppingBag}>Add to bag</Button>
            <Button onClick={handleBuyNow} size="lg" pill variant="white" fullWidth disabled={soldOut} icon={Zap}>Buy now</Button>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <Truck className="h-5 w-5 text-primary-soft shrink-0" />
            <p className="text-sm text-ink-2">
              {deliveryText ? <>Delivery in <span className="font-semibold text-ink">{deliveryText}</span>. </> : null}
              Free shipping on orders over {formatPrice(freeThreshold)}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3">
                <Icon className="h-4 w-4 text-primary-soft shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold text-ink">{title}</p><p className="text-[11px] text-muted mt-0.5 leading-snug">{text}</p></div>
              </div>
            ))}
          </div>

          {product.description && (
            <div className="border-t border-line pt-5">
              <button onClick={() => setDescOpen((o) => !o)} className="flex items-center justify-between w-full" aria-expanded={descOpen}>
                <p className="text-sm font-semibold text-ink">Description</p>
                <ChevronRight className={`h-4 w-4 text-muted transition-transform ${descOpen ? 'rotate-90' : ''}`} />
              </button>
              {descOpen && <p className="mt-3 text-sm leading-relaxed text-ink-2 whitespace-pre-line animate-fade-in">{product.description}</p>}
            </div>
          )}

          {details.length > 0 && (
            <div className="border-t border-line pt-5">
              <p className="text-sm font-semibold text-ink mb-3">Details</p>
              <dl className="grid grid-cols-2 gap-2.5">
                {details.map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-surface border border-line px-3 py-2.5">
                    <dt className="text-[10.5px] uppercase tracking-wider text-faint">{k}</dt>
                    <dd className="text-sm text-ink-2 mt-0.5 truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary-soft" />Return policy</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted list-disc list-inside">
              <li>Request a return within 48 hours of delivery from My Orders.</li>
              <li>Items must be unused with tags and packaging intact.</li>
              <li>Returns are accepted for defects or wrong items; a continuous unboxing video helps us approve faster.</li>
            </ul>
            <Link to="/help/shipping-returns" className="inline-block mt-2 text-xs font-semibold text-primary-soft hover:underline">Read the full policy</Link>
          </div>
        </div>
      </div>

      {/* ── Reviews ── */}
      <section className="mt-14 md:mt-20 grid lg:grid-cols-[320px_1fr] gap-8">
        <div>
          <SectionHeader eyebrow="What customers say" title="Reviews" />
          <div className="card p-5 -mt-2">
            <div className="flex items-end gap-3">
              <span className="font-display text-5xl text-ink leading-none">{rating > 0 ? rating.toFixed(1) : '–'}</span>
              <div className="pb-1">
                <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'fill-warning text-warning' : 'text-faint'}`} />)}</div>
                <p className="text-xs text-muted mt-1">{pluralize(reviews.length, 'review')}</p>
              </div>
            </div>
            {reviews.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = reviews.filter((r) => Math.round(r.rating) === n).length;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-3">{n}</span><Star className="h-3 w-3 fill-warning text-warning" />
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-warning" style={{ width: `${(count / reviews.length) * 100}%` }} /></div>
                      <span className="w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!user ? (
            <div className="card p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted">Log in to leave a review.</p>
              <Button size="sm" pill onClick={requireLogin}>Log in</Button>
            </div>
          ) : !canReview ? (
            <div className="card p-4 flex items-center gap-3 text-sm text-muted">
              <ShoppingBag className="h-4 w-4 shrink-0 text-faint" />Only customers who have received this product can review it.
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="card p-5 space-y-3">
              <p className="text-sm font-semibold text-ink">{existingReview ? 'Update your review' : 'Write a review'}</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setReviewRating(s)} onMouseEnter={() => setReviewHover(s)} onMouseLeave={() => setReviewHover(0)} className="transition-transform hover:scale-110" aria-label={`${s} stars`}>
                    <Star className={`h-7 w-7 ${s <= (reviewHover || reviewRating) ? 'fill-warning text-warning' : 'text-faint'}`} />
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted">{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][reviewHover || reviewRating]}</span>
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share what you loved, how it fit, and anything others should know…" rows={3} className="input resize-none" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="chip cursor-pointer"><Camera className="h-3.5 w-3.5" />Add photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setReviewImage(f); setReviewImagePreview(URL.createObjectURL(f)); } }} />
                  </label>
                  {reviewImagePreview && (
                    <button type="button" onClick={() => { setReviewImage(null); setReviewImagePreview(null); }} className="relative h-10 w-10 rounded-lg overflow-hidden border border-line group" aria-label="Remove photo">
                      <img src={reviewImagePreview} alt="" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-black/60 text-[9px] font-bold text-danger opacity-0 group-hover:opacity-100 flex items-center justify-center">Remove</span>
                    </button>
                  )}
                </div>
                <Button type="submit" size="sm" pill loading={reviewLoading}>{existingReview ? 'Update review' : 'Submit review'}</Button>
              </div>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">No reviews yet — be the first to share your experience.</p>
          ) : reviews.map((r) => (
            <article key={r.id} className="card p-4 animate-fade-up">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary-soft font-bold text-sm flex items-center justify-center">{(r.user_name || 'U')[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{r.user_name || 'Customer'}</p>
                  <p className="text-[11px] text-muted">{formatDate(r.created_at)}</p>
                </div>
                <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-warning text-warning' : 'text-faint'}`} />)}</div>
              </div>
              {r.review && <p className="mt-3 text-sm text-ink-2 leading-relaxed">{r.review}</p>}
              {r.image_url && (
                <a href={imageUrl(r.image_url)} target="_blank" rel="noreferrer" className="mt-3 inline-block w-24 h-24 rounded-xl overflow-hidden border border-line">
                  <img src={imageUrl(r.image_url)} alt="Customer photo" className="w-full h-full object-cover hover:opacity-90" />
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14 md:mt-20">
          <SectionHeader eyebrow="Complete the look" title="You may also like" to={product.category_slug ? `/products?category=${product.category_slug}` : '/products'} />
          <div className="product-grid">{related.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
