import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useS3Connection } from '@/hooks/api-hooks';

// Mock fetch
global.fetch = vi.fn();

describe('useS3Connection hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should handle successful connection', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const { result } = renderHook(() => useS3Connection());
    
    await act(async () => {
      const response = await result.current.connect({
        accessKey: 'test-key',
        secretKey: 'test-secret',
        region: 'us-east-1'
      });
      
      expect(response).toEqual({ success: true });
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/connect', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        accessKey: 'test-key',
        secretKey: 'test-secret',
        region: 'us-east-1'
      })
    }));
  });

  it('should handle listing buckets', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ buckets: ['bucket1', 'bucket2'] })
    });

    const { result } = renderHook(() => useS3Connection());
    
    await act(async () => {
      const response = await result.current.listBuckets({
        accessKey: 'test-key',
        secretKey: 'test-secret',
        region: 'us-east-1'
      });
      
      expect(response).toEqual({ buckets: ['bucket1', 'bucket2'] });
    });
  });

  it('should handle listing folders', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        folders: [
          { prefix: 'folder1/' },
          { prefix: 'folder2/' }
        ] 
      })
    });

    const { result } = renderHook(() => useS3Connection());
    
    await act(async () => {
      const response = await result.current.listFolders({
        accessKey: 'test-key',
        secretKey: 'test-secret',
        region: 'us-east-1',
        bucketName: 'test-bucket',
        prefix: ''
      });
      
      expect(response).toEqual({ 
        folders: [
          { prefix: 'folder1/' },
          { prefix: 'folder2/' }
        ] 
      });
    });
  });

  it('should handle listing objects', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        objects: [
          { key: 'file1.zip', size: 1024 },
          { key: 'file2.zip', size: 2048 }
        ] 
      })
    });

    const { result } = renderHook(() => useS3Connection());
    
    await act(async () => {
      const response = await result.current.listObjects({
        accessKey: 'test-key',
        secretKey: 'test-secret',
        region: 'us-east-1',
        bucketName: 'test-bucket',
        prefix: '',
        extension: '.zip'
      });
      
      expect(response).toEqual({ 
        objects: [
          { key: 'file1.zip', size: 1024 },
          { key: 'file2.zip', size: 2048 }
        ] 
      });
    });
  });

  it('should handle API errors', async () => {
    // Mock failed API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Connection failed' })
    });

    const { result } = renderHook(() => useS3Connection());
    
    await act(async () => {
      try {
        await result.current.connect({
          accessKey: 'test-key',
          secretKey: 'test-secret',
          region: 'us-east-1'
        });
      } catch (error) {
        expect(error.message).toBe('Connection failed');
      }
    });
  });
});
