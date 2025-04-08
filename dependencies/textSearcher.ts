export interface SearchResult {
  identifier: string;
  zipFile: string;
  fileInZip: string;
  s3Path: string;
}

export class TextSearcher {
  private results: SearchResult[] = [];

  /**
   * Initialize the text searcher
   */
  constructor() {}

  /**
   * Load identifiers from a string
   * @param content Content containing identifiers
   * @param formatType Format of the identifiers ('line' or 'csv')
   * @returns List of identifiers
   */
  public loadIdentifiersFromString(content: string, formatType: 'line' | 'csv' = 'line'): string[] {
    try {
      const identifiers: string[] = [];
      
      if (formatType === 'line') {
        // Split by newlines and filter out empty lines
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            identifiers.push(trimmed);
          }
        }
      } else if (formatType === 'csv') {
        // Simple CSV parsing (assumes first column contains identifiers)
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            const columns = trimmed.split(',');
            if (columns.length > 0 && columns[0].trim()) {
              identifiers.push(columns[0].trim());
            }
          }
        }
      }
      
      console.log(`Loaded ${identifiers.length} identifiers`);
      return identifiers;
    } catch (error) {
      console.error('Error loading identifiers:', error);
      return [];
    }
  }

  /**
   * Search a text for identifiers
   * @param text Text content to search
   * @param identifiers List of identifiers to search for
   * @returns List of found identifiers
   */
  public searchText(text: string, identifiers: string[]): string[] {
    try {
      const matches: string[] = [];
      
      // Search for each identifier
      for (const identifier of identifiers) {
        // Use word boundary to ensure we match whole words/identifiers
        const pattern = new RegExp(`\\b${this.escapeRegExp(identifier)}\\b`, 'i');
        if (pattern.test(text)) {
          matches.push(identifier);
        }
      }
      
      return matches;
    } catch (error) {
      console.error('Error searching text:', error);
      return [];
    }
  }

  /**
   * Escape special characters in a string for use in a regular expression
   * @param string String to escape
   * @returns Escaped string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Search extracted zip contents for identifiers
   * @param extractedFiles List of extracted files
   * @param identifiers List of identifiers to search for
   * @param zipFile Name of the zip file
   * @param s3Path S3 path to the zip file
   * @returns List of search results
   */
  public searchZipContents(
    extractedFiles: { path: string; content: string }[],
    identifiers: string[],
    zipFile: string,
    s3Path: string
  ): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Search each file
    for (const file of extractedFiles) {
      const foundIdentifiers = this.searchText(file.content, identifiers);
      
      // Add results for each found identifier
      for (const identifier of foundIdentifiers) {
        const result: SearchResult = {
          identifier,
          zipFile,
          fileInZip: file.path,
          s3Path
        };
        
        results.push(result);
        this.results.push(result);
      }
    }
    
    console.log(`Found ${results.length} matches in ${zipFile}`);
    return results;
  }

  /**
   * Get all search results
   * @returns List of all search results
   */
  public getResults(): SearchResult[] {
    return this.results;
  }

  /**
   * Clear all search results
   */
  public clearResults(): void {
    this.results = [];
    console.log('Cleared search results');
  }

  /**
   * Convert search results to CSV format
   * @returns CSV string of search results
   */
  public resultsToCSV(): string {
    const header = 'Identifier,Zip File,File in Zip,S3 Path\n';
    const rows = this.results.map(result => 
      `${result.identifier},${result.zipFile},${result.fileInZip},${result.s3Path}`
    );
    
    return header + rows.join('\n');
  }
}
