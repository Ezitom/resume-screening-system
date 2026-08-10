import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://iruzaaplerviivzcnnyl.supabase.co")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

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
