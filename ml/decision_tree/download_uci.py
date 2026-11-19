import urllib.request
import os
import zipfile

url = 'https://archive.ics.uci.edu/static/public/241/one+hundred+plant+species+leaves+data+set.zip'
dest_zip = 'data/uci_leaves.zip'
extract_dir = 'data/uci_leaves'

os.makedirs('data', exist_ok=True)
if not os.path.exists(dest_zip):
    print(f"Downloading UCI 241 from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as resp, open(dest_zip, 'wb') as out_f:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out_f.write(chunk)
    print("Download complete!")

if not os.path.exists(extract_dir):
    print("Extracting zip...")
    with zipfile.ZipFile(dest_zip, 'r') as z:
        z.extractall(extract_dir)
    print("Extracted successfully!")

print("Files in extracted directory:")
for root, dirs, files in os.walk(extract_dir):
    for f in files:
        if not f.endswith('.jpg'):
            print(os.path.join(root, f))
