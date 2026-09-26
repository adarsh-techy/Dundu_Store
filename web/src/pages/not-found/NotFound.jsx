import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-x py-24 md:py-36 text-center animate-fade-up">
      <p className="font-display text-[6rem] md:text-[9rem] leading-none text-gradient">404</p>
      <p className="font-display text-2xl text-ink mt-2">This page wandered off the runway.</p>
      <p className="text-sm text-muted mt-2">The link may be broken, or the page has been moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/"><Button pill>Go home</Button></Link>
        <Link to="/products"><Button pill variant="secondary">Browse products</Button></Link>
      </div>
    </div>
  );
}
