/* job-postings.js */

const ebenJobPostings = {
    defaultJobs: [
        { title: 'Senior Backend Engineer', department: 'Engineering', date: 'Dec 3, 2025', applicants: 47, status: 'Open', experience: 'Senior (5+ years)', description: 'We are looking for a Senior Backend Engineer to join our team and help build scalable distributed systems.' },
        { title: 'UX Researcher', department: 'Product Design', date: 'Nov 28, 2025', applicants: 31, status: 'Open', experience: 'Mid-level (3-5 years)', description: 'Join our product team to conduct user research and help shape the future of our platform experience.' },
        { title: 'Data Analyst', department: 'Business Intelligence', date: 'Nov 20, 2025', applicants: 58, status: 'Open', experience: 'Junior (1-2 years)', description: 'Help us turn data into insights. You will work with various stakeholders to analyze complex datasets.' },
        { title: 'HR Business Partner', department: 'Human Resources', date: 'Nov 10, 2025', applicants: 22, status: 'Closed', experience: 'Senior (5+ years)', description: 'Oversee human resources operations and partner with leadership on people strategy.' },
        { title: 'DevOps Engineer', department: 'Infrastructure', date: 'Oct 30, 2025', applicants: 39, status: 'Closed', experience: 'Mid-level (3-5 years)', description: 'Manage our cloud infrastructure and improve our CI/CD pipelines.' },
        { title: 'Product Manager', department: 'Product', date: 'Oct 15, 2025', applicants: 64, status: 'Closed', experience: 'Lead / Managerial', description: 'Define the product roadmap and work with engineering to deliver value to our users.' }
    ],

    init() {
        this.initData();
        this.renderJobs();

        const modal = document.getElementById('new-posting-modal');
        const openBtn = document.getElementById('new-posting-btn');
        const cancelBtn = document.getElementById('modal-cancel');
        const form = document.getElementById('new-posting-form');

        if (openBtn) {
            openBtn.addEventListener('click', () => this.toggleModal(true));
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.toggleModal(false));
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.toggleModal(false);
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    this.toggleModal(false);
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const deadlineValue = document.getElementById('ebenJobDeadline').value;
                if (this.ebenValidateDeadline(deadlineValue)) {
                    this.handleCreateJob();
                }
            });
        }

        // Set initial min date
        this.ebenSetMinDeadlineDate();

        // Global click handler for kebab menus and View Applicants
        document.addEventListener('click', (e) => {
            const kebabBtn = e.target.closest('.eben-job-card__kebab');

            // Close all open menus first
            document.querySelectorAll('.eben-job-card__menu').forEach((menu) => {
                menu.hidden = true;
            });

            if (kebabBtn) {
                e.stopPropagation();
                // Open the menu that belongs to THIS kebab button
                const wrapper = kebabBtn.closest('.eben-job-card__menu-wrapper');
                const menu = wrapper.querySelector('.eben-job-card__menu');
                if (menu) menu.hidden = false;
            } else if (e.target.classList.contains('view-applicants')) {
                const jobTitle = e.target.dataset.jobTitle;
                localStorage.setItem('eben-active-job-filter', jobTitle);
            }
        });
    },

    
        async loadJobsFromSupabase() {
        try {
            const { data: jobs, error } = await window.supabaseClient
                .from("jobs")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            console.log("✅ Jobs loaded from Supabase:", jobs);

            const { data: candidates, error: candError } = await window.supabaseClient
                .from("candidates")
                .select("job_title");

            const applicantCounts = {};
            if (candidates) {
                candidates.forEach(c => {
                    const title = (c.job_title || 'Unknown Job').toLowerCase();
                    applicantCounts[title] = (applicantCounts[title] || 0) + 1;
                });
            }

            const mappedJobs = jobs.map(j => ({
                id: j.id,
                title: j.title,
                department: j.department || 'Engineering',
                date: new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                applicants: applicantCounts[(j.title || '').toLowerCase()] || 0,
                status: j.status || 'Open',
                experience: j.experience_level || 'Mid-level',
                description: j.description || ''
            }));
            
            this.saveJobs(mappedJobs);
            this.renderJobs(mappedJobs);

        } catch (error) {
            console.error("❌ Failed to load jobs:", error);
        }
    },
    
    // Original initData replaced
    initData() {
        this.loadJobsFromSupabase();
    },
