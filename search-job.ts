import { useState, useEffect, useCallback } from 'react';
import { useApi } from './api-hooks';

export interface UseSearchJobOptions {
  credentials: {
    accessKey: string;
    secretKey: string;
    region: string;
  };
  bucketName: string;
  prefix: string;
  zipPassword: string;
  identifiers: string;
  idFormat: 'line' | 'csv';
}

export interface SearchJobResult {
  identifier: string;
  occurrences: Array<{
    zipFile: string;
    fileInZip: string;
    s3Path: string;
  }>;
}

export function useSearchJob() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<SearchJobResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const { fetchData: startJob } = useApi();
  const { fetchData: checkJobStatus } = useApi();

  // Start a new search job
  const startSearchJob = useCallback(async (options: UseSearchJobOptions) => {
    try {
      setStatus('pending');
      setProgress(0);
      setResults([]);
      setError(null);

      const response = await startJob({
        url: '/api/search-job',
        method: 'POST',
        body: options
      });

      if (response.success && response.jobId) {
        setJobId(response.jobId);
        setStatus('processing');
        
        // Start polling for job status
        const interval = setInterval(() => {
          pollJobStatus(response.jobId);
        }, 2000); // Poll every 2 seconds
        
        setPollingInterval(interval);
      } else {
        throw new Error('Failed to start search job');
      }
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [startJob]);

  // Poll for job status
  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await checkJobStatus({
        url: `/api/search-job?jobId=${id}`,
        method: 'GET'
      });

      setProgress(response.progress || 0);
      
      if (response.status === 'completed') {
        setStatus('completed');
        setResults(response.results || []);
        
        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } else if (response.status === 'failed') {
        setStatus('failed');
        setError(response.error || 'Search job failed');
        
        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } else {
        setStatus('processing');
      }
    } catch (err) {
      console.error('Error polling job status:', err);
      // Don't set status to failed here, as the job might still be running
      // Just log the error and continue polling
    }
  }, [checkJobStatus, pollingInterval]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Format results for display
  const getFormattedResults = useCallback(() => {
    return results.map(result => {
      const occurrencesText = result.occurrences.map(occurrence => 
        `  - Found in ${occurrence.zipFile} / ${occurrence.fileInZip}`
      );
      
      return [
        `Identifier: ${result.identifier} (${result.occurrences.length} occurrences)`,
        ...occurrencesText
      ];
    }).flat();
  }, [results]);

  // Generate CSV data for download
  const getResultsCSV = useCallback(() => {
    const header = 'Identifier,Zip File,File in Zip,S3 Path\n';
    const rows = results.flatMap(result => 
      result.occurrences.map(occurrence => 
        `${result.identifier},${occurrence.zipFile},${occurrence.fileInZip},${occurrence.s3Path}`
      )
    );
    
    return header + rows.join('\n');
  }, [results]);

  return {
    jobId,
    status,
    progress,
    results,
    error,
    startSearchJob,
    getFormattedResults,
    getResultsCSV
  };
}
