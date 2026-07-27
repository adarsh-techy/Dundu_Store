import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../cart/CartDrawer';
import AnnouncementBar from './AnnouncementBar';
import BirthdayPopup from '../ui/BirthdayPopup';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50">
        <AnnouncementBar />
        <Header />
      </div>
      <main className="flex-1 pt-2 md:pt-0">{children}</main>
      <Footer />
      <CartDrawer />
      <BirthdayPopup />
    </div>
  );
}
