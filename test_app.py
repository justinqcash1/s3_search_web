import os
import tempfile
import shutil
import pyzipper
import threading
import time
from pathlib import Path

from s3_connection import S3Connection
from zip_extractor import ZipExtractor
from text_searcher import TextSearcher
from test_data import create_test_data

class LocalS3Mock:
    """
    A mock S3 connection that works with local files instead of actual S3 bucket
    This allows testing without AWS credentials
    """
    def __init__(self, base_dir):
        """
        Initialize the mock S3 connection
        
        Args:
            base_dir (str): Base directory that simulates the S3 bucket
        """
        self.base_dir = base_dir
        self.connected = False
    
    def connect(self):
        """Simulate connecting to S3"""
        self.connected = True
        return True
    
    def list_buckets(self):
        """Simulate listing buckets"""
        return ['mock-bucket']
    
    def list_folders(self, bucket_name, prefix=''):
        """
        List folders in the base directory
        
        Args:
            bucket_name (str): Ignored, using base_dir instead
            prefix (str): Optional prefix to filter folders
            
        Returns:
            list: List of folder paths relative to base_dir
        """
        folders = []
        prefix_path = os.path.join(self.base_dir, prefix) if prefix else self.base_dir
        
        for item in os.listdir(prefix_path):
            item_path = os.path.join(prefix_path, item)
            if os.path.isdir(item_path):
                rel_path = os.path.relpath(item_path, self.base_dir)
                folders.append(rel_path)
        
        return folders
    
    def list_objects(self, bucket_name, prefix=''):
        """
        List files in the base directory
        
        Args:
            bucket_name (str): Ignored, using base_dir instead
            prefix (str): Optional prefix to filter files
            
        Returns:
            list: List of file paths relative to base_dir
        """
        objects = []
        prefix_path = os.path.join(self.base_dir, prefix) if prefix else self.base_dir
        
        for root, _, files in os.walk(prefix_path):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, self.base_dir)
                objects.append(rel_path)
        
        return objects
    
    def filter_objects_by_extension(self, bucket_name, prefix='', extension='.zip'):
        """
        Filter files by extension
        
        Args:
            bucket_name (str): Ignored, using base_dir instead
            prefix (str): Optional prefix to filter files
            extension (str): File extension to filter by
            
        Returns:
            list: List of file paths with the specified extension
        """
        all_objects = self.list_objects(bucket_name, prefix)
        return [obj for obj in all_objects if obj.lower().endswith(extension.lower())]
    
    def download_file(self, bucket_name, object_key, local_path):
        """
        Copy a file from the base directory to the local path
        
        Args:
            bucket_name (str): Ignored, using base_dir instead
            object_key (str): Path relative to base_dir
            local_path (str): Local path to save the file
            
        Returns:
            bool: True if download successful, False otherwise
        """
        try:
            source_path = os.path.join(self.base_dir, object_key)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            shutil.copy2(source_path, local_path)
            return True
        except Exception as e:
            print(f"Error downloading {object_key}: {e}")
            return False
    
    def close(self):
        """Close the mock connection"""
        self.connected = False

