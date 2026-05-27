/* analytics.js */

const ebenAnalytics = {
    allCandidates: [],
    allJobs: [],
    allApplications: [],
    charts: {},

    async init() {
        console.log("Analytics init — Supabase client:", typeof window.supabaseClient);
        try {
            const [{ data: candidates, error: cError }, { data: jobs, error: jError }, { data: applications, error: aError }] = await Promise.all([
                window.supabaseClient.from("candidates").select("*"),
                window.supabaseClient.from("jobs").select("*"),
                window.supabaseClient.from("applications").select("*")
            ]);

            if (cError) console.error("Candidates error:", cError);
            if (jError) console.error("Jobs error:", jError);
            if (aError) console.error("Applications error:", aError);

            this.allCandidates = candidates || [];
            this.allJobs = jobs || [];
            this.allApplications = applications || [];

            console.log("Candidates:", this.allCandidates.length, "Jobs:", this.allJobs.length, "Applications:", this.allApplications.length);

            if (this.allCandidates.length === 0 && this.allJobs.length === 0) {
                document.querySelector('.eben-charts-grid').innerHTML =
                    `<div class="eben-card" style="grid-column:1/-1;text-align:center;padding:40px;">
                        <p class="eben-text-secondary">No data available yet. Add job postings and receive applications to see analytics.</p>
                    </div>`;
                return;
            }

            this.populateJobDropdown();
            this.setDefaultDates();
            this.renderAll();
            this.initFilters();

        } catch (err) {
            console.error("❌ Failed to initialize analytics:", err);
        }
    },

    setDefaultDates() {
        // Default range: 6 months ago to today
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);

        const toEl = document.getElementById('analytics-date-to');
        const fromEl = document.getElementById('analytics-date-from');
        if (toEl) toEl.value = today.toISOString().split('T')[0];
        if (fromEl) fromEl.value = sixMonthsAgo.toISOString().split('T')[0];
    },

    populateJobDropdown() {
        const select = document.getElementById('analytics-job-filter');
        if (!select) return;
        select.innerHTML = '<option value="all">All Postings</option>';
        this.allJobs.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job.title;
            opt.textContent = job.title;
            select.appendChild(opt);
        });
    },

    initFilters() {
        const applyBtn = document.getElementById('apply-analytics-filters');
        const resetBtn = document.getElementById('reset-analytics-filters');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.renderAll());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setDefaultDates();
                const jobFilter = document.getElementById('analytics-job-filter');
                if (jobFilter) jobFilter.value = 'all';
                this.renderAll();
            });
        }
    },

    getFilteredCandidates() {
        const fromEl = document.getElementById('analytics-date-from');
        const toEl = document.getElementById('analytics-date-to');
        const jobEl = document.getElementById('analytics-job-filter');

        const fromDate = fromEl && fromEl.value ? new Date(fromEl.value) : null;
        const toDate = toEl && toEl.value ? new Date(toEl.value + 'T23:59:59') : null;
        const jobFilter = jobEl ? jobEl.value : 'all';

        return this.allCandidates.filter(c => {
            const appDate = c.date_applied ? new Date(c.date_applied) : null;
            const matchFrom = !fromDate || !appDate || appDate >= fromDate;
            const matchTo = !toDate || !appDate || appDate <= toDate;
            const matchJob = jobFilter === 'all' || (c.job_title || '').toLowerCase() === jobFilter.toLowerCase();
            return matchFrom && matchTo && matchJob;
        });
    },

    renderAll() {
        const candidates = this.getFilteredCandidates();

        // Build status map from applications table with localStorage fallback
        const statusMap = {};
        const localStatuses = JSON.parse(localStorage.getItem('eben-candidate-statuses') || '{}');
        Object.keys(localStatuses).forEach(candId => {
            statusMap[candId] = localStatuses[candId].toLowerCase();
        });

        this.allApplications.forEach(app => {
            statusMap[app.candidate_id] = (app.status || 'Pending').toLowerCase();
        });

        this.populateMetrics(this.allJobs, candidates);
        this.renderTimelineChart(candidates);
        this.renderScoreDistChart(candidates);
        this.renderSkillsChart(candidates);
        this.renderShortlistChart(candidates, statusMap);

        // Show last updated notice
        const updatedEl = document.getElementById('analytics-updated');
        if (updatedEl) {
            updatedEl.style.display = 'block';
            updatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
        }
    },

    populateMetrics(jobs, candidates) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        set('metric-total-jobs', jobs.length);
        set('metric-open-jobs', jobs.filter(j => j.status && j.status.toLowerCase() === 'open').length);
        set('metric-total-applicants', candidates.length);

        const avgScore = candidates.length
            ? Math.round(candidates.reduce((s, c) => s + (c.overall_score || 0), 0) / candidates.length)
            : 0;
        set('metric-avg-score', avgScore + '%');

        const avgSustain = candidates.length
            ? Math.round(candidates.reduce((s, c) => s + (c.sustainability_score || 0), 0) / candidates.length)
            : 0;
        set('metric-avg-sustainability', avgSustain + '%');

        const topEl = document.getElementById('metric-top-candidates');
        if (topEl) {
            const top5 = [...candidates]
                .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
                .slice(0, 5);

            if (top5.length === 0) {
                topEl.innerHTML = '<p class="eben-text-secondary" style="padding:8px 0;">No candidates in selected range.</p>';
            } else {
                topEl.innerHTML = top5.map(c => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--eben-border);">
                        <span>${c.name} <small style="color:var(--eben-text-secondary);">(${c.job_title || 'General'})</small></span>
                        <span style="font-weight:700;color:var(--eben-accent);">${c.overall_score || 0}%</span>
                    </div>
                `).join('');
            }
        }
    },

    // --- CHART 1: Applications Over Time (line chart) ---
    renderTimelineChart(candidates) {
        const canvas = document.getElementById('ebenChartTimeline');
        if (!canvas) return;

        // Destroy previous instance to avoid "Canvas already in use" error
        if (this.charts.timeline) { this.charts.timeline.destroy(); }

        // Group candidates by week
        const weekMap = {};
        candidates.forEach(c => {
            if (!c.date_applied) return;
            const d = new Date(c.date_applied);
            // Get Monday of the week
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            const key = monday.toISOString().split('T')[0];
            weekMap[key] = (weekMap[key] || 0) + 1;
        });

        const sortedWeeks = Object.keys(weekMap).sort();
        const labels = sortedWeeks.map(w => {
            const d = new Date(w);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        });
        const data = sortedWeeks.map(w => weekMap[w]);

        if (labels.length === 0) {
            canvas.parentElement.innerHTML = '<p class="eben-text-secondary" style="text-align:center;padding:32px;">No applications in selected date range.</p>';
            return;
        }

        this.charts.timeline = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Applications',
                    data,
                    borderColor: '#C8963E',
                    backgroundColor: 'rgba(200,150,62,0.12)',
                    borderWidth: 2,
                    pointBackgroundColor: '#C8963E',
                    pointRadius: 4,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    },

    // --- CHART 2: Score Distribution (bar chart) ---
    renderScoreDistChart(candidates) {
        const canvas = document.getElementById('ebenChartScores');
        if (!canvas) return;

        if (this.charts.scores) { this.charts.scores.destroy(); }

        const buckets = [0, 0, 0, 0, 0, 0, 0];
        candidates.forEach(c => {
            const s = c.overall_score || 0;
            if (s <= 20) buckets[0]++;
            else if (s <= 40) buckets[1]++;
            else if (s <= 60) buckets[2]++;
            else if (s <= 70) buckets[3]++;
            else if (s <= 80) buckets[4]++;
            else if (s <= 90) buckets[5]++;
            else buckets[6]++;
        });

        this.charts.scores = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['0–20', '21–40', '41–60', '61–70', '71–80', '81–90', '91–100'],
                datasets: [{ label: 'Candidates', data: buckets, backgroundColor: '#C8963E', borderRadius: 4 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    },

    // --- CHART 3: Top Skills Among Applicants (horizontal bar) ---
    renderSkillsChart(candidates) {
        const canvas = document.getElementById('ebenChartSkills');
        if (!canvas) return;

        if (this.charts.skills) { this.charts.skills.destroy(); }

        // Tally skills from technical_skills column
        const skillCount = {};
        candidates.forEach(c => {
            let skills = c.technical_skills;
            if (typeof skills === 'string') {
                try { skills = JSON.parse(skills); } catch(e) { skills = []; }
            }
            if (Array.isArray(skills)) {
                skills.forEach(s => {
                    if (s && typeof s === 'string') {
                        const key = s.trim();
                        skillCount[key] = (skillCount[key] || 0) + 1;
                    }
                });
            }
        });

        const sorted = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

        if (sorted.length === 0) {
            canvas.parentElement.innerHTML = '<p class="eben-text-secondary" style="text-align:center;padding:32px;">No skills data available.</p>';
            return;
        }

        this.charts.skills = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sorted.map(e => e[0]),
                datasets: [{
                    label: 'Candidates with skill',
                    data: sorted.map(e => e[1]),
                    backgroundColor: '#3A7D44',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    },

    // --- CHART 4: Shortlist Rate by Job (doughnut) ---
    renderShortlistChart(candidates, statusMap) {
        const canvas = document.getElementById('ebenChartShortlist');
        if (!canvas) return;

        if (this.charts.shortlist) { this.charts.shortlist.destroy(); }

        // Count shortlisted candidates per job
        const perJob = {};
        candidates.forEach(c => {
            const job = c.job_title || 'Unknown';
            if (!perJob[job]) perJob[job] = { total: 0, shortlisted: 0 };
            perJob[job].total++;
            const status = statusMap[c.id] || 'pending';
            if (status === 'shortlisted') perJob[job].shortlisted++;
        });

        const labels = Object.keys(perJob);
        const data = labels.map(job => perJob[job].shortlisted);
        const colours = ['#3A7D44', '#2E6DA4', '#B07D2A', '#C8963E', '#A33B3B', '#6B6560'];

        if (labels.length === 0) {
            canvas.parentElement.innerHTML = '<p class="eben-text-secondary" style="text-align:center;padding:32px;">No data available.</p>';
            return;
        }

        this.charts.shortlist = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colours,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const job = ctx.label;
                                const { total, shortlisted } = perJob[job];
                                const pct = total > 0 ? Math.round((shortlisted / total) * 100) : 0;
                                return ` ${shortlisted} shortlisted of ${total} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenAnalytics.init();
});

window.ebenAnalytics = ebenAnalytics;
