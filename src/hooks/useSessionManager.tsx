import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/authService';
import { supabase } from '@/integrations/supabase/client';

export interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any;
  userRoles: string[];
  isAdvisor: boolean;
  isPersistentSession: boolean;
}

export const useSessionManager = () => {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    userRoles: [],
    isAdvisor: false,
    isPersistentSession: false
  });

  useEffect(() => {
    initializeSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session) {
          await handleSignIn(session);
        } else if (event === 'SIGNED_OUT') {
          handleSignOut();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          await refreshUserData(session);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initializeSession = async () => {
    try {
      setSessionState(prev => ({ ...prev, isLoading: true }));

      // Check for existing session (including persistent ones)
      const authSession = await authService.checkPersistentSession();

      if (authSession) {
        await handleSignIn(authSession.session, authSession.isPersistent);
      } else {
        setSessionState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          userRoles: [],
          isAdvisor: false,
          isPersistentSession: false
        });
      }
    } catch (error) {
      console.error('Session initialization error:', error);
      setSessionState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSignIn = async (session: any, isPersistent = false) => {
    try {
      if (!session?.user) {
        throw new Error('Invalid session data');
      }

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', session.user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      const activeRoles = (userRoles || [])
        .filter(role => role.status === 'active')
        .map(role => role.role);

      const isAdvisor = activeRoles.includes('advisor');

      setSessionState({
        isLoading: false,
        isAuthenticated: true,
        user: session.user,
        userRoles: activeRoles,
        isAdvisor,
        isPersistentSession: isPersistent
      });

      // Auto-redirect based on user type and current location
      redirectUser(activeRoles, window.location.pathname);

    } catch (error) {
      console.error('Sign in handling error:', error);
      setSessionState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSignOut = () => {
    authService.clearPersistentSession();
    setSessionState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      userRoles: [],
      isAdvisor: false,
      isPersistentSession: false
    });

    // Redirect to auth page
    navigate('/auth');
  };

  const refreshUserData = async (session: any) => {
    // Refresh user roles without changing loading state
    try {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', session.user.id);

      const activeRoles = (userRoles || [])
        .filter(role => role.status === 'active')
        .map(role => role.role);

      setSessionState(prev => ({
        ...prev,
        userRoles: activeRoles,
        isAdvisor: activeRoles.includes('advisor')
      }));

    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const redirectUser = (roles: string[], currentPath: string) => {
    // Don't redirect if user is already on a valid page
    const validPaths = ['/dashboard', '/profile', '/planner', '/transcript', '/messages'];
    const adminPaths = ['/admin', '/pending-advisors'];
    const authPaths = ['/auth', '/role-selection'];

    // If user is on auth pages and is authenticated, redirect to dashboard
    if (authPaths.includes(currentPath)) {
      navigate('/dashboard');
      return;
    }

    // If user is on admin pages but not admin, redirect to dashboard
    if (adminPaths.includes(currentPath) && !roles.includes('admin')) {
      navigate('/dashboard');
      return;
    }

    // If user has no roles, redirect to role selection
    if (roles.length === 0) {
      navigate('/role-selection');
      return;
    }

    // If user is not on a valid path, redirect to dashboard
    if (!validPaths.includes(currentPath) && !adminPaths.includes(currentPath)) {
      navigate('/dashboard');
      return;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      // The onAuthStateChange listener will handle the state update
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out locally even if server call fails
      handleSignOut();
    }
  };

  const generateAdvisorToken = async (): Promise<string> => {
    if (!sessionState.isAdvisor) {
      throw new Error('User is not an advisor');
    }

    return await authService.generateAdvisorToken();
  };

  return {
    ...sessionState,
    signOut,
    generateAdvisorToken,
    refreshSession: initializeSession
  };
};

// Route Guard Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/auth'
}) => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, userRoles } = useSessionManager();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate(redirectTo);
        return;
      }

      if (requiredRole && !userRoles.includes(requiredRole)) {
        navigate('/dashboard'); // Redirect to dashboard if role not sufficient
        return;
      }
    }
  }, [isLoading, isAuthenticated, userRoles, requiredRole, navigate, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (requiredRole && !userRoles.includes(requiredRole))) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};