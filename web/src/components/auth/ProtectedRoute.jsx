import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
