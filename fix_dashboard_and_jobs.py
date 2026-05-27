import re

# ====================================================
# PATCH 1: job-postings.js (Fix Applicant Counts)
# ====================================================

with open('js/job-postings.js', 'r', encoding='utf-8') as f:
    jp_content = f.read()

# Replace the current loadJobsFromSupabase with a version that joins candidates
new_load_jobs = """    async loadJobsFromSupabase() {
        try {
            const { data: jobs, error } = await supabaseClient
                .from("jobs")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            console.log("✅ Jobs loaded from Supabase:", jobs);

            const { data: candidates, error: candError } = await supabaseClient
                .from("candidates")
                .select("job_title");

            const applicantCounts = {};
            if (candidates) {
                candidates.forEach(c => {
                    const title = c.job_title || 'Unknown Job';
                    applicantCounts[title] = (applicantCounts[title] || 0) + 1;
                });
            }

            const mappedJobs = jobs.map(j => ({
                id: j.id,
                title: j.title,
                department: j.department || 'Engineering',
                date: new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                applicants: applicantCounts[j.title] || 0,
                status: j.status || 'Open',
                experience: j.experience_level || 'Mid-level',
                description: j.description || ''
            }));
            
            this.saveJobs(mappedJobs);
            this.renderJobs(mappedJobs);

        } catch (error) {
            console.error("❌ Failed to load jobs:", error);
        }
    },"""

jp_content = re.sub(r'async loadJobsFromSupabase\(\) \{.*?(?=initData\(\) \{)', new_load_jobs + '\n    \n    // Original initData replaced\n    ', jp_content, flags=re.DOTALL)

with open('js/job-postings.js', 'w', encoding='utf-8') as f:
    f.write(jp_content)


# ====================================================
# PATCH 2: dashboard.js (Fix filtering and mapping logic)
# ====================================================

with open('js/dashboard.js', 'r', encoding='utf-8') as f:
    db_content = f.read()

# 1. Update loadCandidatesFromSupabase to strictly default status to Pending so it doesn't fail filters
new_load_candidates = """    async loadCandidatesFromSupabase() {
        try {
            const { data: candidates, error } = await supabaseClient
                .from("candidates")
                .select("*")
                .order("date_applied", { ascending: false });

            if (error) throw error;
            console.log("✅ Candidates loaded from Supabase:", candidates);

            // Fetch applications to get actual status
            const { data: apps } = await supabaseClient.from("applications").select("candidate_id, status");
            const statusMap = {};
            if (apps) {
                apps.forEach(app => {
                    statusMap[app.candidate_id] = app.status;
                });
            }

            this.allCandidates = candidates.map(c => {
                let sustainScore = c.sustainability_score || 0;
                let sustainVal = 'Marginally Suitable';
                if (sustainScore >= 80) sustainVal = 'Highly Suitable';
                else if (sustainScore >= 50) sustainVal = 'Suitable';

                // Look up status from applications table
                let realStatus = statusMap[c.id] || "Pending";
                if (realStatus.toLowerCase() === "pending") realStatus = "Pending";
                if (realStatus.toLowerCase() === "shortlisted") realStatus = "Shortlisted";
                if (realStatus.toLowerCase() === "rejected") realStatus = "Rejected";

                return {
                    id: c.id,
                    name: c.name || "Unknown Candidate",
                    email: c.email || "No Email",
                    phone: c.phone || "No Phone",
                    experience: c.years_of_experience || "0",
                    jobTitle: c.job_title || "Unknown Job",
                    score: c.overall_score || 0,
                    status: realStatus,
                    sustainability: sustainVal,
                    date: new Date(c.date_applied).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
                    dateApplied: c.date_applied,
                    original: c
                };
            });

            this.populateJobDropdown();
            this.applyInitialFilters();

        } catch (error) {
            console.error("❌ Failed to load candidates:", error);
        }
    },"""

db_content = re.sub(r'async loadCandidatesFromSupabase\(\) \{.*?(?=populateJobDropdown\(\) \{)', new_load_candidates + '\n\n    ', db_content, flags=re.DOTALL)


# 2. Fix the applyFilters matching logic
new_apply_filters = """    applyFilters() {
        const searchInput = document.getElementById('search-candidates');
        const jobFilterEl = document.getElementById('job-filter');
        const statusFilterEl = document.getElementById('status-filter');

        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        const jobFilter = jobFilterEl ? jobFilterEl.value : 'all';
        const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';

        this.filteredData = this.allCandidates.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(searchText) || c.email.toLowerCase().includes(searchText);
            const matchJob = (jobFilter === 'all' || jobFilter === 'All Postings') ? true : c.jobTitle === jobFilter;
            const matchStatus = statusFilter === 'all' ? true : c.status.toLowerCase() === statusFilter.toLowerCase();
            return matchSearch && matchJob && matchStatus;
        });

        this.currentPage = 1;
        this.renderTable();
        this.renderPagination();
    },"""

db_content = re.sub(r'applyFilters\(\) \{.*?(?=openEmailModal)', new_apply_filters + '\n\n    ', db_content, flags=re.DOTALL)


with open('js/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(db_content)
