import os
import re
import csv
import logging
from pathlib import Path

class TextSearcher:
    def __init__(self):
        """Initialize the text searcher"""
        self.logger = self._setup_logger()
        self.results = []
        
    def _setup_logger(self):
        """Set up logging for the text searcher"""
        logger = logging.getLogger('text_searcher')
        logger.setLevel(logging.INFO)
        
        # Create handler if not already set up
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
        return logger
    
    def load_identifiers(self, identifiers_file, format_type='line'):
        """
        Load identifiers from a file
        
        Args:
            identifiers_file (str): Path to the file containing identifiers
            format_type (str): Format of the identifiers file ('line' or 'csv')
            
        Returns:
            list: List of identifiers
        """
        identifiers = []
        try:
            if format_type == 'line':
                with open(identifiers_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:  # Skip empty lines
                            identifiers.append(line)
            elif format_type == 'csv':
                with open(identifiers_file, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    for row in reader:
                        if row:  # Skip empty rows
                            identifiers.append(row[0])  # Assume identifier is in first column
            
            self.logger.info(f"Loaded {len(identifiers)} identifiers from {identifiers_file}")
            return identifiers
        except Exception as e:
            self.logger.error(f"Error loading identifiers from {identifiers_file}: {e}")
            return []
    
    def search_file(self, file_path, identifiers):
        """
        Search a file for identifiers
        
        Args:
            file_path (str): Path to the file to search
            identifiers (list): List of identifiers to search for
            
        Returns:
            list: List of (identifier, file_path) tuples for matches found
        """
        matches = []
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Search for each identifier
            for identifier in identifiers:
                # Use word boundary to ensure we match whole words/identifiers
                pattern = r'\b' + re.escape(identifier) + r'\b'
                if re.search(pattern, content):
                    matches.append(identifier)
                    self.logger.info(f"Found identifier '{identifier}' in {file_path}")
            
            return matches
        except UnicodeDecodeError:
            self.logger.warning(f"File {file_path} is not a text file or has unknown encoding")
            return []
        except Exception as e:
            self.logger.error(f"Error searching file {file_path}: {e}")
            return []
    
    def search_directory(self, directory, identifiers, recursive=True):
        """
        Search all text files in a directory for identifiers
        
        Args:
            directory (str): Directory to search
            identifiers (list): List of identifiers to search for
            recursive (bool): Whether to search subdirectories
            
        Returns:
            list: List of (identifier, file_path) tuples for matches found
        """
        matches = []
        
        try:
            # Get all files in directory
            if recursive:
                files = [os.path.join(root, file) 
                        for root, _, files in os.walk(directory) 
                        for file in files]
            else:
                files = [os.path.join(directory, file) 
                        for file in os.listdir(directory) 
                        if os.path.isfile(os.path.join(directory, file))]
            
            # Filter for text files
            text_extensions = ['.txt', '.csv', '.log', '.md', '.json', '.xml', '.html', '.htm']
            text_files = [f for f in files if any(f.lower().endswith(ext) for ext in text_extensions)]
            
            self.logger.info(f"Searching {len(text_files)} text files in {directory}")
            
            # Search each file
            for file_path in text_files:
                file_matches = self.search_file(file_path, identifiers)
                for identifier in file_matches:
                    matches.append((identifier, file_path))
            
            return matches
        except Exception as e:
            self.logger.error(f"Error searching directory {directory}: {e}")
            return []
    
    def search_zip_contents(self, zip_path, extract_dir, identifiers, s3_path=None):
        """
        Search extracted zip contents for identifiers
        
        Args:
            zip_path (str): Path to the original zip file
            extract_dir (str): Directory where zip was extracted
            identifiers (list): List of identifiers to search for
            s3_path (str): S3 path to the zip file (for reporting)
            
        Returns:
            list: List of search results
        """
        results = []
        
        # Search the extracted directory
        matches = self.search_directory(extract_dir, identifiers)
        
        # Format results
        for identifier, file_path in matches:
            # Get relative path within the zip
            rel_path = os.path.relpath(file_path, extract_dir)
            
            # Create result entry
            result = {
                'identifier': identifier,
                'zip_file': os.path.basename(zip_path),
                'file_in_zip': rel_path,
                'local_path': file_path,
                's3_path': s3_path if s3_path else 'Unknown'
            }
            
            results.append(result)
            self.results.append(result)
        
        self.logger.info(f"Found {len(results)} matches in {zip_path}")
        return results
    
    def save_results(self, output_file):
        """
        Save search results to a CSV file
        
        Args:
            output_file (str): Path to save results
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                
                # Write header
                writer.writerow(['Identifier', 'Zip File', 'File in Zip', 'S3 Path'])
                
                # Write results
                for result in self.results:
                    writer.writerow([
                        result['identifier'],
                        result['zip_file'],
                        result['file_in_zip'],
                        result['s3_path']
                    ])
            
            self.logger.info(f"Saved {len(self.results)} results to {output_file}")
            return True
        except Exception as e:
            self.logger.error(f"Error saving results to {output_file}: {e}")
            return False
    
    def clear_results(self):
        """Clear all search results"""
        self.results = []
        self.logger.info("Cleared search results")

# For testing the text searcher independently
if __name__ == '__main__':
    import tempfile
    
    # Create a test directory
    test_dir = tempfile.mkdtemp()
    
    # Create test files with identifiers
    test_files = [
        ('file1.txt', 'This is a test file with identifier ABC123'),
        ('file2.txt', 'This file contains XYZ789'),
        ('file3.txt', 'No identifiers here'),
        ('file4.txt', 'Multiple identifiers: ABC123 and DEF456')
    ]
    
    for filename, content in test_files:
        with open(os.path.join(test_dir, filename), 'w') as f:
            f.write(content)
    
    # Create identifiers file
    identifiers_file = os.path.join(test_dir, 'identifiers.txt')
    with open(identifiers_file, 'w') as f:
        f.write('ABC123\nDEF456\nXYZ789\n')
    
    # Initialize text searcher
    searcher = TextSearcher()
    
    # Load identifiers
    identifiers = searcher.load_identifiers(identifiers_file)
    print(f"Loaded identifiers: {identifiers}")
    
    # Search directory
    matches = searcher.search_directory(test_dir, identifiers)
    print(f"Matches found: {matches}")
    
    # Save results
    results = []
    for identifier, file_path in matches:
        results.append({
            'identifier': identifier,
            'zip_file': 'test.zip',
            'file_in_zip': os.path.basename(file_path),
            'local_path': file_path,
            's3_path': 's3://test-bucket/test.zip'
        })
    
    searcher.results = results
    output_file = os.path.join(test_dir, 'results.csv')
    searcher.save_results(output_file)
    
    # Clean up
    import shutil
    shutil.rmtree(test_dir)
    print("Test completed and cleaned up")
