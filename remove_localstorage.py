import os
import glob

files = glob.glob('js/*.js')

remove_keys = ['candidates_list', 'eben-submissions', 'eben-job-postings', 'job_applicants_']

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    new_lines = []
    modified = False
    for line in lines:
        if 'localStorage' in line and any(key in line for key in remove_keys):
            modified = True
            # comment it out to remove it safely
            new_lines.append('// REMOVED BY SUPABASE MIGRATION: ' + line.strip() + '\n')
        else:
            new_lines.append(line)
            
    if modified:
        with open(file, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Updated {file}")
