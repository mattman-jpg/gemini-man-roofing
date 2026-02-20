import pandas as pd
import os
import re
import glob

OUTPUT_FILE = "contractor_leads.csv"
IGNORE_FILES = ["contractor_leads.csv", "test_leads.csv", "template.csv"]

def normalize_columns(df):
    """
    Standardize column names to lower case and snake_case.
    e.g., "Business Name" -> "name", "Phone Number" -> "phone"
    """
    df.columns = [str(col).strip().lower() for col in df.columns]
    
    # Map common variations to standard keys
    column_map = {
        'business name': 'name',
        'company': 'name',
        'phone number': 'phone',
        'mobile': 'phone',
        'cell': 'phone',
        'email address': 'email',
        'e-mail': 'email',
        'street address': 'address',
        'zip': 'zip_code',
        'postal code': 'zip_code'
    }
    
    df.rename(columns=lambda x: column_map.get(x, x), inplace=True)
    return df

def process_file(filepath):
    print(f"[INFO] Processing {filepath}...")
    try:
        if filepath.endswith('.xlsx'):
            df = pd.read_excel(filepath)
        else:
            df = pd.read_csv(filepath)
    except Exception as e:
        print(f"[ERROR] Failed to read {filepath}: {e}")
        return pd.DataFrame()

    df = normalize_columns(df)
    return df

def clean_data():
    # Find all Excel and CSV files
    input_files = glob.glob("*.xlsx") + glob.glob("*.csv")
    input_files = [f for f in input_files if f not in IGNORE_FILES and not f.startswith("~$")]
    
    if not input_files:
        print("[WARN] No input files found (looking for .xlsx or .csv).")
        return

    print(f"[INFO] Found files: {input_files}")
    
    all_leads = []
    
    for file in input_files:
        df = process_file(file)
        if df.empty:
            continue
            
        print(f"   -> {len(df)} raw rows")
        
        # Ensure we have target columns (even if empty) to avoid errors
        for col in ['email', 'phone', 'name', 'address', 'city']:
            if col not in df.columns:
                # fuzzy match
                match = next((c for c in df.columns if col in c), None)
                if match:
                    df.rename(columns={match: col}, inplace=True)
                else:
                    df[col] = '' # Initialize if missing

        # regex for basic email validity
        email_pattern = r'[^@]+@[^@]+\.[^@]+'
        
        for _, row in df.iterrows():
            email = str(row.get('email', '')).strip()
            phone = str(row.get('phone', '')).strip()
            
            # Clean up NaN/'nan'
            if email.lower() == 'nan': email = ''
            if phone.lower() == 'nan': phone = ''
            
            has_email = bool(email and re.match(email_pattern, email))
            has_phone = bool(phone) # Basic check, could be improved
            
            # Logic: Keep if match Email OR Phone
            if has_email or has_phone:
                # Standardize data for output
                all_leads.append({
                    'name': row.get('name', 'Unknown'),
                    'email': email if has_email else '',
                    'phone': phone if has_phone else '',
                    'address': row.get('address', ''),
                    'city': row.get('city', ''),
                    'source_file': file
                })

    if not all_leads:
        print("[WARN] No valid leads found after filtering.")
        return

    # Create Master DataFrame
    master_df = pd.DataFrame(all_leads)
    
    # Deduplicate (prefer rows with both, then email, then phone)
    # Simple dedup for now based on Email (if present) OR Phone
    initial_count = len(master_df)
    
    # 1. Drop exact duplicates
    master_df.drop_duplicates(subset=['email', 'phone'], inplace=True)
    
    # 2. More aggressive dedup could happen here, but precise dedup is risky without ID.
    # We will stick to basic dedup.
    
    final_count = len(master_df)
    
    print("------------------------------------------------")
    print(f"[SUCCESS] Consolidated Leads: {final_count}")
    print(f"[INFO] Emails Available: {len(master_df[master_df['email'] != ''])}")
    print(f"[INFO] Phones Available: {len(master_df[master_df['phone'] != ''])}")
    print("------------------------------------------------")

    master_df.to_csv(OUTPUT_FILE, index=False)
    print(f"[SAVED] Saved master list to {OUTPUT_FILE}")

if __name__ == "__main__":
    clean_data()
