import os

supabase_url = os.environ.get("SUPABASE_URL", "https://iruzaaplerviivzcnnyl.supabase.co")
service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}"
}

req = urllib.request.Request(f"{supabase_url}/rest/v1/", headers=headers)
with urllib.request.urlopen(req) as resp:
    spec = json.loads(resp.read().decode('utf-8'))
    for path, data in spec.get("paths", {}).items():
        if "/rpc/" in path:
            print(path, data)
