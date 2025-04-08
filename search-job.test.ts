import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchJob } from '@/hooks/search-job';

// Mock the API hooks
vi.mock('@/hooks/api-hooks', () => ({
  useApi: () => ({
    fetchData: vi.fn(),
    data: null,
    error: null,
    loading: false
  })
}));

describe('useSearchJob hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useSearchJob());
    
    expect(result.current.jobId).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(0);
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle starting a search job', async () => {
    const { result } = renderHook(() => useSearchJob());
    
    // Mock successful job start
    result.current.startSearchJob = vi.fn().mockImplementation(() => {
      act(() => {
        result.current.jobId = 'test-job-id';
        result.current.status = 'processing';
      });
    });
    
    await act(async () => {
      await result.current.startSearchJob({
        credentials: {
          accessKey: 'test-key',
          secretKey: 'test-secret',
          region: 'us-east-1'
        },
        bucketName: 'test-bucket',
        prefix: '',
        zipPassword: 'test-password',
        identifiers: 'test-id',
        idFormat: 'line',
        onProgress: vi.fn(),
        onStatusUpdate: vi.fn(),
        onResultsUpdate: vi.fn()
      });
    });
    
    expect(result.current.jobId).toBe('test-job-id');
    expect(result.current.status).toBe('processing');
  });

  it('should format results correctly', () => {
    const { result } = renderHook(() => useSearchJob());
    
    // Set mock results
    act(() => {
      result.current.results = [
        {
          identifier: 'ID123',
          occurrences: [
            {
              zipFile: 'file1.zip',
              fileInZip: 'text1.txt',
              s3Path: 's3://bucket/file1.zip'
            },
            {
              zipFile: 'file2.zip',
              fileInZip: 'text2.txt',
              s3Path: 's3://bucket/file2.zip'
            }
          ]
        }
      ];
    });
    
    const formattedResults = result.current.getFormattedResults();
    
    expect(formattedResults).toEqual([
      'Identifier: ID123 (2 occurrences)',
      '  - Found in file1.zip / text1.txt',
      '  - Found in file2.zip / text2.txt'
    ]);
  });

  it('should generate CSV data correctly', () => {
    const { result } = renderHook(() => useSearchJob());
    
    // Set mock results
    act(() => {
      result.current.results = [
        {
          identifier: 'ID123',
          occurrences: [
            {
              zipFile: 'file1.zip',
              fileInZip: 'text1.txt',
              s3Path: 's3://bucket/file1.zip'
            },
            {
              zipFile: 'file2.zip',
              fileInZip: 'text2.txt',
              s3Path: 's3://bucket/file2.zip'
            }
          ]
        }
      ];
    });
    
    const csvData = result.current.getResultsCSV();
    
    expect(csvData).toBe(
      'Identifier,Zip File,File in Zip,S3 Path\n' +
      'ID123,file1.zip,text1.txt,s3://bucket/file1.zip\n' +
      'ID123,file2.zip,text2.txt,s3://bucket/file2.zip'
    );
  });
});
