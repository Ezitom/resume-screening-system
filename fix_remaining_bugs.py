import re

# ====================================================
# BUG 1 - OPEN POSITIONS PAGE
# ====================================================

js_open_positions = """/* open-positions.js */

const ebenOpenPositions = {
    async init() {
        // Log 1: Confirm Supabase client is available
        console.log("Supabase client:", typeof supabaseClient);
        
        // Log 2: Confirm the query is firing
        console.log("Fetching jobs from Supabase...");
        
        try {
            // Log 3: Log the raw result from Supabase
            const { data: jobs, error } = await supabaseClient
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
            console.error("❌ Failed to load jobs:", err);
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
                    <a href="resume-upload.html?job=${encodeURIComponent(job.title)}&jobId=${job.id}" class="eben-btn eben-btn-primary">Apply Now</a>
                </div>
            `;
            grid.appendChild(card);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenOpenPositions.init();
});
"""

with open('js/open-positions.js', 'w', encoding='utf-8') as f:
    f.write(js_open_positions)


# ====================================================
# BUG 2 - ANALYTICS PAGE
# ====================================================

# We must inject the metrics grid HTML into analytics.html since it was missing
with open('analytics.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

metrics_html = """
            <!-- ADDED BY AI FOR BUG 2 -->
            <div class="eben-metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 24px;">
                <div class="eben-card" style="padding: 24px; text-align: center;">
                    <h3 class="eben-uppercase-label">Total Jobs</h3>
                    <div id="metric-total-jobs" style="font-size: 2rem; font-weight: bold; color: var(--eben-accent);">0</div>
                </div>
                <div class="eben-card" style="padding: 24px; text-align: center;">
                    <h3 class="eben-uppercase-label">Open Positions</h3>
                    <div id="metric-open-jobs" style="font-size: 2rem; font-weight: bold; color: var(--eben-success);">0</div>
                </div>
                <div class="eben-card" style="padding: 24px; text-align: center;">
                    <h3 class="eben-uppercase-label">Total Applicants</h3>
                    <div id="metric-total-applicants" style="font-size: 2rem; font-weight: bold; color: var(--eben-info);">0</div>
                </div>
                <div class="eben-card" style="padding: 24px; text-align: center;">
                    <h3 class="eben-uppercase-label">Avg. Score</h3>
                    <div id="metric-avg-score" style="font-size: 2rem; font-weight: bold; color: var(--eben-warning);">0</div>
                </div>
                <div class="eben-card" style="padding: 24px; text-align: center;">
                    <h3 class="eben-uppercase-label">Avg. Sustainability</h3>
                    <div id="metric-avg-sustainability" style="font-size: 2rem; font-weight: bold; color: var(--eben-text);">0</div>
                </div>
            </div>
            <div class="eben-card" style="margin-bottom: 24px; padding: 24px;">
                <h3 class="eben-uppercase-label">Top Scoring Candidates</h3>
                <div id="metric-top-candidates" style="margin-top: 16px;"></div>
            </div>
            
            <div class="eben-charts-grid">
"""

if "id=\"metric-total-jobs\"" not in html_content:
    html_content = html_content.replace('<div class="eben-charts-grid">', metrics_html)
    with open('analytics.html', 'w', encoding='utf-8') as f:
        f.write(html_content)


# Rewrite analytics.js
js_analytics = """/* analytics.js */

const ebenAnalytics = {
    async init() {
        console.log("Supabase client on analytics page:", typeof supabaseClient);

        try {
            const { data: candidates, error: cError } = await supabaseClient.from("candidates").select("*");
            console.log("Candidates for analytics:", candidates);
            console.log("Candidates error:", cError);

            const { data: jobs, error: jError } = await supabaseClient.from("jobs").select("*");
            console.log("Jobs for analytics:", jobs);
            console.log("Jobs error:", jError);

            const { data: applications, error: aError } = await supabaseClient.from("applications").select("*");
            console.log("Applications for analytics:", applications);
            console.log("Applications error:", aError);

            if ((!candidates || candidates.length === 0) && (!jobs || jobs.length === 0)) {
                const mainEl = document.querySelector('.eben-charts-grid');
                if (mainEl) {
                    mainEl.innerHTML = `<div class="eben-card" style="grid-column: 1/-1; text-align:center; padding: 40px;"><p class="eben-text-secondary">No data available yet. Add job postings and receive applications to see analytics.</p></div>`;
                }
                return;
            }

            this.populateMetrics(jobs || [], candidates || []);

        } catch (error) {
            console.error("❌ Failed to initialize analytics:", error);
        }
    },

    populateMetrics(jobs, candidates) {
        // 1. TOTAL JOBS POSTED
        const totalJobs = jobs.length;
        const totalJobsEl = document.getElementById('metric-total-jobs');
        if (totalJobsEl) totalJobsEl.textContent = totalJobs;

        // 2. OPEN POSITIONS
        const openJobs = jobs.filter(j => j.status && j.status.toLowerCase() === 'open').length;
        const openJobsEl = document.getElementById('metric-open-jobs');
        if (openJobsEl) openJobsEl.textContent = openJobs;

        // 3. TOTAL APPLICANTS
        const totalApplicants = candidates.length;
        const totalAppEl = document.getElementById('metric-total-applicants');
        if (totalAppEl) totalAppEl.textContent = totalApplicants;

        // 4. AVERAGE OVERALL SCORE
        const avgScore = candidates.length
            ? Math.round(candidates.reduce((sum, c) => sum + (c.overall_score || 0), 0) / candidates.length)
            : 0;
        const avgScoreEl = document.getElementById('metric-avg-score');
        if (avgScoreEl) avgScoreEl.textContent = avgScore + '%';

        // 5. APPLICATIONS PER JOB
        const perJob = {};
        candidates.forEach(c => {
            const job = c.job_title || "Unknown";
            perJob[job] = (perJob[job] || 0) + 1;
        });
        
        // 7. SUSTAINABILITY SCORE AVERAGE
        const avgSustainability = candidates.length
            ? Math.round(candidates.reduce((sum, c) => sum + (c.sustainability_score || 0), 0) / candidates.length)
            : 0;
        const avgSustainEl = document.getElementById('metric-avg-sustainability');
        if (avgSustainEl) avgSustainEl.textContent = avgSustainability + '%';

        // 6. TOP SCORING CANDIDATES
        const topCandidates = [...candidates]
            .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
            .slice(0, 5);
        
        const topEl = document.getElementById('metric-top-candidates');
        if (topEl) {
            topEl.innerHTML = topCandidates.map(c => `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--eben-border);">
                    <span>${c.name} <small style="color:var(--eben-text-secondary);">(${c.job_title || 'General'})</small></span>
                    <span style="font-weight:bold; color:var(--eben-accent);">${c.overall_score || 0}%</span>
                </div>
            `).join('');
        }

        // Render real data in the existing chart containers
        const scoresChartEl = document.getElementById('ebenChartScores');
        if (scoresChartEl) {
            const scoreBuckets = [0, 0, 0, 0, 0, 0, 0];
            candidates.forEach(c => {
                const s = c.overall_score || 0;
                if (s <= 20) scoreBuckets[0]++;
                else if (s <= 40) scoreBuckets[1]++;
                else if (s <= 60) scoreBuckets[2]++;
                else if (s <= 70) scoreBuckets[3]++;
                else if (s <= 80) scoreBuckets[4]++;
                else if (s <= 90) scoreBuckets[5]++;
                else scoreBuckets[6]++;
            });
            new Chart(scoresChartEl.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['0–20', '21–40', '41–60', '61–70', '71–80', '81–90', '91–100'],
                    datasets: [{ label: 'Count', data: scoreBuckets, backgroundColor: '#C8963E' }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        
        const appsChartEl = document.getElementById('ebenChartShortlist');
        if (appsChartEl) {
            new Chart(appsChartEl.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(perJob),
                    datasets: [{
                        data: Object.values(perJob),
                        backgroundColor: ['#3A7D44', '#2E6DA4', '#B07D2A', '#C8963E', '#A33B3B', '#6B6560'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenAnalytics.init();
});
"""

with open('js/analytics.js', 'w', encoding='utf-8') as f:
    f.write(js_analytics)
