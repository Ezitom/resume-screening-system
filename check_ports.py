import socket

for host in ["iruzaaplerviivzcnnyl.supabase.co", "db.iruzaaplerviivzcnnyl.supabase.co"]:
    for port in [5432, 6543]:
        try:
            s = socket.create_connection((host, port), timeout=3)
            print(f"Connected to {host}:{port}")
            s.close()
        except Exception as e:
            print(f"Failed {host}:{port} - {e}")
