import urllib.request
import json
import os

supabase_url = os.environ.get("SUPABASE_URL", "https://iruzaaplerviivzcnnyl.supabase.co")
service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}"
}

req = urllib.request.Request(f"{supabase_url}/rest/v1/", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        spec = json.loads(resp.read().decode('utf-8'))
        paths = list(spec.get("paths", {}).keys())
        print("Available paths:", paths)
except Exception as e:
        print("Error fetching spec:", e)
