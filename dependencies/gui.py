import PySimpleGUI as sg
import os
import json
from pathlib import Path

class S3SearchGUI:
    def __init__(self):
        # Set theme
        sg.theme('LightBlue2')
        
        # Define the layout
        self.layout = [
            [sg.Text('S3 File Search Application', size=(40, 1), font=('Helvetica', 16), justification='center')],
            
            # AWS Credentials Section
            [sg.Frame('AWS Credentials', [
                [sg.Text('AWS Access Key ID:'), sg.Input(key='-AWS_ACCESS_KEY-', size=(30, 1))],
                [sg.Text('AWS Secret Access Key:'), sg.Input(key='-AWS_SECRET_KEY-', size=(30, 1), password_char='*')],
                [sg.Text('AWS Region:'), sg.Input(key='-AWS_REGION-', size=(30, 1), default_text='us-east-1')],
                [sg.Checkbox('Save credentials for future use', key='-SAVE_CREDS-')]
            ])],
            
            # S3 Bucket Configuration
            [sg.Frame('S3 Bucket Configuration', [
                [sg.Text('Bucket Name:'), sg.Input(key='-BUCKET_NAME-', size=(30, 1))],
                [sg.Text('Prefix (optional):'), sg.Input(key='-PREFIX-', size=(30, 1))]
            ])],
            
            # Identifiers List File
            [sg.Frame('Identifiers List', [
                [sg.Text('Select file containing identifiers:')],
                [sg.Input(key='-IDENTIFIERS_FILE-', size=(40, 1)), 
                 sg.FileBrowse(file_types=(("Text Files", "*.txt"), ("CSV Files", "*.csv"), ("All Files", "*.*")))],
                [sg.Text('Identifier format:'), 
                 sg.Radio('One per line', 'IDFORMAT', key='-ID_FORMAT_LINE-', default=True),
                 sg.Radio('CSV', 'IDFORMAT', key='-ID_FORMAT_CSV-')]
            ])],
            
            # Zip Password
            [sg.Frame('Zip File Settings', [
                [sg.Text('Zip Password:'), sg.Input('GDSLink13!', key='-ZIP_PASSWORD-', size=(30, 1), password_char='*')],
                [sg.Checkbox('Show password', key='-SHOW_PASSWORD-', enable_events=True)]
            ])],
            
            # Output Settings
            [sg.Frame('Output Settings', [
                [sg.Text('Results file:')],
                [sg.Input(key='-RESULTS_FILE-', size=(40, 1)), 
                 sg.SaveAs(file_types=(("CSV Files", "*.csv"), ("Text Files", "*.txt"), ("All Files", "*.*")))],
                [sg.Checkbox('Show results in application', key='-SHOW_RESULTS-', default=True)]
            ])],
            
            # Progress and Status
            [sg.ProgressBar(100, orientation='h', size=(44, 20), key='-PROGRESS-')],
            [sg.Text('Ready', key='-STATUS-', size=(60, 1))],
            
            # Buttons
            [sg.Button('Start Search', key='-SEARCH-'), 
             sg.Button('Stop', key='-STOP-', disabled=True),
             sg.Button('Exit', key='-EXIT-')],
            
            # Results Display
            [sg.Frame('Search Results', [
                [sg.Multiline(size=(80, 15), key='-RESULTS-', disabled=True, autoscroll=True)]
            ])]
        ]
        
        # Create the window
        self.window = sg.Window('S3 File Search Application', self.layout, resizable=True, finalize=True)
        
        # Load saved credentials if available
        self.load_saved_credentials()
    
    def load_saved_credentials(self):
        """Load saved AWS credentials if available"""
        creds_file = Path.home() / '.s3_search_creds.json'
        if creds_file.exists():
            try:
                with open(creds_file, 'r') as f:
                    creds = json.load(f)
                    self.window['-AWS_ACCESS_KEY-'].update(creds.get('access_key', ''))
                    self.window['-AWS_SECRET_KEY-'].update(creds.get('secret_key', ''))
                    self.window['-AWS_REGION-'].update(creds.get('region', 'us-east-1'))
                    self.window['-BUCKET_NAME-'].update(creds.get('bucket_name', ''))
                    self.window['-PREFIX-'].update(creds.get('prefix', ''))
            except Exception as e:
                print(f"Error loading credentials: {e}")
    
    def save_credentials(self, values):
        """Save AWS credentials if the save option is checked"""
        if values['-SAVE_CREDS-']:
            creds = {
                'access_key': values['-AWS_ACCESS_KEY-'],
                'secret_key': values['-AWS_SECRET_KEY-'],
                'region': values['-AWS_REGION-'],
                'bucket_name': values['-BUCKET_NAME-'],
                'prefix': values['-PREFIX-']
            }
            creds_file = Path.home() / '.s3_search_creds.json'
            try:
                with open(creds_file, 'w') as f:
                    json.dump(creds, f)
            except Exception as e:
                sg.popup_error(f"Error saving credentials: {e}")
    
    def update_status(self, message):
        """Update the status message in the GUI"""
        self.window['-STATUS-'].update(message)
        self.window.refresh()
    
    def update_progress(self, value):
        """Update the progress bar in the GUI"""
        self.window['-PROGRESS-'].update(value)
        self.window.refresh()
    
    def update_results(self, message):
        """Update the results display in the GUI"""
        current_text = self.window['-RESULTS-'].get()
        self.window['-RESULTS-'].update(current_text + message + '\n')
        self.window.refresh()
    
    def run(self):
        """Main event loop for the GUI"""
        while True:
            event, values = self.window.read()
            
            if event == sg.WIN_CLOSED or event == '-EXIT-':
                break
            
            # Toggle password visibility
            if event == '-SHOW_PASSWORD-':
                if values['-SHOW_PASSWORD-']:
                    self.window['-ZIP_PASSWORD-'].update(password_char='')
                else:
                    self.window['-ZIP_PASSWORD-'].update(password_char='*')
            
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
                self.save_credentials(values)
                
                # Disable search button, enable stop button
                self.window['-SEARCH-'].update(disabled=True)
                self.window['-STOP-'].update(disabled=False)
                
                # Clear results
                self.window['-RESULTS-'].update('')
                
                # Here we would call the search function from the main application
                # For now, just update status
                self.update_status('Search started...')
                
                # This would be replaced with actual search functionality
                self.update_status('Search completed')
                self.window['-SEARCH-'].update(disabled=False)
                self.window['-STOP-'].update(disabled=True)
            
            # Stop button clicked
            if event == '-STOP-':
                # Here we would implement the stop functionality
                self.update_status('Search stopped')
                self.window['-SEARCH-'].update(disabled=False)
                self.window['-STOP-'].update(disabled=True)
        
        self.window.close()

# For testing the GUI independently
if __name__ == '__main__':
    app = S3SearchGUI()
    app.run()