getJobs() {
// REMOVED BY SUPABASE MIGRATION: return JSON.parse(localStorage.getItem('eben-job-postings') || '[]');
    },

    saveJobs(jobs) {
// REMOVED BY SUPABASE MIGRATION: localStorage.setItem('eben-job-postings', JSON.stringify(jobs));
    },

    
    async handleCreateJob() {
        const title = document.getElementById('job-title').value;
        const department = document.getElementById('job-dept').value;
        const description = document.getElementById('job-desc').value;
        const skills = document.getElementById('job-skills').value;
        const experience = document.getElementById('job-exp').value;
        const deadline = document.getElementById('ebenJobDeadline').value;

        try {
            const { error } = await window.supabaseClient
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
            alert("Supabase Error: " + (error.message || JSON.stringify(error)));
        }
    },

    renderJobs(passedJobs = null) {
        const grid = document.getElementById('job-postings-grid');
        if (!grid) return;

        const jobs = passedJobs || [];
        grid.innerHTML = '';

        jobs.forEach(job => {
            const displayCount = job.applicants || 0;

            const card = document.createElement('div');
            card.className = 'eben-card eben-job-card';
            card.innerHTML = `
                <div class="eben-job-card-header">
                    <span class="eben-badge eben-badge-info">${job.department}</span>
                    <div class="eben-job-card__menu-wrapper">
                        <button class="eben-job-card__kebab" aria-label="Card options">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                            </svg>
                        </button>
                        <div class="eben-job-card__menu" hidden>
                            <button class="eben-job-card__menu-item eben-job-card__menu-item--open" onclick="ebenJobPostings.updateStatus('${job.title}', 'Open')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="9 12 11 14 15 10"/>
                                </svg>
                                Set Open
                            </button>
                            <button class="eben-job-card__menu-item eben-job-card__menu-item--close" onclick="ebenJobPostings.updateStatus('${job.title}', 'Closed')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                                Set Closed
                            </button>
                            <button class="eben-job-card__menu-item eben-job-card__menu-item--delete" onclick="ebenJobPostings.deleteJob('${job.title}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14H6L5 6"/>
                                    <path d="M10 11v6"/>
                                    <path d="M14 11v6"/>
                                    <path d="M9 6V4h6v2"/>
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
                <h3 class="eben-job-title">${job.title}</h3>
                <div class="eben-job-meta">
                    <span class="eben-meta-item">${job.date}</span>
                    <span class="eben-meta-item">${displayCount} Applicants</span>
                </div>
                <div class="eben-job-card-footer">
                    <span class="eben-badge eben-badge-${job.status === 'Open' ? 'success' : 'danger'}">${job.status}</span>
                    <a href="dashboard.html" class="eben-btn eben-btn-outline view-applicants" data-job-title="${job.title}">View Applicants</a>
                </div>
            `;
            grid.appendChild(card);
        });
    },



    
    async updateStatus(title, status) {
        try {
            const { error } = await window.supabaseClient
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
                const { error } = await window.supabaseClient
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
        const modal = document.getElementById('new-posting-modal');
        if (isOpen) {
            this.ebenSetMinDeadlineDate();
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            const errorEl = document.getElementById('ebenDeadlineError');
            if (errorEl) errorEl.textContent = '';
        }
    },

    ebenSetMinDeadlineDate() {
        const deadlineInput = document.getElementById('ebenJobDeadline');
        if (!deadlineInput) return;

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayString = yyyy + '-' + mm + '-' + dd;

        deadlineInput.min = todayString;

        if (deadlineInput.value && deadlineInput.value < todayString) {
            deadlineInput.value = '';
        }
    },

    ebenValidateDeadline(dateValue) {
        const errorEl = document.getElementById('ebenDeadlineError');
        if (errorEl) errorEl.textContent = '';
        
        if (!dateValue) return true; // Optional field? Assuming it's optional if not 'required'

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(dateValue);
        if (selected < today) {
            if (errorEl) errorEl.textContent = 'Deadline must be today or a future date.';
            return false;
        }
        return true;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenJobPostings.init();
});

window.ebenJobPostings = ebenJobPostings;
