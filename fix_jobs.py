import re

with open('js/job-postings.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleCreateJob
create_job = """
    async handleCreateJob() {
        const title = document.getElementById('job-title').value;
        const department = document.getElementById('job-dept').value;
        const description = document.getElementById('job-desc').value;
        const skills = document.getElementById('job-skills').value;
        const experience = document.getElementById('job-exp').value;
        const deadline = document.getElementById('ebenJobDeadline').value;

        try {
            const { error } = await supabaseClient
                .from('jobs')
                .insert([{
                    title: title,
                    department: department,
                    description: description,
                    experience_level: experience,
                    status: 'Open',
                    created_at: new Date().toISOString()
                }]);
                
            if (error) throw error;
            console.log("✅ Job created in Supabase");
            
            this.toggleModal(false);
            document.getElementById('new-posting-form').reset();
            this.loadJobsFromSupabase();
        } catch (error) {
            console.error("❌ Failed to create job:", error);
        }
    },
"""

content = re.sub(r'handleCreateJob\(\) \{.*?(?=renderJobs\()', create_job, content, flags=re.DOTALL)

# Fix updateStatus and deleteJob
update_delete = """
    async updateStatus(title, status) {
        try {
            const { error } = await supabaseClient
                .from('jobs')
                .update({ status: status })
                .eq('title', title);
                
            if (error) throw error;
            this.loadJobsFromSupabase();
        } catch (error) {
            console.error("❌ Failed to update job status:", error);
        }
    },

    async deleteJob(title) {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            try {
                const { error } = await supabaseClient
                    .from('jobs')
                    .delete()
                    .eq('title', title);
                    
                if (error) throw error;
                this.loadJobsFromSupabase();
            } catch (error) {
                console.error("❌ Failed to delete job:", error);
            }
        }
    },

    toggleModal(isOpen) {
"""

content = re.sub(r'updateStatus\(title, status\) \{.*?(?=toggleModal\(isOpen\))', update_delete, content, flags=re.DOTALL)

# Fix renderJobs signature bug
content = content.replace('const jobs = passedJobs || this.getJobs();', '')
# Ensure renderJobs uses passedJobs correctly 
# We need to fix renderJobs so it uses passedJobs safely
render_jobs = """
    renderJobs(passedJobs = null) {
        const grid = document.getElementById('job-postings-grid');
        if (!grid) return;

        const jobs = passedJobs || [];
"""
content = re.sub(r'renderJobs\(passedJobs = null\) \{.*?(?=// REMOVED BY SUPABASE MIGRATION: const submissions)', render_jobs, content, flags=re.DOTALL)

with open('js/job-postings.js', 'w', encoding='utf-8') as f:
    f.write(content)
