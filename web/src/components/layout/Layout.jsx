import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import CartDrawer from '../cart/CartDrawer';
import AnnouncementBar from './AnnouncementBar';
import BirthdayPopup from '../ui/BirthdayPopup';
import { categoryApi } from '../../api';
import useThemeStore, { isGenzyMatch, applyCategoryTheme, clearCategoryTheme } from '../../store/theme.store';

export default function Layout({ children }) {
  const location = useLocation();
  const overrideCategory = useThemeStore((s) => s.overrideCategory);

  const { data: catData } = useQuery({
    queryKey: ['categories-nav'],
    queryFn: categoryApi.list,
    staleTime: 5 * 60 * 1000,
  });
  const categories = catData?.data?.categories || [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category') || '';

    // Check if matching a category with custom theme enabled
    let activeCat = null;
    if (categoryParam) {
      activeCat = categories.find((c) => c.slug === categoryParam);
    } else if (overrideCategory) {
      if (typeof overrideCategory === 'object') {
        activeCat = overrideCategory;
      } else {
        activeCat = categories.find((c) => c.slug === overrideCategory || c.name === overrideCategory);
      }
    }

    if (activeCat && activeCat.theme_enabled && activeCat.theme_color) {
      applyCategoryTheme(activeCat.theme_color, activeCat.theme_bg_color);
    } else if (isGenzyMatch(categoryParam) || isGenzyMatch(typeof overrideCategory === 'string' ? overrideCategory : overrideCategory?.slug)) {
      applyCategoryTheme('#22c55e', '#040d04');
    } else {
      clearCategoryTheme();
    }
  }, [location.pathname, location.search, overrideCategory, categories]);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-primary focus:text-white focus:px-3 focus:py-2 focus:rounded-lg">
        Skip to content
      </a>
      <AnnouncementBar />
      <div className="sticky top-0 z-50">
        <Header />
      </div>
      <main id="main" className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <CartDrawer />
      <BirthdayPopup />
    </div>
  );
}
