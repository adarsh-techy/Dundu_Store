import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0f0f0f', borderTop: '1px solid #2e2e2e', color: '#888', marginTop: '4rem' }}>
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <p className="text-2xl font-bold mb-3" style={{ color: '#e91e8c', letterSpacing: '0.15em' }}>DUNDU</p>
          <p className="text-sm leading-relaxed" style={{ color: '#666' }}>
            Fashion for women, kids, newborns and expecting mothers.
          </p>
        </div>
        <div>
          <p className="font-semibold mb-3" style={{ color: '#ddd' }}>Shop</p>
          <ul className="space-y-2 text-sm">
            {['Women', 'Kids', 'Newborn', 'Maternity', 'Offers'].map((c) => (
              <li key={c}>
                <Link to={`/products?category=${c.toLowerCase()}`}
                  style={{ color: '#777' }}
                  onMouseEnter={(e) => { e.target.style.color = '#e91e8c'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#777'; }}
                >{c}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-3" style={{ color: '#ddd' }}>Account</p>
          <ul className="space-y-2 text-sm">
            {[['My Orders', '/orders'], ['Wishlist', '/wishlist'], ['Profile', '/profile']].map(([l, to]) => (
              <li key={l}>
                <Link to={to}
                  style={{ color: '#777' }}
                  onMouseEnter={(e) => { e.target.style.color = '#e91e8c'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#777'; }}
                >{l}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-3" style={{ color: '#ddd' }}>Help</p>
          <ul className="space-y-2 text-sm">
            {['Track Order', 'Returns', 'Contact Us'].map((l) => (
              <li key={l}>
                <a href="#"
                  style={{ color: '#777' }}
                  onMouseEnter={(e) => { e.target.style.color = '#e91e8c'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#777'; }}
                >{l}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="text-center py-4 text-xs" style={{ borderTop: '1px solid #2e2e2e', color: '#555' }}>
        © {new Date().getFullYear()} Dundu. All rights reserved.
      </div>
    </footer>
  );
}
