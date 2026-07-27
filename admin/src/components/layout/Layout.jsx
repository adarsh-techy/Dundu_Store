import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/auth.store';
import Spinner from '../ui/Spinner';

export default function Layout({ children }) {
  const { token, isLoading } = useAuthStore();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
