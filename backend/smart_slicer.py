import os
import csv

# Point this to your massive downloaded file
INPUT_FILE = "app/data/botsv1.WinEventLog_Security.csv" 
OUTPUT_FILE = "app/data/bots_real_auth.csv"

# We want a mix of normal traffic and organic attacks
TARGET_FAILS = 5000      # Event 4625
TARGET_PRIV_ESC = 100    # Event 4728/4732
TARGET_NORMAL = 90000    # Event 4624

fails_found = 0
priv_esc_found = 0
normal_found = 0

print(f"Hunting for organic attacks inside {INPUT_FILE}...")

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

try:
    with open(INPUT_FILE, "r", encoding="utf-8-sig") as infile, \
         open(OUTPUT_FILE, "w", encoding="utf-8-sig", newline="") as outfile:
         
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        
        # Write the header
        header = next(reader)
        writer.writerow(header)
        
        for row in reader:
            # Assuming EventCode is roughly the 4th or 5th column. 
            # We convert the row to a string just to do a fast search.
            row_str = ",".join(row)
            
            if "4625" in row_str and fails_found < TARGET_FAILS:
                writer.writerow(row)
                fails_found += 1
            elif ("4728" in row_str or "4732" in row_str) and priv_esc_found < TARGET_PRIV_ESC:
                writer.writerow(row)
                priv_esc_found += 1
            elif "4624" in row_str and normal_found < TARGET_NORMAL:
                writer.writerow(row)
                normal_found += 1
                
            if fails_found == TARGET_FAILS and priv_esc_found == TARGET_PRIV_ESC and normal_found == TARGET_NORMAL:
                break

    print("✅ Done! Successfully extracted a highly-dense organic attack window.")
    print(f"Stats: {normal_found} Normal, {fails_found} Fails, {priv_esc_found} Priv Escs.")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")