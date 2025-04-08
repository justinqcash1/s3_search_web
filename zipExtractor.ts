import JSZip from 'jszip';

export interface ZipExtractorConfig {
  zipPassword?: string;
}

export interface ExtractedFile {
  path: string;
  content: string;
}

export class ZipExtractor {
  private zipPassword: string | undefined;
  
  /**
   * Initialize the zip extractor with password
   * @param config Configuration options
   */
  constructor(config?: ZipExtractorConfig) {
    this.zipPassword = config?.zipPassword;
  }
  
  /**
   * Extract a password-protected zip file from a buffer
   * @param zipBuffer Buffer containing the zip file data
   * @returns Promise resolving to a list of extracted files
   */
  public async extractZip(zipBuffer: Buffer): Promise<ExtractedFile[]> {
    try {
      const zip = new JSZip();
      
      // Load the zip file
      // Note: JSZip doesn't support AES encryption like pyzipper does
      // For AES-encrypted files, we would need a different library or approach
      const zipContents = await zip.loadAsync(zipBuffer, {
        password: this.zipPassword
      });
      
      const extractedFiles: ExtractedFile[] = [];
      
      // Process each file in the zip
      const filePromises = Object.keys(zipContents.files).map(async (filename) => {
        const zipEntry = zipContents.files[filename];
        
        // Skip directories
        if (zipEntry.dir) {
          return;
        }
        
        try {
          // Get the file content as text
          const content = await zipEntry.async('string');
          
          extractedFiles.push({
            path: filename,
            content
          });
        } catch (error) {
          console.error(`Error extracting file ${filename}:`, error);
        }
      });
      
      // Wait for all files to be processed
      await Promise.all(filePromises);
      
      console.log(`Successfully extracted ${extractedFiles.length} files`);
      return extractedFiles;
    } catch (error) {
      console.error('Error extracting zip file:', error);
      if (error instanceof Error && error.message.includes('password')) {
        console.error('Incorrect password for zip file');
      }
      return [];
    }
  }
  
  /**
   * Filter a list of files to include only text files
   * @param files List of extracted files
   * @returns Filtered list containing only text files
   */
  public filterTextFiles(files: ExtractedFile[]): ExtractedFile[] {
    const textExtensions = ['.txt', '.csv', '.log', '.md', '.json', '.xml', '.html', '.htm'];
    
    return files.filter(file => 
      textExtensions.some(ext => file.path.toLowerCase().endsWith(ext))
    );
  }
}
