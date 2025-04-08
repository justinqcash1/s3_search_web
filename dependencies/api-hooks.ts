import { useState, useEffect } from 'react';

export interface UseApiOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async (options: UseApiOptions) => {
    const { 
      url, 
      method = 'GET', 
      body, 
      headers = {}, 
      onSuccess, 
      onError 
    } = options;

    setLoading(true);
    setError(null);

    try {
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      };

      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const responseData = await response.json();
      setData(responseData);
      
      if (onSuccess) {
        onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { data, error, loading, fetchData };
}

export function useS3Connection() {
  const { data, error, loading, fetchData } = useApi();

  const connect = async (credentials: { 
    accessKey: string; 
    secretKey: string; 
    region: string;
  }) => {
    return fetchData({
      url: '/api/connect',
      method: 'POST',
      body: credentials
    });
  };

  const listBuckets = async (credentials: { 
    accessKey: string; 
    secretKey: string; 
    region: string;
  }) => {
    return fetchData({
      url: '/api/buckets',
      method: 'POST',
      body: credentials
    });
  };

  const listFolders = async (params: { 
    accessKey: string; 
    secretKey: string; 
    region: string;
    bucketName: string;
    prefix?: string;
  }) => {
    return fetchData({
      url: '/api/folders',
      method: 'POST',
      body: params
    });
  };

  const listObjects = async (params: { 
    accessKey: string; 
    secretKey: string; 
    region: string;
    bucketName: string;
    prefix?: string;
    extension?: string;
  }) => {
    return fetchData({
      url: '/api/objects',
      method: 'POST',
      body: params
    });
  };

  return {
    connectionData: data,
    connectionError: error,
    connectionLoading: loading,
    connect,
    listBuckets,
    listFolders,
    listObjects
  };
}

export function useZipExtraction() {
  const { data, error, loading, fetchData } = useApi();

  const extractZip = async (params: { 
    accessKey: string; 
    secretKey: string; 
    region: string;
    bucketName: string;
    objectKey: string;
    zipPassword?: string;
  }) => {
    return fetchData({
      url: '/api/extract',
      method: 'POST',
      body: params
    });
  };

  return {
    extractionData: data,
    extractionError: error,
    extractionLoading: loading,
    extractZip
  };
}

export function useTextSearch() {
  const { data, error, loading, fetchData } = useApi();

  const searchText = async (params: { 
    extractedFiles: Array<{ path: string; content: string }>;
    identifiers: string | string[];
    zipFile: string;
    s3Path: string;
    idFormat?: 'line' | 'csv';
  }) => {
    return fetchData({
      url: '/api/search',
      method: 'POST',
      body: params
    });
  };

  return {
    searchData: data,
    searchError: error,
    searchLoading: loading,
    searchText
  };
}
