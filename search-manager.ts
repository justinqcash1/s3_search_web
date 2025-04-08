import { useState, useEffect, useCallback } from 'react';
import { useS3Connection, useZipExtraction, useTextSearch } from '@/hooks/api-hooks';
import { AlertMessage, LoadingIndicator } from '@/components/ui-elements';

export interface SearchManagerProps {
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
  onProgress: (progress: number) => void;
  onStatusUpdate: (status: string) => void;
  onResultsUpdate: (results: string[]) => void;
}

export function useSearchManager() {
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const s3Connection = useS3Connection();
  const zipExtraction = useZipExtraction();
  const textSearch = useTextSearch();

  const startSearch = useCallback(async (params: SearchManagerProps) => {
    const {
      credentials,
      bucketName,
      prefix,
      zipPassword,
      identifiers,
      idFormat,
      onProgress,
      onStatusUpdate,
      onResultsUpdate
    } = params;

    if (!credentials.accessKey || !credentials.secretKey || !bucketName) {
      setError('AWS credentials and bucket name are required');
      return;
    }

    if (!identifiers) {
      setError('Please provide identifiers');
      return;
    }

    try {
      setIsSearching(true);
      setProgress(0);
      setStatus('Starting search...');
      setResults([]);
      setError(null);

      onProgress(0);
      onStatusUpdate('Starting search...');
      onResultsUpdate([]);

      // Step 1: Connect to S3
      setStatus('Connecting to AWS S3...');
      onStatusUpdate('Connecting to AWS S3...');
      await s3Connection.connect(credentials);

      // Step 2: List folders
      setStatus('Listing folders...');
      onStatusUpdate('Listing folders...');
      const foldersResponse = await s3Connection.listFolders({
        ...credentials,
        bucketName,
        prefix
      });

      const folders = foldersResponse.folders || [];
      if (folders.length === 0 && prefix) {
        // If no folders found with prefix, try using the prefix as a folder
        folders.push({ prefix });
      } else if (folders.length === 0) {
        // If no folders found and no prefix, search the entire bucket
        folders.push({ prefix: '' });
      }

      setStatus(`Found ${folders.length} folders to search`);
      onStatusUpdate(`Found ${folders.length} folders to search`);
      setProgress(10);
      onProgress(10);

      // Process each folder
      const allResults: string[] = [];
      for (let folderIdx = 0; folderIdx < folders.length; folderIdx++) {
        const folder = folders[folderIdx];
        
        if (!isSearching) {
          setStatus('Search stopped by user');
          onStatusUpdate('Search stopped by user');
          break;
        }

        setStatus(`Searching folder ${folderIdx + 1}/${folders.length}: ${folder.prefix}`);
        onStatusUpdate(`Searching folder ${folderIdx + 1}/${folders.length}: ${folder.prefix}`);

        // Step 3: List zip files in the folder
        const objectsResponse = await s3Connection.listObjects({
          ...credentials,
          bucketName,
          prefix: folder.prefix,
          extension: '.zip'
        });

        const zipFiles = objectsResponse.objects || [];
        if (zipFiles.length === 0) {
          setStatus(`No zip files found in folder ${folder.prefix}`);
          onStatusUpdate(`No zip files found in folder ${folder.prefix}`);
          continue;
        }

        setStatus(`Found ${zipFiles.length} zip files in folder ${folder.prefix}`);
        onStatusUpdate(`Found ${zipFiles.length} zip files in folder ${folder.prefix}`);

        // Process each zip file
        for (let zipIdx = 0; zipIdx < zipFiles.length; zipIdx++) {
          if (!isSearching) {
            break;
          }

          const zipFile = zipFiles[zipIdx];
          
          // Calculate overall progress
          const folderProgress = folderIdx / folders.length;
          const zipProgress = (zipIdx / zipFiles.length) / folders.length;
          const currentProgress = Math.floor((folderProgress + zipProgress) * 80) + 10;
          setProgress(currentProgress);
          onProgress(currentProgress);

          setStatus(`Processing zip ${zipIdx + 1}/${zipFiles.length}: ${zipFile.key}`);
          onStatusUpdate(`Processing zip ${zipIdx + 1}/${zipFiles.length}: ${zipFile.key}`);

          try {
            // Step 4: Extract the zip file
            const extractResponse = await zipExtraction.extractZip({
              ...credentials,
              bucketName,
              objectKey: zipFile.key,
              zipPassword
            });

            if (!extractResponse.success) {
              setStatus(`Failed to extract ${zipFile.key}`);
              onStatusUpdate(`Failed to extract ${zipFile.key}`);
              continue;
            }

            // Step 5: Search for identifiers in the extracted files
            const s3Path = `s3://${bucketName}/${zipFile.key}`;
            const searchResponse = await textSearch.searchText({
              extractedFiles: extractResponse.files,
              identifiers,
              zipFile: zipFile.key,
              s3Path,
              idFormat
            });

            if (searchResponse.totalMatches > 0) {
              const resultText = `Found ${searchResponse.totalMatches} matches in ${zipFile.key}:`;
              allResults.push(resultText);
              
              searchResponse.results.forEach(result => {
                const matchText = `  - ${result.identifier} in ${result.fileInZip}`;
                allResults.push(matchText);
              });

              // Update results after each zip file to show progress
              setResults([...allResults]);
              onResultsUpdate([...allResults]);
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setStatus(`Error processing ${zipFile.key}: ${errorMessage}`);
            onStatusUpdate(`Error processing ${zipFile.key}: ${errorMessage}`);
          }
        }
      }

      // Complete
      setProgress(100);
      onProgress(100);
      setStatus('Search completed');
      onStatusUpdate('Search completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus(`Error: ${errorMessage}`);
      onStatusUpdate(`Error: ${errorMessage}`);
    } finally {
      setIsSearching(false);
    }
  }, [s3Connection, zipExtraction, textSearch]);

  const stopSearch = useCallback(() => {
    setIsSearching(false);
    setStatus('Search stopped');
  }, []);

  return {
    isSearching,
    progress,
    status,
    results,
    error,
    startSearch,
    stopSearch
  };
}
