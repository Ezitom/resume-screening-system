/* open-positions.js */

const ebenOpenPositions = {
    async init() {
        // Log 1: Confirm Supabase client is available
        console.log("Supabase client:", typeof window.supabaseClient);
        
        // Log 2: Confirm the query is firing
        console.log("Fetching jobs from Supabase...");
        
        try {
            // Log 3: Log the raw result from Supabase
            const { data: jobs, error } = await window.supabaseClient
                .from("jobs")
                .select("*")
                .order("created_at", { ascending: false });
                
            console.log("Jobs data:", jobs);
            console.log("Jobs error:", error);
            
            // Log 4: Confirm jobs are being passed to the render function
            console.log("Rendering jobs:", jobs?.length, "jobs found");

            if (error) {
                console.error("Failed to load jobs:", error);
                return;
            }

            const grid = document.getElementById('open-positions-grid');
            const emptyState = document.getElementById('empty-state');
            
            if (!jobs || jobs.length === 0) {
                if (grid) grid.style.display = 'none';
                if (emptyState) {
                    emptyState.innerHTML = '<p>No open positions available at the moment.</p>';
                    emptyState.style.display = 'block';
                }
                return;
            }

            const openJobs = jobs.filter(j => j.status && j.status.toLowerCase() === 'open');

            if (openJobs.length === 0) {
                if (grid) grid.style.display = 'none';
                if (emptyState) {
                    emptyState.innerHTML = '<p>No open positions available at the moment.</p>';
                    emptyState.style.display = 'block';
                }
                return;
            }

            this.renderOpenJobs(openJobs);

        } catch (err) {
            console.error("[ERROR] Failed to load jobs:", err);
        }
    },

    renderOpenJobs(openJobs) {
        const grid = document.getElementById('open-positions-grid');
        const emptyState = document.getElementById('empty-state');
        if (!grid) return;

        grid.style.display = '';
        if (emptyState) emptyState.style.display = 'none';
        grid.innerHTML = '';

        openJobs.forEach(job => {
            const excerpt = job.description
                ? (job.description.length > 120 ? job.description.substring(0, 120) + '...' : job.description)
                : 'No description available.';

            const card = document.createElement('div');
            card.className = 'eben-card eben-job-card';
            card.innerHTML = `
                <div class="eben-job-card-header">
                    <span class="eben-badge eben-badge-info">${job.department || 'Engineering'}</span>
                </div>
                <h3 class="eben-job-title">${job.title}</h3>
                <p class="eben-job-excerpt">${excerpt}</p>
                <div class="eben-job-meta">
                    <span class="eben-meta-item">${job.experience_level || job.experience || 'Not specified'}</span>
                    ${job.created_at ? `<span class="eben-meta-item">Posted: ${new Date(job.created_at).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="eben-job-card-footer">
                    <span class="eben-badge eben-badge-success">Open</span>
                    <a href="resume-upload?job=${encodeURIComponent(job.title)}&jobId=${job.id}" class="eben-btn eben-btn-primary">Apply Now</a>
                </div>
            `;
            grid.appendChild(card);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenOpenPositions.init();
});

window.ebenOpenPositions = ebenOpenPositions;
