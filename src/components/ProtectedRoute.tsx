import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { FullPageSpinner } from './Spinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
