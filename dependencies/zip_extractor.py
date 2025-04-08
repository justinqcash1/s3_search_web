import os
import tempfile
import shutil
import pyzipper
import logging
from pathlib import Path

class ZipExtractor:
    def __init__(self, zip_password=None):
        """
        Initialize the zip extractor with password
        
        Args:
            zip_password (str): Password for protected zip files
        """
        self.zip_password = zip_password
        self.temp_dir = None
        self.logger = self._setup_logger()
        
    def _setup_logger(self):
        """Set up logging for the zip extractor"""
        logger = logging.getLogger('zip_extractor')
        logger.setLevel(logging.INFO)
        
        # Create handler if not already set up
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
        return logger
    
    def setup_temp_directory(self):
        """
        Create a temporary directory for zip extraction
        
        Returns:
            str: Path to the temporary directory
        """
        if self.temp_dir is None or not os.path.exists(self.temp_dir):
            self.temp_dir = tempfile.mkdtemp(prefix='s3_search_')
            self.logger.info(f"Created temporary directory: {self.temp_dir}")
        return self.temp_dir
    
    def extract_zip(self, zip_path, extract_dir=None):
        """
        Extract a password-protected zip file
        
        Args:
            zip_path (str): Path to the zip file
            extract_dir (str): Directory to extract files to (uses temp dir if None)
            
        Returns:
            tuple: (success, extracted_files_list)
        """
        if extract_dir is None:
            extract_dir = self.setup_temp_directory()
        
        # Create a unique subdirectory for this zip file to avoid file conflicts
        zip_name = os.path.basename(zip_path).replace('.zip', '')
        extract_subdir = os.path.join(extract_dir, zip_name)
        os.makedirs(extract_subdir, exist_ok=True)
        
        extracted_files = []
        success = False
        
        try:
            # Open the zip file with password
            with pyzipper.AESZipFile(zip_path) as zip_file:
                # Set password if provided
                if self.zip_password:
                    zip_file.setpassword(self.zip_password.encode())
                
                # Get list of files in the zip
                file_list = zip_file.namelist()
                
                # Extract all files
                for file in file_list:
                    # Extract the file
                    extracted_path = zip_file.extract(file, path=extract_subdir)
                    extracted_files.append(extracted_path)
                    self.logger.info(f"Extracted: {file} to {extracted_path}")
            
            success = True
            self.logger.info(f"Successfully extracted {len(extracted_files)} files from {zip_path}")
            
        except pyzipper.BadZipFile:
            self.logger.error(f"Bad zip file: {zip_path}")
        except RuntimeError as e:
            if "Bad password" in str(e):
                self.logger.error(f"Incorrect password for zip file: {zip_path}")
            else:
                self.logger.error(f"Error extracting zip file {zip_path}: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error extracting zip file {zip_path}: {e}")
        
        return success, extracted_files
    
    def filter_text_files(self, file_list):
        """
        Filter a list of files to include only text files
        
        Args:
            file_list (list): List of file paths
            
        Returns:
            list: Filtered list containing only text files
        """
        text_extensions = ['.txt', '.csv', '.log', '.md', '.json', '.xml', '.html', '.htm']
        return [f for f in file_list if any(f.lower().endswith(ext) for ext in text_extensions)]
    
    def cleanup(self):
        """
        Clean up temporary files and directories
        
        Returns:
            bool: True if cleanup successful, False otherwise
        """
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
                self.logger.info(f"Cleaned up temporary directory: {self.temp_dir}")
                self.temp_dir = None
                return True
            except Exception as e:
                self.logger.error(f"Error cleaning up temporary directory: {e}")
                return False
        return True
    
    def __del__(self):
        """Destructor to ensure cleanup"""
        self.cleanup()

# For testing the zip extractor independently
if __name__ == '__main__':
    # Example usage
    extractor = ZipExtractor(zip_password='GDSLink13!')
    
    # Create a test zip file with password protection
    test_dir = tempfile.mkdtemp()
    test_file_path = os.path.join(test_dir, 'test.txt')
    
    # Create a test text file
    with open(test_file_path, 'w') as f:
        f.write('This is a test file with a unique identifier: TEST123456')
    
    # Create a password-protected zip file
    test_zip_path = os.path.join(test_dir, 'test.zip')
    with pyzipper.AESZipFile(test_zip_path, 'w', compression=pyzipper.ZIP_LZMA, encryption=pyzipper.WZ_AES) as zf:
        zf.setpassword(b'GDSLink13!')
        zf.write(test_file_path, arcname='test.txt')
    
    print(f"Created test zip file: {test_zip_path}")
    
    # Extract the test zip file
    success, extracted_files = extractor.extract_zip(test_zip_path)
    
    if success:
        print(f"Extraction successful. Files: {extracted_files}")
        
        # Filter text files
        text_files = extractor.filter_text_files(extracted_files)
        print(f"Text files: {text_files}")
        
        # Read the content of the first text file
        if text_files:
            with open(text_files[0], 'r') as f:
                content = f.read()
                print(f"Content of {text_files[0]}: {content}")
    
    # Clean up
    extractor.cleanup()
    shutil.rmtree(test_dir)
    print("Test completed and cleaned up")
