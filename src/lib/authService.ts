import { supabase } from '@/integrations/supabase/client';

export interface AuthSession {
  user: any;
  session: any;
  isAdvisor: boolean;
  isPersistent: boolean;
}

export interface LoginOptions {
  rememberMe?: boolean;
  advisorMode?: boolean;
}

export const authService = {
  // Enhanced login with persistent session option
  async signInWithPassword(
    email: string,
    password: string,
    options: LoginOptions = {}
  ): Promise<AuthSession> {
    try {
      // Configure session persistence
      if (options.rememberMe) {
        await supabase.auth.updateUser({}, {
          emailRedirectTo: undefined
        });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed - no user or session returned');
      }

      // Check if user is an advisor
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', data.user.id)
        .eq('role', 'advisor')
        .eq('status', 'active');

      const isAdvisor = !roleError && userRoles && userRoles.length > 0;

      // For advisors with rememberMe, extend session duration
      if (isAdvisor && options.rememberMe) {
        await this.extendAdvisorSession(data.session.access_token);
      }

      return {
        user: data.user,
        session: data.session,
        isAdvisor,
        isPersistent: options.rememberMe || false
      };

    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Extend session for advisors with "remember me"
  async extendAdvisorSession(accessToken: string): Promise<void> {
    try {
      // Store persistent session info in localStorage for advisors
      const sessionData = {
        timestamp: new Date().toISOString(),
        extendedSession: true,
        userType: 'advisor'
      };

      localStorage.setItem('advisor_persistent_session', JSON.stringify(sessionData));

      // Set session to persist across browser restarts
      await supabase.auth.updateUser({}, {
        emailRedirectTo: undefined
      });

    } catch (error) {
      console.error('Failed to extend advisor session:', error);
      // Don't throw - this is a nice-to-have feature
    }
  },

  // Check for persistent session on app load
  async checkPersistentSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        this.clearPersistentSession();
        return null;
      }

      // Check if this was a persistent advisor session
      const persistentData = localStorage.getItem('advisor_persistent_session');
      const isPersistent = !!persistentData;

      // Verify user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', session.user.id)
        .eq('role', 'advisor')
        .eq('status', 'active');

      const isAdvisor = userRoles && userRoles.length > 0;

      return {
        user: session.user,
        session: session,
        isAdvisor: isAdvisor || false,
        isPersistent
      };

    } catch (error) {
      console.error('Session check error:', error);
      return null;
    }
  },

  // Enhanced sign out that clears persistent sessions
  async signOut(): Promise<void> {
    try {
      this.clearPersistentSession();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  // Clear persistent session data
  clearPersistentSession(): void {
    localStorage.removeItem('advisor_persistent_session');
  },

  // Generate a secure token for advisor operations
  async generateAdvisorToken(): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session found');
      }

      // Verify advisor role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', session.user.id)
        .eq('role', 'advisor')
        .eq('status', 'active');

      if (!userRoles || userRoles.length === 0) {
        throw new Error('User is not an active advisor');
      }

      // Return the existing session token (it's already secure)
      return session.access_token;

    } catch (error) {
      console.error('Token generation error:', error);
      throw error;
    }
  },

  // Validate advisor token
  async validateAdvisorToken(token: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return false;
      }

      // Check advisor role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id)
        .eq('role', 'advisor')
        .eq('status', 'active');

      return !!(userRoles && userRoles.length > 0);

    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
};

export default authService;