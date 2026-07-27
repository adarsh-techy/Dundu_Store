import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { homeApi } from '../api';
import ProductCard from '../components/product/ProductCard';
import Spinner from '../components/ui/Spinner';

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: homeApi.getHomeData,
  });

  if (isLoading) return <Spinner />;

  const { banners = [], categories = [], new_arrivals = [], trending = [], offers = [] } = data?.data || {};

  return (
    <div>
      {/* Banner Slider */}
      {banners.length > 0 && (
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop
          className="w-full"
        >
          {banners.map((b) => {
            const inner = (
              <div className="relative aspect-[4/2.5] md:aspect-[16/5]" style={{ backgroundColor: '#222' }}>
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />

                {/* Smoky edge fades */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(to right, #0f0f0f 0%, transparent 22%, transparent 78%, #0f0f0f 100%)',
                }} />
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(to bottom, #0f0f0f 0%, transparent 18%, transparent 72%, #0f0f0f 100%)',
                }} />

                {b.badge_text && b.badge_active && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
                      style={{ backgroundColor: b.badge_color || '#e91e8c', color: '#fff', letterSpacing: '0.5px' }}>
                      {b.badge_text}
                    </span>
                  </div>
                )}
                {(b.title || b.subtitle) && (
                  <div className="absolute inset-0 flex flex-col justify-center px-12">
                    {b.title && <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">{b.title}</h2>}
                    {b.subtitle && <p className="mt-2 text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>{b.subtitle}</p>}
                    {b.link && (
                      <span className="mt-4 inline-block font-semibold px-6 py-2.5 rounded-full w-fit"
                        style={{ backgroundColor: '#e91e8c', color: '#fff' }}>
                        Shop Now
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
            return (
              <SwiperSlide key={b.id}>
                {b.link
                  ? <Link to={b.link} className="block">{inner}</Link>
                  : inner
                }
              </SwiperSlide>
            );
          })}
        </Swiper>
      )}

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">
        {/* New Arrivals */}
        <ProductSection title="New Arrivals" products={new_arrivals} viewAll="/products?new_arrival=true" />

        {/* Trending */}
        <ProductSection title="Trending Now " products={trending} viewAll="/products?featured=true" />

        {/* Offers */}
        {offers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <Link to="/products?offer=true" className="text-xl font-bold text-green-500 hover:underline">Exclusive Offers</Link>
              <Link to="/products?offer=true" className="text-sm font-medium hover:underline" style={{ color: '#e91e8c' }}>View all</Link>
            </div>
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#080a07', border: '1px solid #2de511' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {offers.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ProductSection({ title, products, viewAll }) {
  if (!products.length) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <Link to={viewAll} className="text-xl font-bold hover:underline" style={{ color: '#f5f5f5' }}>{title}</Link>
        <Link to={viewAll} className="text-sm font-medium hover:underline" style={{ color: '#e91e8c' }}>View all</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
