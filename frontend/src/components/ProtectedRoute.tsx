import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checkAuth, _hasHydrated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    const verifyAuth = async () => {
      // Wait for store to hydrate from localStorage
      if (!_hasHydrated) {
        return;
      }

      // Only check once
      if (hasChecked.current) {
        setIsChecking(false);
        return;
      }

      hasChecked.current = true;

      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('access_token');

      if (storedToken) {
        // Validate token with server
        await checkAuth();
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [_hasHydrated, checkAuth]);

  // Show loading state while checking authentication or hydrating
  if (!_hasHydrated || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
