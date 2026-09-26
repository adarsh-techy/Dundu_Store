import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import CartDrawer from '../cart/CartDrawer';
import AnnouncementBar from './AnnouncementBar';
import BirthdayPopup from '../ui/BirthdayPopup';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
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
