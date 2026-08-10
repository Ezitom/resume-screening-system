import urllib.request
import json

SUPABASE_URL = "https://iruzaaplerviivzcnnyl.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydXphYXBsZXJ2aWl2emNubnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDQwOTMsImV4cCI6MjA5NDY4MDA5M30.akeNab9dtPz9fVouW-Lligd7boq93x0hRcZfRY5NBC0"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydXphYXBsZXJ2aWl2emNubnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTEwNDA5MywiZXhwIjoyMDk0NjgwMDkzfQ.ItiK_3mx28lu8Fa0J7M7HqzBt1XQxWhTxpkxFTKbLPo"

def fetch_jobs(key, role_name, query_params=""):
    url = f"{SUPABASE_URL}/rest/v1/jobs?select=*{query_params}"
    req = urllib.request.Request(url, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[{role_name}] Query URL: {url}")
            print(f"[{role_name}] Total Jobs Found: {len(data)}")
            for j in data:
                print(f"  - ID: {j.get('id')}, Title: {j.get('title')}, Status: {j.get('status')}")
            return data
    except Exception as e:
        print(f"[{role_name}] Error: {e}")
        return []

if __name__ == "__main__":
    print("==========================================")
    print("1. VERIFICATION: ANON CANDIDATE ACCESS")
    print("==========================================")
    anon_jobs = fetch_jobs(ANON_KEY, "ANON CANDIDATE ROLE")
    
    print("\n==========================================")
    print("2. VERIFICATION: AUTHENTICATED / RECRUITER ACCESS")
    print("==========================================")
    recruiter_jobs = fetch_jobs(SERVICE_ROLE_KEY, "RECRUITER / SERVICE ROLE")
