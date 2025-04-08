import os
import tempfile
import pyzipper
import csv
import shutil
import random
import string

def create_test_data():
    """
    Create test data for the S3 file search application
    
    This function creates:
    1. A temporary directory structure mimicking an S3 bucket
    2. Multiple folders with password-protected zip files
    3. Text files inside the zip files with random identifiers
    4. A list of identifiers to search for
    
    Returns:
        tuple: (test_dir, identifiers_file, identifiers)
    """
    # Create main test directory
    test_dir = tempfile.mkdtemp(prefix='s3_search_test_')
    print(f"Created test directory: {test_dir}")
    
    # Create identifiers
    identifiers = [
        'ABC123456',
        'XYZ789012',
        'DEF345678',
        'GHI901234',
        'JKL567890'
    ]
    
    # Create identifiers file
    identifiers_file = os.path.join(test_dir, 'identifiers.txt')
    with open(identifiers_file, 'w') as f:
        for identifier in identifiers:
            f.write(f"{identifier}\n")
    print(f"Created identifiers file: {identifiers_file}")
    
    # Create folder structure
    folders = ['folder1', 'folder2', 'folder3']
    for folder in folders:
        folder_path = os.path.join(test_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Create zip files in each folder
        for zip_idx in range(1, 4):  # 3 zip files per folder
            zip_name = f"archive_{zip_idx}.zip"
            zip_path = os.path.join(folder_path, zip_name)
            
            # Create temporary directory for files to be zipped
            temp_files_dir = tempfile.mkdtemp()
            
            # Create text files with random content and some identifiers
            num_files = random.randint(3, 7)
            for file_idx in range(1, num_files + 1):
                file_name = f"document_{file_idx}.txt"
                file_path = os.path.join(temp_files_dir, file_name)
                
                # Generate random content
                content = generate_random_text()
                
                # Randomly insert identifiers in some files
                if random.random() < 0.7:  # 70% chance to include an identifier
                    identifier = random.choice(identifiers)
                    position = random.randint(0, len(content) - 1)
                    content = content[:position] + f" {identifier} " + content[position:]
                
                # Write content to file
                with open(file_path, 'w') as f:
                    f.write(content)
            
            # Create password-protected zip file
            with pyzipper.AESZipFile(zip_path, 'w', compression=pyzipper.ZIP_LZMA, encryption=pyzipper.WZ_AES) as zf:
                zf.setpassword(b'GDSLink13!')
                
                # Add all files in temp directory to zip
                for root, _, files in os.walk(temp_files_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, temp_files_dir)
                        zf.write(file_path, arcname=arcname)
            
            print(f"Created zip file: {zip_path}")
            
            # Clean up temporary files
            shutil.rmtree(temp_files_dir)
    
    # Create a mapping file showing which identifiers are in which zip files
    # This will be used to verify the test results
    mapping_file = os.path.join(test_dir, 'expected_results.csv')
    with open(mapping_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Identifier', 'Folder', 'Zip File'])
        
        # We don't actually know which identifiers are in which files at this point
        # This is just a placeholder - in a real test we would track this during creation
        writer.writerow(['See test results for actual mapping', '', ''])
    
    return test_dir, identifiers_file, identifiers

def generate_random_text(paragraphs=3, sentences_per_paragraph=5, words_per_sentence=10):
    """Generate random text content"""
    text = ""
    
    for _ in range(paragraphs):
        paragraph = ""
        for _ in range(sentences_per_paragraph):
            words = []
            for _ in range(random.randint(5, words_per_sentence)):
                word_length = random.randint(3, 10)
                word = ''.join(random.choice(string.ascii_lowercase) for _ in range(word_length))
                words.append(word)
            
            sentence = ' '.join(words) + '. '
            paragraph += sentence
        
        text += paragraph + "\n\n"
    
    return text

def test_application():
    """Test the S3 file search application with sample data"""
    # Create test data
    test_dir, identifiers_file, identifiers = create_test_data()
    
    print("\nTest data created successfully!")
    print(f"Test directory: {test_dir}")
    print(f"Identifiers file: {identifiers_file}")
    print(f"Identifiers: {identifiers}")
    
    print("\nTo test the application:")
    print("1. Run the application with: python3 main.py")
    print("2. Use the following test data:")
    print(f"   - Identifiers file: {identifiers_file}")
    print("   - AWS credentials: Use your own or mock credentials")
    print("   - Zip password: GDSLink13!")
    print("3. For local testing without S3, you can modify the application to use local files")
    print("   or set up a mock S3 server like MinIO")
    
    return test_dir

if __name__ == "__main__":
    test_dir = test_application()
    print(f"\nTest directory: {test_dir}")