def test_components():
    """Test individual components with sample data"""
    print("Testing individual components...")
    
    # Create test data
    test_dir, identifiers_file, identifiers = create_test_data()
    print(f"Test directory: {test_dir}")
    
    # Test S3 mock
    print("\nTesting S3 mock...")
    s3_mock = LocalS3Mock(test_dir)
    s3_mock.connect()
    
    folders = s3_mock.list_folders('mock-bucket')
    print(f"Folders: {folders}")
    
    for folder in folders:
        zip_files = s3_mock.filter_objects_by_extension('mock-bucket', folder, '.zip')
        print(f"Zip files in {folder}: {zip_files}")
    
    # Test zip extractor
    print("\nTesting zip extractor...")
    extractor = ZipExtractor(zip_password='GDSLink13!')
    temp_dir = extractor.setup_temp_directory()
    
    # Get a sample zip file
    sample_folder = folders[0]
    sample_zips = s3_mock.filter_objects_by_extension('mock-bucket', sample_folder, '.zip')
    sample_zip = sample_zips[0]
    
    # Download and extract
    local_zip = os.path.join(temp_dir, os.path.basename(sample_zip))
    s3_mock.download_file('mock-bucket', sample_zip, local_zip)
    
    extract_dir = os.path.join(temp_dir, f"extract_{os.path.basename(sample_zip)}")
    success, extracted_files = extractor.extract_zip(local_zip, extract_dir)
    
    if success:
        print(f"Successfully extracted {len(extracted_files)} files")
        text_files = extractor.filter_text_files(extracted_files)
        print(f"Text files: {[os.path.basename(f) for f in text_files]}")
    
    # Test text searcher
    print("\nTesting text searcher...")
    searcher = TextSearcher()
    
    # Load identifiers
    loaded_identifiers = searcher.load_identifiers(identifiers_file)
    print(f"Loaded identifiers: {loaded_identifiers}")
    
    # Search extracted files
    if success:
        results = searcher.search_zip_contents(local_zip, extract_dir, loaded_identifiers, f"s3://mock-bucket/{sample_zip}")
        print(f"Search results: {len(results)} matches found")
        for result in results:
            print(f"  - {result['identifier']} in {result['file_in_zip']}")
    
    # Clean up
    extractor.cleanup()
    
    return test_dir

def test_full_workflow():
    """Test the full workflow with sample data"""
    print("\nTesting full workflow...")
    
    # Create test data
    test_dir, identifiers_file, identifiers = create_test_data()
    print(f"Test directory: {test_dir}")
    
    # Initialize components
    s3_mock = LocalS3Mock(test_dir)
    extractor = ZipExtractor(zip_password='GDSLink13!')
    searcher = TextSearcher()
    
    # Connect to mock S3
    s3_mock.connect()
    
    # Load identifiers
    loaded_identifiers = searcher.load_identifiers(identifiers_file)
    print(f"Loaded {len(loaded_identifiers)} identifiers")
    
    # Set up temp directory
    temp_dir = extractor.setup_temp_directory()
    
    # List folders
    folders = s3_mock.list_folders('mock-bucket')
    print(f"Found {len(folders)} folders")
    
    # Process each folder
    for folder in folders:
        print(f"Processing folder: {folder}")
        
        # List zip files
        zip_files = s3_mock.filter_objects_by_extension('mock-bucket', folder, '.zip')
        print(f"Found {len(zip_files)} zip files")
        
        # Process each zip file
        for zip_key in zip_files:
            print(f"Processing zip: {zip_key}")
            
            # Download the zip file
            local_zip = os.path.join(temp_dir, os.path.basename(zip_key))
            if not s3_mock.download_file('mock-bucket', zip_key, local_zip):
                print(f"Failed to download {zip_key}")
                continue
            
            # Extract the zip file
            extract_dir = os.path.join(temp_dir, f"extract_{os.path.basename(zip_key)}")
            success, _ = extractor.extract_zip(local_zip, extract_dir)
            
            if not success:
                print(f"Failed to extract {zip_key}")
                continue
            
            # Search for identifiers
            s3_path = f"s3://mock-bucket/{zip_key}"
            results = searcher.search_zip_contents(local_zip, extract_dir, loaded_identifiers, s3_path)
            
            if results:
                print(f"Found {len(results)} matches in {zip_key}:")
                for result in results:
                    print(f"  - {result['identifier']} in {result['file_in_zip']}")
    
    # Save results
    results_file = os.path.join(test_dir, 'search_results.csv')
    searcher.save_results(results_file)
    print(f"Results saved to {results_file}")
    
    # Clean up
    extractor.cleanup()
    
    return test_dir, results_file

if __name__ == "__main__":
    print("Running tests for S3 Search Application")
    
    # Test individual components
    test_dir = test_components()
    
    # Test full workflow
    test_dir, results_file = test_full_workflow()
    
    print("\nTests completed successfully!")
    print(f"Test directory: {test_dir}")
    print(f"Results file: {results_file}")
    print("\nYou can now run the full application with: python3 main.py")
