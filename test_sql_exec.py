import urllib.request
import json

supabase_url = "https://iruzaaplerviivzcnnyl.supabase.co"
service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydXphYXBsZXJ2aWl2emNubnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTEwNDA5MywiZXhwIjoyMDk0NjgwMDkzfQ.ItiK_3mx28lu8Fa0J7M7HqzBt1XQxWhTxpkxFTKbLPo"

headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json"
}

# Check if rls_auto_enable or any rpc function can be called
rpc_url = f"{supabase_url}/rest/v1/rpc/rls_auto_enable"
req = urllib.request.Request(rpc_url, headers=headers, data=b"{}", method="POST")

try:
    with urllib.request.urlopen(req) as resp:
        print("RPC rls_auto_enable response:", resp.read().decode('utf-8'))
except Exception as e:
    print("RPC call result:", e)
