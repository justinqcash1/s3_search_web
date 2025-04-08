import os
import threading
import PySimpleGUI as sg
from pathlib import Path
import csv
import time
import traceback

from gui import S3SearchGUI
from s3_connection import S3Connection
from zip_extractor import ZipExtractor
from text_searcher import TextSearcher

class S3SearchApp:
    def __init__(self):
        """Initialize the S3 Search Application"""
        self.gui = S3SearchGUI()
        self.s3_conn = None
        self.extractor = None
        self.searcher = None
        self.search_thread = None
        self.stop_search = False
        self.temp_dir = None
        
    def initialize_components(self, values):
        """
        Initialize all components with user-provided values
        
        Args:
            values (dict): Values from the GUI
            
        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            # Initialize S3 connection
            self.s3_conn = S3Connection(
                access_key=values['-AWS_ACCESS_KEY-'],
                secret_key=values['-AWS_SECRET_KEY-'],
                region=values['-AWS_REGION-']
            )
            
            # Connect to S3
            if not self.s3_conn.connect():
                self.gui.update_status("Failed to connect to AWS S3. Check credentials.")
                return False
            
            # Initialize zip extractor
            self.extractor = ZipExtractor(zip_password=values['-ZIP_PASSWORD-'])
            self.temp_dir = self.extractor.setup_temp_directory()
            
            # Initialize text searcher
            self.searcher = TextSearcher()
            
            return True
        except Exception as e:
            self.gui.update_status(f"Error initializing components: {e}")
            return False
    
    def load_identifiers(self, values):
        """
        Load identifiers from the specified file
        
        Args:
            values (dict): Values from the GUI
            
        Returns:
            list: List of identifiers
        """
        identifiers_file = values['-IDENTIFIERS_FILE-']
        format_type = 'csv' if values['-ID_FORMAT_CSV-'] else 'line'
        
        identifiers = self.searcher.load_identifiers(identifiers_file, format_type)
        
        if not identifiers:
            self.gui.update_status(f"No identifiers found in {identifiers_file}")
        else:
            self.gui.update_status(f"Loaded {len(identifiers)} identifiers from {identifiers_file}")
        
        return identifiers
    
    def search_s3_bucket(self, values):
        """
        Main search function to be run in a separate thread
        
        Args:
            values (dict): Values from the GUI
        """
        try:
            # Reset stop flag
            self.stop_search = False
            
            # Initialize components
            if not self.initialize_components(values):
                return
            
            # Load identifiers
            identifiers = self.load_identifiers(values)
            if not identifiers:
                return
            
            # Get bucket and prefix
            bucket_name = values['-BUCKET_NAME-']
            prefix = values['-PREFIX-']
            
            # List folders in the bucket
            self.gui.update_status(f"Listing folders in bucket {bucket_name}...")
            folders = self.s3_conn.list_folders(bucket_name, prefix)
            
            if not folders and prefix:
                # If no folders found with prefix, try using the prefix as a folder
                folders = [prefix]
            elif not folders:
                # If no folders found and no prefix, search the entire bucket
                folders = ['']
            
            self.gui.update_status(f"Found {len(folders)} folders to search")
            
            # Initialize progress
            total_folders = len(folders)
            processed_folders = 0
            
            # Process each folder
            for folder_idx, folder in enumerate(folders):
                if self.stop_search:
                    self.gui.update_status("Search stopped by user")
                    break
                
                self.gui.update_status(f"Searching folder {folder_idx+1}/{total_folders}: {folder}")
                
                # List zip files in the folder
                zip_files = self.s3_conn.filter_objects_by_extension(bucket_name, folder, '.zip')
                
                if not zip_files:
                    self.gui.update_status(f"No zip files found in folder {folder}")
                    processed_folders += 1
                    self.gui.update_progress(int(100 * processed_folders / total_folders))
                    continue
                
                self.gui.update_status(f"Found {len(zip_files)} zip files in folder {folder}")
                
                # Process each zip file
                total_zips = len(zip_files)
                for zip_idx, zip_key in enumerate(zip_files):
                    if self.stop_search:
                        break
                    
                    # Calculate overall progress
                    progress = int(100 * (processed_folders / total_folders + 
                                         (zip_idx / total_zips) / total_folders))
                    self.gui.update_progress(progress)
                    
                    # Update status
                    self.gui.update_status(f"Processing zip {zip_idx+1}/{total_zips}: {zip_key}")
                    
                    # Download the zip file
                    local_zip = os.path.join(self.temp_dir, os.path.basename(zip_key))
                    if not self.s3_conn.download_file(bucket_name, zip_key, local_zip):
                        self.gui.update_status(f"Failed to download {zip_key}")
                        continue
                    
                    # Extract the zip file
                    extract_dir = os.path.join(self.temp_dir, f"extract_{os.path.basename(zip_key)}")
                    success, _ = self.extractor.extract_zip(local_zip, extract_dir)
                    
                    if not success:
                        self.gui.update_status(f"Failed to extract {zip_key}")
                        continue
                    
                    # Search for identifiers in the extracted files
                    s3_path = f"s3://{bucket_name}/{zip_key}"
                    results = self.searcher.search_zip_contents(local_zip, extract_dir, identifiers, s3_path)
                    
                    # Update results in GUI
                    if results:
                        result_text = f"Found {len(results)} matches in {zip_key}:\n"
                        for result in results:
                            result_text += f"  - {result['identifier']} in {result['file_in_zip']}\n"
                        self.gui.update_results(result_text)
                
                processed_folders += 1
            
            # Save results if requested
            if values['-RESULTS_FILE-']:
                self.searcher.save_results(values['-RESULTS_FILE-'])
                self.gui.update_status(f"Results saved to {values['-RESULTS_FILE-']}")
            
            # Complete
            self.gui.update_progress(100)
            self.gui.update_status("Search completed")
            
            # Re-enable search button, disable stop button
            self.gui.window['-SEARCH-'].update(disabled=False)
            self.gui.window['-STOP-'].update(disabled=True)
            
        except Exception as e:
            self.gui.update_status(f"Error during search: {str(e)}")
            traceback.print_exc()
            
            # Re-enable search button, disable stop button
            self.gui.window['-SEARCH-'].update(disabled=False)
            self.gui.window['-STOP-'].update(disabled=True)
        finally:
            # Clean up
            if self.extractor:
                self.extractor.cleanup()
    
    def run(self):
        """Run the application"""
        while True:
            event, values = self.gui.window.read()
            
            if event == sg.WIN_CLOSED or event == '-EXIT-':
                break
            
            # Toggle password visibility
            if event == '-SHOW_PASSWORD-':
                if values['-SHOW_PASSWORD-']:
                    self.gui.window['-ZIP_PASSWORD-'].update(password_char='')
                else:
                    self.gui.window['-ZIP_PASSWORD-'].update(password_char='*')
            
            # Start search button clicked
            if event == '-SEARCH-':
                # Validate inputs
                if not values['-AWS_ACCESS_KEY-'] or not values['-AWS_SECRET_KEY-'] or not values['-BUCKET_NAME-']:
                    sg.popup_error('AWS credentials and bucket name are required')
                    continue
                
                if not values['-IDENTIFIERS_FILE-'] or not os.path.exists(values['-IDENTIFIERS_FILE-']):
                    sg.popup_error('Please select a valid identifiers file')
                    continue
                
                # Save credentials if requested
                self.gui.save_credentials(values)
                
                # Disable search button, enable stop button
                self.gui.window['-SEARCH-'].update(disabled=True)
                self.gui.window['-STOP-'].update(disabled=False)
                
                # Clear results
                self.gui.window['-RESULTS-'].update('')
                
                # Start search in a separate thread
                self.search_thread = threading.Thread(target=self.search_s3_bucket, args=(values,))
                self.search_thread.daemon = True
                self.search_thread.start()
            
            # Stop button clicked
            if event == '-STOP-':
                self.stop_search = True
                self.gui.update_status("Stopping search...")
        
        # Clean up
        if self.extractor:
            self.extractor.cleanup()
        
        self.gui.window.close()

if __name__ == '__main__':
    app = S3SearchApp()
    app.run()
