# S3 File Search Application

## Overview
This application connects to an Amazon S3 bucket, searches through password-protected zip files for specific identifiers, and creates a report of where those identifiers were found.

## Features
- Connect to Amazon S3 buckets using AWS credentials
- Navigate folder structures within S3 buckets
- Download and process password-protected zip files
- Search for unique identifiers within text files
- Generate reports showing which identifiers were found in which files
- User-friendly GUI interface
- Progress tracking and status updates
- Credential saving for future use

## Requirements
- Python 3.6+
- Required Python packages:
  - boto3
  - PySimpleGUI
  - python-dotenv
  - pyzipper

## Installation
1. Ensure Python 3.6 or higher is installed
2. Install required packages:
   ```
   pip install boto3 PySimpleGUI python-dotenv pyzipper
   ```
3. Download the application files

## Usage
1. Run the application:
   ```
   python main.py
   ```

2. Enter your AWS credentials:
   - AWS Access Key ID
   - AWS Secret Access Key
   - AWS Region (default: us-east-1)
   - Check "Save credentials for future use" to store credentials locally

3. Configure S3 bucket settings:
   - Bucket Name: The name of your S3 bucket
   - Prefix (optional): A folder prefix to limit the search scope

4. Select a file containing identifiers:
   - The file should contain one identifier per line or be in CSV format
   - Select the appropriate format option

5. Verify the zip password:
   - The default password is "GDSLink13!"
   - Modify if your zip files use a different password

6. Configure output settings:
   - Specify a file to save the results
   - Check "Show results in application" to display results in the GUI

7. Click "Start Search" to begin the search process

8. Monitor progress in the status bar and results area

9. When complete, the results will be displayed in the application and saved to the specified file

## File Structure
- `main.py`: Main application entry point
- `gui.py`: GUI interface implementation
- `s3_connection.py`: S3 connection and file handling
- `zip_extractor.py`: Password-protected zip file extraction
- `text_searcher.py`: Text search functionality
- `test_data.py`: Test data generation (for testing only)
- `test_app.py`: Application testing (for testing only)

## Testing
For testing without an actual S3 bucket:
1. Run the test data generator:
   ```
   python test_data.py
   ```
2. Run the test application:
   ```
   python test_app.py
   ```

## Security Notes
- AWS credentials are stored locally in `~/.s3_search_creds.json` if the save option is selected
- The zip password is not stored between sessions unless saved in credentials
- All temporary files are cleaned up after processing

## Troubleshooting
- If connection fails, verify AWS credentials and network connectivity
- If zip extraction fails, verify the password is correct
- If no results are found, check that identifiers are in the correct format
- For large buckets, the search may take a long time to complete

## License
This application is provided as-is without any warranty. Use at your own risk.
