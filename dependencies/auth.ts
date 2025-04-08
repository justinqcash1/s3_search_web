import { useState, useEffect, useCallback } from 'react';
import { useApi } from './api-hooks';

export interface AuthUser {
  authenticated: boolean;
  username?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser>({ authenticated: false });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchData: registerApi } = useApi();
  const { fetchData: loginApi } = useApi();
  const { fetchData: logoutApi } = useApi();
  const { fetchData: sessionApi } = useApi();

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await sessionApi({
        url: '/api/auth/session',
        method: 'GET'
      });

      setUser({
        authenticated: response.authenticated,
        username: response.username
      });
    } catch (err) {
      setUser({ authenticated: false });
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [sessionApi]);

  // Register a new user
  const register = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      await registerApi({
        url: '/api/auth/register',
        method: 'POST',
        body: { username, password }
      });

      // After registration, log the user in
      return login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [registerApi, login]);

  // Log in a user
  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await loginApi({
        url: '/api/auth/login',
        method: 'POST',
        body: { username, password }
      });

      setUser({
        authenticated: true,
        username: response.username
      });

      return true;
    } catch (err) {
      setUser({ authenticated: false });
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [loginApi]);

  // Log out a user
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await logoutApi({
        url: '/api/auth/logout',
        method: 'POST'
      });

      setUser({ authenticated: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [logoutApi]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    register,
    login,
    logout,
    checkAuth
  };
}
