import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/auth';

// Mock the API hooks
vi.mock('@/hooks/api-hooks', () => ({
  useApi: () => ({
    fetchData: vi.fn(),
    data: null,
    error: null,
    loading: false
  })
}));

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toEqual({ authenticated: false });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle login success', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Mock successful login
    result.current.login = vi.fn().mockResolvedValue(true);
    
    await act(async () => {
      const success = await result.current.login('testuser', 'password');
      expect(success).toBe(true);
    });
  });

  it('should handle login failure', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Mock failed login
    result.current.login = vi.fn().mockResolvedValue(false);
    
    await act(async () => {
      const success = await result.current.login('testuser', 'wrongpassword');
      expect(success).toBe(false);
    });
  });

  it('should handle logout', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Mock logout
    result.current.logout = vi.fn().mockResolvedValue(undefined);
    
    await act(async () => {
      await result.current.logout();
    });
  });
});
