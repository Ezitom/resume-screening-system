import re

# Update candidate-details.js
with open('js/candidate-details.js', 'r', encoding='utf-8') as f:
    cd_content = f.read()

supabase_cd = """
    async loadCandidateFromSupabase() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const candidateId = urlParams.get('id') || localStorage.getItem('eben-selected-candidate');
            if (!candidateId) return;

            this.candidateId = candidateId;
            localStorage.setItem('eben-selected-candidate', candidateId);

            const { data: candidate, error } = await supabaseClient
                .from("candidates")
                .select("*")
                .eq("id", candidateId)
                .single();

            if (error) throw error;
            console.log("✅ Candidate loaded from Supabase:", candidate);

            this.candidateData = {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                experience: candidate.years_of_experience,
                jobTitle: candidate.job_title,
                score: candidate.overall_score || 0,
                status: "Pending", // Usually loaded from applications table, but fine for now
                date: candidate.date_applied ? new Date(candidate.date_applied).toLocaleDateString() : "",
                sustainability: candidate.sustainability_score >= 80 ? 'Highly Suitable' : (candidate.sustainability_score >= 50 ? 'Suitable' : 'Marginally Suitable'),
                scoreBreakdown: JSON.parse(candidate.score_reasons || "{}"),
                resumeSummary: candidate.resume_summary,
                detectedSkills: JSON.parse(candidate.technical_skills || "[]"),
                education: JSON.parse(candidate.education || "[]"),
                workExperience: JSON.parse(candidate.experience || "[]")
            };

            // Populate left sidebar fields (mapping user's requested setField logic)
            const setField = (id, value) => {
                const el = document.getElementById(id);
                if (el && value) el.textContent = value;
            };

            setField("sidebar-candidate-name",  candidate.name);
            setField("sidebar-candidate-email", candidate.email);
            setField("sidebar-candidate-phone", candidate.phone || 'Not provided');
            setField("sidebar-candidate-experience", (candidate.years_of_experience || 0) + ' Years');
            setField("sidebar-candidate-date",  candidate.date_applied ? new Date(candidate.date_applied).toLocaleDateString() : "");
            setField("sidebar-candidate-job",   candidate.job_title || 'General Application');
            setField("breadcrumb-name", candidate.name);
            
            const emailTo = document.getElementById('email-to');
            if (emailTo) emailTo.value = candidate.email;
            
            setField("gauge-score-text", candidate.overall_score || 0);
            setField("sidebar-candidate-score", candidate.overall_score || 0);

            const sustainabilityVal = candidate.sustainability_score >= 80 ? 'Highly Suitable' : (candidate.sustainability_score >= 50 ? 'Suitable' : 'Marginally Suitable');
            setField("evaluation-suitability", sustainabilityVal);

            // Update status badge
            this.updateStatusBadge("Pending");

            // Update breakdown bars
            const breakdownContainer = document.getElementById('dynamic-score-breakdown');
            const loadingEl = document.getElementById('score-breakdown-loading');

            if (breakdownContainer && loadingEl) {
                breakdownContainer.style.display = 'none';
                loadingEl.style.display = 'block';

                setTimeout(() => {
                    loadingEl.style.display = 'none';
                    breakdownContainer.style.display = 'block';
                    
                    const scores = JSON.parse(candidate.score_reasons || "{}");
                    if (Object.keys(scores).length > 0) {
                        this.renderScoreBreakdown(scores, breakdownContainer);
                    } else {
                        breakdownContainer.innerHTML = '<p class="eben-text-secondary" style="padding: 16px; background: var(--eben-bg); border-radius: 4px; text-align: center;">Score breakdown unavailable.</p>';
                    }
                }, 800);
            }

            if (candidate.overall_score) {
                const fillPath = document.getElementById('gauge-fill-path');
                if (fillPath) {
                    const dashArray = 125.66;
                    const offset = dashArray - (dashArray * (candidate.overall_score / 100));
                    fillPath.style.strokeDashoffset = offset;
                }
            }

            // Render AI evaluation results
            this.ebenRenderResumeTab();

        } catch (error) {
            console.error("❌ Failed to load candidate:", error);
        }
    },
"""

cd_content = cd_content.replace('this.loadCandidateData();', 'this.loadCandidateFromSupabase();')
cd_content = re.sub(r'loadCandidateData\(\) \{.*?(?=renderScoreBreakdown)', supabase_cd, cd_content, flags=re.DOTALL)

with open('js/candidate-details.js', 'w', encoding='utf-8') as f:
    f.write(cd_content)


# Update job-postings.js
with open('js/job-postings.js', 'r', encoding='utf-8') as f:
    jp_content = f.read()

supabase_jp = """
    async loadJobsFromSupabase() {
        try {
            const { data: jobs, error } = await supabaseClient
                .from("jobs")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            console.log("✅ Jobs loaded from Supabase:", jobs);

            // Wire into existing job rendering logic
            // Map Supabase jobs to the existing local structure to avoid rewriting renderJobs
            const mappedJobs = jobs.map(j => ({
                id: j.id,
                title: j.title,
                department: j.department || 'Engineering',
                date: new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                applicants: 0,
                status: j.status || 'Open',
                experience: j.experience_level || 'Mid-level',
                description: j.description || ''
            }));
            
            this.saveJobs(mappedJobs); // Keep a cache if needed by other functions, but we just render
            this.renderJobs(mappedJobs);

        } catch (error) {
            console.error("❌ Failed to load jobs:", error);
        }
    },
    
    // Original initData replaced
    initData() {
        this.loadJobsFromSupabase();
    },
"""

jp_content = re.sub(r'initData\(\) \{.*?(?=getJobs\(\) \{)', supabase_jp, jp_content, flags=re.DOTALL)
# Make renderJobs accept an argument instead of getting from local storage
jp_content = jp_content.replace('renderJobs() {', 'renderJobs(passedJobs = null) {')
jp_content = jp_content.replace('const jobs = this.getJobs();', 'const jobs = passedJobs || this.getJobs();')

with open('js/job-postings.js', 'w', encoding='utf-8') as f:
    f.write(jp_content)
