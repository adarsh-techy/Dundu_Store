import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import { ArrowRight, Sparkles, Gift, Star, Truck } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { homeApi, comboApi } from '../../../api';
import ProductCard from '../../../components/product/ProductCard';
import SectionHeader from '../../../components/ui/SectionHeader';
import { ProductGridSkeleton, Skeleton } from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import { imageUrl } from '../../../utils/image';
import { formatPrice } from '../../../utils/format';
import useAuthStore from '../../../store/auth.store';

export default function Home() {
  useDocumentTitle('');
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({ queryKey: ['home'], queryFn: homeApi.getHomeData });
  const { data: comboData } = useQuery({ queryKey: ['combos'], queryFn: comboApi.list, staleTime: 5 * 60 * 1000 });

  const { banners = [], categories = [], new_arrivals = [], trending = [], offers = [] } = data?.data || {};
  const combos = (comboData?.data?.combos || []).slice(0, 3);

  return (
    <div>
      {/* ── Hero ── */}
      {isLoading ? (
        <div className="container-x pt-4"><Skeleton className="aspect-[4/2.6] md:aspect-[16/6] rounded-3xl" /></div>
      ) : banners.length > 0 ? (
        <div className="container-x pt-3 md:pt-5">
          <Swiper modules={[Autoplay, Pagination, EffectFade]} effect="fade" autoplay={{ delay: 4500, disableOnInteraction: false }}
            pagination={{ clickable: true }} loop={banners.length > 1} className="rounded-3xl overflow-hidden">
            {banners.map((b) => {
              const inner = (
                <div className="relative aspect-[4/2.6] md:aspect-[16/6] bg-elevated">
                  <img src={imageUrl(b.image_url)} alt={b.title || ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
                  {b.badge_text && b.badge_active && (
                    <span className="absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg text-white"
                      style={{ backgroundColor: b.badge_color || '#e91e8c' }}>{b.badge_text}</span>
                  )}
                  {(b.title || b.subtitle) && (
                    <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-14 max-w-2xl">
                      {b.title && <h2 className="font-display text-3xl md:text-6xl text-white leading-[1.05] drop-shadow">{b.title}</h2>}
                      {b.subtitle && <p className="mt-2 md:mt-4 text-sm md:text-lg text-white/85">{b.subtitle}</p>}
                      {b.link && (
                        <span className="mt-4 md:mt-6 inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-full w-fit bg-white text-black text-sm">
                          Shop now <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
              return <SwiperSlide key={b.id}>{b.link ? <Link to={b.link} className="block">{inner}</Link> : inner}</SwiperSlide>;
            })}
          </Swiper>
        </div>
      ) : (
        <FallbackHero />
      )}

      <div className="container-x py-10 md:py-14 space-y-14 md:space-y-20">
        {/* ── Categories ── */}
        {categories.length > 0 && (
          <section>
            <SectionHeader eyebrow="Browse" title="Shop by category" to="/products" linkLabel="All products" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {categories.slice(0, 8).map((c, i) => (
                <Link key={c.id} to={`/products?category=${c.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border border-line bg-card ${i === 0 ? 'md:row-span-2 aspect-[4/5] md:aspect-auto' : 'aspect-[4/3] md:aspect-[5/3]'}`}>
                  {c.image_url ? (
                    <img src={imageUrl(c.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-card to-card" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-4 md:p-5 flex items-end justify-between">
                    <div>
                      <p className="font-display text-xl md:text-2xl text-white">{c.name}</p>
                      <p className="text-xs text-white/70 mt-0.5">Explore collection</p>
                    </div>
                    <span className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white group-hover:bg-primary transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── New arrivals ── */}
        <ProductSection eyebrow="Just landed" title="New arrivals" products={new_arrivals} loading={isLoading} to="/products?new_arrival=true" />

        {/* ── Promo band ── */}
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[#2a0b1c] via-[#160910] to-bg p-7 md:p-12">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div>
              <p className="eyebrow mb-3">Rewards</p>
              <h2 className="font-display text-3xl md:text-5xl text-ink leading-tight">Every order earns you points, gifts and free deliveries.</h2>
              <p className="mt-4 text-sm md:text-base text-ink-2 max-w-lg">
                Collect loyalty points on each purchase, spin the wheel for surprise coupons, refer friends for 30% off, and get free shipping on orders over the threshold.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={user ? '/loyalty-card' : '/signup'}><Button pill>{user ? 'View my rewards' : 'Create an account'}</Button></Link>
                <Link to="/help/faq"><Button pill variant="secondary">How it works</Button></Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Star, t: 'Loyalty points', d: '20 pts per ₹500' },
                { icon: Gift, t: 'Spin & Win', d: 'Surprise coupons' },
                { icon: Sparkles, t: 'Refer & Earn', d: '30% off for friends' },
                { icon: Truck, t: 'Free delivery', d: 'On bigger orders' },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="card p-4">
                  <Icon className="h-5 w-5 text-primary-soft" />
                  <p className="mt-3 text-sm font-semibold text-ink">{t}</p>
                  <p className="text-xs text-muted mt-0.5">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trending ── */}
        <ProductSection eyebrow="Popular right now" title="Trending" products={trending} loading={isLoading} to="/products?featured=true" />

        {/* ── Combos ── */}
        {combos.length > 0 && (
          <section>
            <SectionHeader eyebrow="Bundle & save" title="Combo offers" subtitle="Curated sets at one great price" to="/combos" />
            <div className="grid md:grid-cols-3 gap-4">
              {combos.map((c) => (
                <Link key={c.id} to={`/combos/${c.id}`} className="card card-hover overflow-hidden group">
                  <div className="aspect-[4/3] bg-elevated overflow-hidden">
                    <img src={imageUrl(c.image_url || c.slots?.[0]?.products?.[0]?.image)} alt={c.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">{(c.slots || []).map((s) => s.slot_label).join(' + ')}</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="font-bold text-success">{formatPrice(c.offer_price || c.price)}</span>
                      {c.offer_price && <span className="text-xs line-through text-faint">{formatPrice(c.price)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Offers ── */}
        {(isLoading || offers.length > 0) && (
          <section>
            <SectionHeader eyebrow="Limited time" title="Exclusive offers" to="/products?offer=true" />
            <div className="rounded-3xl p-4 md:p-6 border border-success/25 bg-gradient-to-b from-success/[0.06] to-transparent">
              {isLoading ? <ProductGridSkeleton count={4} /> : (
                <div className="product-grid">{offers.slice(0, 8).map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)}</div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function FallbackHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(233,30,140,0.28),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(255,107,157,0.14),transparent_50%)]" />
      <div className="container-x relative py-16 md:py-28 grid md:grid-cols-2 gap-10 items-center">
        <div className="animate-fade-up">
          <p className="eyebrow mb-4">New season · New you</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] text-ink">
            Fashion for <span className="text-gradient italic">every chapter</span> of life.
          </h1>
          <p className="mt-5 text-base md:text-lg text-ink-2 max-w-lg">
            Thoughtfully designed clothing for women, kids, newborns and expecting mothers — soft fabrics, honest prices, delivered to your door.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products"><Button size="lg" pill icon={ArrowRight}>Shop the collection</Button></Link>
            <Link to="/products?offer=true"><Button size="lg" pill variant="secondary">See offers</Button></Link>
          </div>
        </div>
        <div className="hidden md:grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '.1s' }}>
          {['Women', 'Kids', 'Newborn', 'Maternity'].map((t, i) => (
            <Link key={t} to={`/products?category=${t.toLowerCase()}`}
              className={`card card-hover flex items-end p-5 ${i % 2 ? 'translate-y-6' : ''} aspect-[4/5] bg-gradient-to-br from-primary/20 via-card to-card`}>
              <span className="font-display text-2xl text-ink">{t}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection({ eyebrow, title, products, loading, to }) {
  if (!loading && !products.length) return null;
  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={title} to={to} />
      {loading ? <ProductGridSkeleton count={4} /> : (
        <div className="product-grid">
          {products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
