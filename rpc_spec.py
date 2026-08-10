import urllib.request
import json

supabase_url = "https://iruzaaplerviivzcnnyl.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydXphYXBsZXJ2aWl2emNubnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTEwNDA5MywiZXhwIjoyMDk0NjgwMDkzfQ.ItiK_3mx28lu8Fa0J7M7HqzBt1XQxWhTxpkxFTKbLPo"

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
