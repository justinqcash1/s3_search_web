import boto3
from botocore.exceptions import ClientError
import os
import logging

class S3Connection:
    def __init__(self, access_key=None, secret_key=None, region=None):
        """
        Initialize the S3 connection with AWS credentials
        
        Args:
            access_key (str): AWS Access Key ID
            secret_key (str): AWS Secret Access Key
            region (str): AWS Region (default: us-east-1)
        """
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region or 'us-east-1'
        self.s3_client = None
        self.s3_resource = None
        self.logger = self._setup_logger()
        
    def _setup_logger(self):
        """Set up logging for the S3 connection"""
        logger = logging.getLogger('s3_connection')
        logger.setLevel(logging.INFO)
        
        # Create handler if not already set up
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
        return logger
    
    def connect(self):
        """
        Establish connection to AWS S3
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            # Create session with credentials
            session = boto3.Session(
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            )
            
            # Create S3 client and resource
            self.s3_client = session.client('s3')
            self.s3_resource = session.resource('s3')
            
            # Test connection by listing buckets
            self.s3_client.list_buckets()
            self.logger.info("Successfully connected to AWS S3")
            return True
            
        except ClientError as e:
            self.logger.error(f"Failed to connect to AWS S3: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error connecting to AWS S3: {e}")
            return False
    
    def list_buckets(self):
        """
        List all available S3 buckets
        
        Returns:
            list: List of bucket names
        """
        try:
            response = self.s3_client.list_buckets()
            buckets = [bucket['Name'] for bucket in response['Buckets']]
            return buckets
        except Exception as e:
            self.logger.error(f"Error listing buckets: {e}")
            return []
    
    def list_objects(self, bucket_name, prefix=''):
        """
        List objects in a bucket with optional prefix
        
        Args:
            bucket_name (str): Name of the S3 bucket
            prefix (str): Optional prefix to filter objects
            
        Returns:
            list: List of object keys
        """
        try:
            objects = []
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            # Handle pagination for large buckets
            for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        objects.append(obj['Key'])
            
            return objects
        except ClientError as e:
            self.logger.error(f"Error listing objects in bucket {bucket_name}: {e}")
            return []
    
    def download_file(self, bucket_name, object_key, local_path):
        """
        Download a file from S3 to local storage
        
        Args:
            bucket_name (str): Name of the S3 bucket
            object_key (str): Key of the object to download
            local_path (str): Local path to save the file
            
        Returns:
            bool: True if download successful, False otherwise
        """
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            # Download the file
            self.s3_client.download_file(bucket_name, object_key, local_path)
            self.logger.info(f"Successfully downloaded {object_key} to {local_path}")
            return True
        except ClientError as e:
            self.logger.error(f"Error downloading {object_key}: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error downloading {object_key}: {e}")
            return False
    
    def get_object_size(self, bucket_name, object_key):
        """
        Get the size of an S3 object
        
        Args:
            bucket_name (str): Name of the S3 bucket
            object_key (str): Key of the object
            
        Returns:
            int: Size of the object in bytes, or -1 if error
        """
        try:
            response = self.s3_client.head_object(Bucket=bucket_name, Key=object_key)
            return response['ContentLength']
        except Exception as e:
            self.logger.error(f"Error getting size of {object_key}: {e}")
            return -1
    
    def list_folders(self, bucket_name, prefix=''):
        """
        List folders (common prefixes) in a bucket
        
        Args:
            bucket_name (str): Name of the S3 bucket
            prefix (str): Optional prefix to filter folders
            
        Returns:
            list: List of folder prefixes
        """
        try:
            folders = []
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            # Use delimiter to get folders
            for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix, Delimiter='/'):
                if 'CommonPrefixes' in page:
                    for prefix_obj in page['CommonPrefixes']:
                        folders.append(prefix_obj['Prefix'])
            
            return folders
        except ClientError as e:
            self.logger.error(f"Error listing folders in bucket {bucket_name}: {e}")
            return []
    
    def filter_objects_by_extension(self, bucket_name, prefix='', extension='.zip'):
        """
        Filter objects in a bucket by file extension
        
        Args:
            bucket_name (str): Name of the S3 bucket
            prefix (str): Optional prefix to filter objects
            extension (str): File extension to filter by
            
        Returns:
            list: List of object keys with the specified extension
        """
        all_objects = self.list_objects(bucket_name, prefix)
        return [obj for obj in all_objects if obj.lower().endswith(extension.lower())]
    
    def close(self):
        """Close the S3 connection and clean up resources"""
        self.s3_client = None
        self.s3_resource = None
        self.logger.info("S3 connection closed")

# For testing the S3 connection independently
if __name__ == '__main__':
    # Example usage
    s3_conn = S3Connection(
        access_key='YOUR_ACCESS_KEY',
        secret_key='YOUR_SECRET_KEY',
        region='us-east-1'
    )
    
    if s3_conn.connect():
        print("Connected to S3")
        buckets = s3_conn.list_buckets()
        print(f"Available buckets: {buckets}")
        
        # Example bucket operations
        if buckets:
            test_bucket = buckets[0]
            objects = s3_conn.list_objects(test_bucket)
            print(f"Objects in {test_bucket}: {objects[:10]}")
            
            zip_files = s3_conn.filter_objects_by_extension(test_bucket, extension='.zip')
            print(f"Zip files in {test_bucket}: {zip_files[:10]}")
    
    s3_conn.close()
