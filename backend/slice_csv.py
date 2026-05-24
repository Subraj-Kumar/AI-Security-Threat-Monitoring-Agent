# slice_csv.py
import os

# Change this to the exact name of the giant file you downloaded
INPUT_FILE = "app/data/botsv1.WinEventLog_Security.csv" 

# This is where your backend endpoint expects the data to be!
OUTPUT_FILE = "app/data/bots_real_auth.csv" 
LINES_TO_KEEP = 10000000

print(f"Slicing the first {LINES_TO_KEEP} lines from {INPUT_FILE}...")

# Ensure the output directory exists
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

try:
    with open(INPUT_FILE, "r", encoding="utf-8") as infile, \
         open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
         
        for i, line in enumerate(infile):
            if i >= LINES_TO_KEEP:
                break
            outfile.write(line)
            
    print(f"✅ Done! Successfully created {OUTPUT_FILE}")
except FileNotFoundError:
    print(f"❌ Error: Could not find '{INPUT_FILE}'. Check the file name.")