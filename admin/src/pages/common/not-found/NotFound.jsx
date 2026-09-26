import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, SearchX } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-600/15 border border-pink-600/30">
        <SearchX className="h-8 w-8 text-pink-500" />
      </div>
      <p className="text-7xl font-black leading-none text-pink-600">404</p>
      <h1 className="mt-3 text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-400">
        The admin page you opened does not exist, was moved, or you do not have access to it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </Link>
      </div>
    </div>
  );
}
