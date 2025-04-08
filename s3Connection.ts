import AWS from 'aws-sdk';

export interface S3ConnectionConfig {
  accessKey: string;
  secretKey: string;
  region: string;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
}

export interface S3Folder {
  prefix: string;
}

export class S3Connection {
  private s3Client: AWS.S3 | null = null;
  private config: S3ConnectionConfig | null = null;

  /**
   * Initialize the S3 connection with AWS credentials
   */
  constructor(config?: S3ConnectionConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Connect to AWS S3
   * @returns True if connection successful, false otherwise
   */
  public connect(config?: S3ConnectionConfig): boolean {
    try {
      // Use provided config or previously stored config
      const connectionConfig = config || this.config;
      
      if (!connectionConfig) {
        console.error('No AWS credentials provided');
        return false;
      }
      
      this.config = connectionConfig;
      
      // Configure AWS SDK
      AWS.config.update({
        accessKeyId: connectionConfig.accessKey,
        secretAccessKey: connectionConfig.secretKey,
        region: connectionConfig.region || 'us-east-1'
      });
      
      // Create S3 client
      this.s3Client = new AWS.S3();
      
      return true;
    } catch (error) {
      console.error('Failed to connect to AWS S3:', error);
      return false;
    }
  }

  /**
   * List all available S3 buckets
   * @returns List of bucket names
   */
  public async listBuckets(): Promise<string[]> {
    try {
      if (!this.s3Client) {
        throw new Error('Not connected to AWS S3');
      }
      
      const response = await this.s3Client.listBuckets().promise();
      const buckets = response.Buckets?.map(bucket => bucket.Name || '') || [];
      
      return buckets;
    } catch (error) {
      console.error('Error listing buckets:', error);
      return [];
    }
  }

  /**
   * List folders (common prefixes) in a bucket
   * @param bucketName Name of the S3 bucket
   * @param prefix Optional prefix to filter folders
   * @returns List of folder prefixes
   */
  public async listFolders(bucketName: string, prefix: string = ''): Promise<S3Folder[]> {
    try {
      if (!this.s3Client) {
        throw new Error('Not connected to AWS S3');
      }
      
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/'
      };
      
      const response = await this.s3Client.listObjectsV2(params).promise();
      const folders = response.CommonPrefixes?.map(prefix => ({
        prefix: prefix.Prefix || ''
      })) || [];
      
      return folders;
    } catch (error) {
      console.error(`Error listing folders in bucket ${bucketName}:`, error);
      return [];
    }
  }

  /**
   * List objects in a bucket with optional prefix
   * @param bucketName Name of the S3 bucket
   * @param prefix Optional prefix to filter objects
   * @returns List of S3 objects
   */
  public async listObjects(bucketName: string, prefix: string = ''): Promise<S3Object[]> {
    try {
      if (!this.s3Client) {
        throw new Error('Not connected to AWS S3');
      }
      
      const objects: S3Object[] = [];
      let continuationToken: string | undefined;
      
      do {
        const params: AWS.S3.ListObjectsV2Request = {
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken
        };
        
        const response = await this.s3Client.listObjectsV2(params).promise();
        
        const pageObjects = response.Contents?.map(obj => ({
          key: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date()
        })) || [];
        
        objects.push(...pageObjects);
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);
      
      return objects;
    } catch (error) {
      console.error(`Error listing objects in bucket ${bucketName}:`, error);
      return [];
    }
  }

  /**
   * Filter objects in a bucket by file extension
   * @param bucketName Name of the S3 bucket
   * @param prefix Optional prefix to filter objects
   * @param extension File extension to filter by
   * @returns List of S3 objects with the specified extension
   */
  public async filterObjectsByExtension(
    bucketName: string, 
    prefix: string = '', 
    extension: string = '.zip'
  ): Promise<S3Object[]> {
    try {
      const allObjects = await this.listObjects(bucketName, prefix);
      return allObjects.filter(obj => 
        obj.key.toLowerCase().endsWith(extension.toLowerCase())
      );
    } catch (error) {
      console.error(`Error filtering objects in bucket ${bucketName}:`, error);
      return [];
    }
  }

  /**
   * Get the signed URL for an S3 object
   * @param bucketName Name of the S3 bucket
   * @param objectKey Key of the object
   * @param expiresIn Expiration time in seconds (default: 60)
   * @returns Signed URL for the object
   */
  public getSignedUrl(bucketName: string, objectKey: string, expiresIn: number = 60): string {
    try {
      if (!this.s3Client) {
        throw new Error('Not connected to AWS S3');
      }
      
      const params = {
        Bucket: bucketName,
        Key: objectKey,
        Expires: expiresIn
      };
      
      return this.s3Client.getSignedUrl('getObject', params);
    } catch (error) {
      console.error(`Error getting signed URL for ${objectKey}:`, error);
      return '';
    }
  }

  /**
   * Get the size of an S3 object
   * @param bucketName Name of the S3 bucket
   * @param objectKey Key of the object
   * @returns Size of the object in bytes, or -1 if error
   */
  public async getObjectSize(bucketName: string, objectKey: string): Promise<number> {
    try {
      if (!this.s3Client) {
        throw new Error('Not connected to AWS S3');
      }
      
      const params = {
        Bucket: bucketName,
        Key: objectKey
      };
      
      const response = await this.s3Client.headObject(params).promise();
      return response.ContentLength || -1;
    } catch (error) {
      console.error(`Error getting size of ${objectKey}:`, error);
      return -1;
    }
  }

  /**
   * Download an S3 object as a buffer
   * @param bucketName Name of the S3 bucket
   * @param objectKey Key of the object
   * @returns Buffer containing the object data, or null if error
   */
  public async downloadObject(bucketName: string, objectKey: string): Promise<Buffer | null> {
    try {
      if (!this.s3Client) {
        throw new Error('Not connected to AWS S3');
      }
      
      const params = {
        Bucket: bucketName,
        Key: objectKey
      };
      
      const response = await this.s3Client.getObject(params).promise();
      return response.Body as Buffer;
    } catch (error) {
      console.error(`Error downloading ${objectKey}:`, error);
      return null;
    }
  }

  /**
   * Close the S3 connection and clean up resources
   */
  public close(): void {
    this.s3Client = null;
    console.log('S3 connection closed');
  }
}
