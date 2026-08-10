import urllib.request
import json

supabase_url = "https://iruzaaplerviivzcnnyl.supabase.co"
anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydXphYXBsZXJ2aWl2emNubnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDQwOTMsImV4cCI6MjA5NDY4MDA5M30.akeNab9dtPz9fVouW-Lligd7boq93x0hRcZfRY5NBC0"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydXphYXBsZXJ2aWl2emNubnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTEwNDA5MywiZXhwIjoyMDk0NjgwMDkzfQ.ItiK_3mx28lu8Fa0J7M7HqzBt1XQxWhTxpkxFTKbLPo"

def query_jobs(key, label):
    url = f"{supabase_url}/rest/v1/jobs?select=*"
    req = urllib.request.Request(url, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[{label}] Returned {len(data)} jobs: {data}")
            return data
    except Exception as e:
        print(f"[{label}] Error: {e}")
        return None

print("--- BEFORE POLICY / CURRENT STATE ---")
query_jobs(anon_key, "ANON KEY")
query_jobs(service_key, "SERVICE ROLE KEY")
