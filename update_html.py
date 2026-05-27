import glob

scripts = """    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="supabase-client.js"></script>"""

for f in glob.glob('*.html'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'supabase-client.js' not in content and '<head>' in content:
        new_content = content.replace('<head>', '<head>\n' + scripts, 1)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {f}")
