import os

supabase_url = os.environ.get("SUPABASE_URL", "https://iruzaaplerviivzcnnyl.supabase.co")
anon_key = os.environ.get("SUPABASE_ANON_KEY", "")
service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

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
