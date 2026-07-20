/* dashboard.js */

const EBEN_PAGE_SIZE = 10;

const ebenDashboard = {
    currentPage: 1,
    sortColumn: 'date',
    sortDirection: 'desc',
    allCandidates: [],
    filteredData: [],

    init() {
        this.loadCandidatesFromSupabase();
        this.initEmailModal();
        this.initPagination();
        this.initFilters();
        this.initSorting();
        this.initDropdownAutoClose();
    },

    initDropdownAutoClose() {
        window.addEventListener('click', () => {
            document.querySelectorAll('.eben-dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        });
    },

    initEmailModal() {
        const modal = document.getElementById('email-modal');
        const closeBtn = document.getElementById('close-email-modal');
        const cancelBtn = document.getElementById('cancel-email');
        const emailForm = document.getElementById('email-form');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeEmailModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeEmailModal());
        
        if (emailForm) {
            emailForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendEmail();
            });
        }
    },

    applyInitialFilters() {
        const storedJob = localStorage.getItem('eben-active-job-filter');
        if (storedJob) {
            const jobFilterEl = document.getElementById('job-filter');
            if (jobFilterEl) {
                jobFilterEl.value = storedJob;
                localStorage.removeItem('eben-active-job-filter');
            }
        }
        this.applyFilters();
    },

        async loadCandidatesFromSupabase() {
        let candidatesData = [];
        let usingFallback = false;

        try {
            if (!window.supabaseClient) {
                console.warn("[WARN] window.supabaseClient is not initialized. Using mock candidates fallback.");
                candidatesData = window.EBEN_MOCK_CANDIDATES || [];
                usingFallback = true;
            } else {
                const { data: candidates, error } = await window.supabaseClient
                    .from("candidates")
                    .select("*")
                    .order("date_applied", { ascending: false });

                if (error) {
                    console.warn("[WARN] Supabase candidate fetch failed, falling back to mock data:", error);
                    candidatesData = window.EBEN_MOCK_CANDIDATES || [];
                    usingFallback = true;
                } else if (!candidates || candidates.length === 0) {
                    console.log("[INFO] No candidates in Supabase. Using mock candidates.");
                    candidatesData = window.EBEN_MOCK_CANDIDATES || [];
                    usingFallback = true;
                } else {
                    candidatesData = candidates;
                }
            }
        } catch (err) {
            console.error("[ERROR] Failed to query candidates from Supabase:", err);
            candidatesData = window.EBEN_MOCK_CANDIDATES || [];
            usingFallback = true;
        }

        // Fetch applications to get actual status
        let statusMap = {};
        if (!usingFallback && window.supabaseClient) {
            try {
                const { data: apps } = await window.supabaseClient.from("applications").select("candidate_id, status");
                if (apps) {
                    apps.forEach(app => {
                        statusMap[app.candidate_id] = app.status;
                    });
                }
            } catch (appErr) {
                console.warn("Could not fetch application statuses:", appErr);
            }
        }

        if (!usingFallback) {
            this.allCandidates = candidatesData.map(c => {
                let sustainScore = c.sustainability_score || 0;
                let sustainVal = 'Marginally Suitable';
                if (sustainScore >= 80) sustainVal = 'Highly Suitable';
                else if (sustainScore >= 50) sustainVal = 'Suitable';

                // Look up status from applications table, fallback to localStorage
                const localStatuses = JSON.parse(localStorage.getItem('eben-candidate-statuses') || '{}');
                let realStatus = statusMap[c.id] || localStatuses[c.id] || "Pending";
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
        } else {
            this.allCandidates = candidatesData.map(c => ({
                id: c.id,
                name: c.name || "Unknown Candidate",
                email: c.email || "No Email",
                phone: c.phone || "No Phone",
                experience: c.experience || "0",
                jobTitle: c.jobTitle || "Unknown Job",
                score: c.score || 0,
                status: c.status || "Pending",
                sustainability: c.sustainability || "Suitable",
                date: c.date || "N/A",
                dateApplied: c.dateApplied || c.date || new Date().toISOString(),
                original: c
            }));
        }

        await this.populateJobDropdown();
        this.updateStats();
        this.applyInitialFilters();
    },

    async populateJobDropdown() {
        const dropdown = document.getElementById('job-filter');
        if (!dropdown) return;

        try {
            console.log("LOG A — Loading jobs for dropdown...");
            const { data: jobs, error } = await window.supabaseClient
                .from("jobs")
                .select("id, title, status")
                .order("created_at", { ascending: false });

            console.log("LOG B — Jobs for dropdown:", jobs);
            if (error) {
                console.error("LOG C — Jobs error:", error);
                return;
            }

            dropdown.innerHTML = '<option value="all">All Postings</option>';
            
            if (jobs) {
                jobs.forEach(job => {
                    const option = document.createElement('option');
                    // Use job title for value because our dashboard filter logic matches on title
                    option.value = job.title;
                    const statusText = job.status && job.status.toLowerCase() === 'open' ? ' (Open)' : ' (Closed)';
                    option.textContent = job.title + statusText;
                    dropdown.appendChild(option);
                });
            }
            
            console.log("[OK] Job dropdown populated with", jobs.length, "jobs");
        } catch (err) {
            console.error("Unexpected error populating dropdown:", err);
        }
    },

    // --- TABLE RENDERING ---
    getPageData() {
        const start = (this.currentPage - 1) * EBEN_PAGE_SIZE;
        const end = start + EBEN_PAGE_SIZE;
        return this.filteredData.slice(start, end);
    },

    
    renderTable() {
        const tbody = document.getElementById('candidates-table-body');
        if (!tbody) return;

        const pageData = this.getPageData();

        tbody.style.opacity = '0';
        setTimeout(() => {
            tbody.innerHTML = '';
            
            if (pageData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="eben-empty-state">No candidates found matching your filters.</td></tr>';
            } else {
                // Group candidates by job title
                const grouped = {};
                pageData.forEach(candidate => {
                    const job = candidate.jobTitle || candidate.job_title || "Unknown Job";
                    if (!grouped[job]) grouped[job] = [];
                    grouped[job].push(candidate);
                });

                this.renderCandidatesByJob(grouped, tbody);
            }

            // Re-bind email triggers
            tbody.querySelectorAll('.eben-email-trigger').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.openEmailModal(btn.dataset.email, btn.dataset.name);
                });
            });

            this.updatePaginationLabel();
            this.updateSortIcons();
            tbody.style.transition = 'opacity 0.15s ease';
            tbody.style.opacity = '1';
        }, 150);
    },

    renderCandidatesByJob(grouped, tbody) {
        let globalIndex = (this.currentPage - 1) * EBEN_PAGE_SIZE;
        for (const [jobTitle, candidates] of Object.entries(grouped)) {
            const headerRow = document.createElement('tr');
            headerRow.className = 'eben-job-group-header';
            headerRow.innerHTML = `<td colspan="8" style="background-color: var(--eben-row-alt); font-weight: 700; color: var(--eben-accent); text-transform: uppercase; letter-spacing: 0.05em; padding: 16px;">${jobTitle}</td>`;
            tbody.appendChild(headerRow);

            candidates.forEach((c) => {
                const sustainVal = c.sustainability || c.sustainabilityRating || 'N/A';
                const sustainClass = this.getSustainClass(sustainVal);
                const statusClass = this.getStatusClass(c.status);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${++globalIndex}</td>
                    <td style="font-weight: 500;">${c.name}</td>
                    <td class="eben-text-secondary">${c.email}</td>
                    <td>
                        <div class="eben-score-wrapper">
                            <div class="eben-progress-track">
                                <div class="eben-progress-fill" style="width: ${c.score}%;"></div>
                            </div>
                            <span class="eben-score-text">${c.score}%</span>
                        </div>
                    </td>
                    <td><span class="eben-badge eben-badge-${sustainClass}">${sustainVal}</span></td>
                    <td><span class="eben-badge eben-badge-${statusClass}">${c.status}</span></td>
                    <td class="eben-text-secondary">${c.date || c.dateApplied || 'N/A'}</td>
                    <td class="eben-table-actions" style="text-align: right; position: relative;">
                        <div class="eben-dropdown">
                            <button class="eben-action-icon eben-dropdown-toggle" title="View Options" onclick="ebenDashboard.toggleDropdown(event, '${c.id}')">
                                <svg class="eben-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="5" r="1.5"></circle>
                                    <circle cx="12" cy="12" r="1.5"></circle>
                                    <circle cx="12" cy="19" r="1.5"></circle>
                                </svg>
                            </button>
                            <div class="eben-dropdown-menu" id="dropdown-${c.id}">
                                <a href="candidate-details.html?id=${c.id}" class="eben-dropdown-item" onclick="localStorage.setItem('eben-selected-candidate', '${c.id}')">
                                    <svg class="eben-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    View Details
                                </a>
                                <button class="eben-dropdown-item" onclick="ebenDashboard.downloadCandidatePDF('${c.id}')">
                                    <svg class="eben-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Download PDF
                                </button>
                            </div>
                        </div>
                        <button class="eben-action-icon eben-email-trigger" data-email="${c.email}" data-name="${c.name}" title="Send Email">
                            <svg class="eben-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    },

    getSustainClass(s) {
        if (s === 'Highly Suitable') return 'success';
        if (s === 'Suitable') return 'info';
        if (s === 'Marginally Suitable') return 'warning';
        return 'danger';
    },

    getStatusClass(s) {
        if (s === 'Shortlisted') return 'success';
        if (s === 'Pending') return 'warning';
        return 'danger';
    },

    // --- PAGINATION ---
    initPagination() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
    },

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    },

    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / EBEN_PAGE_SIZE);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    },

    updatePaginationLabel() {
        const label = document.getElementById('pagination-counter');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        const total = this.filteredData.length;
        const totalPages = Math.ceil(total / EBEN_PAGE_SIZE);
        const start = total === 0 ? 0 : (this.currentPage - 1) * EBEN_PAGE_SIZE + 1;
        const end = Math.min(this.currentPage * EBEN_PAGE_SIZE, total);

        if (label) label.textContent = `Showing ${start}–${end} of ${total}`;
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages || total === 0;
        
        if (prevBtn) {
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
        }
        if (nextBtn) {
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        }
    },

    // --- SORTING ---
    initSorting() {
        const headers = document.querySelectorAll('.eben-table th');
        const sortableColumns = ['id', 'name', 'email', 'score', 'sustainability', 'status', 'date'];

        headers.forEach((th, index) => {
            if (index < 7) {
                th.style.cursor = 'pointer';
                const col = sortableColumns[index];
                th.setAttribute('data-col', col);
                
                // Add icon span
                const iconSpan = document.createElement('span');
                iconSpan.className = 'eben-sort-icon';
                iconSpan.style.marginLeft = '8px';
                iconSpan.style.display = 'inline-flex';
                iconSpan.style.alignItems = 'center';
                th.appendChild(iconSpan);

                th.addEventListener('click', () => {
                    this.sortBy(col);
                });
            }
        });
        this.updateSortIcons();
    },

    updateSortIcons() {
        const headers = document.querySelectorAll('.eben-table th');
        const upIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
        const downIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        headers.forEach(th => {
            const iconSpan = th.querySelector('.eben-sort-icon');
            if (!iconSpan) return;

            const col = th.getAttribute('data-col');
            if (col === this.sortColumn) {
                iconSpan.innerHTML = this.sortDirection === 'asc' ? upIcon : downIcon;
                iconSpan.style.opacity = '1';
                th.style.color = 'var(--eben-accent)';
            } else {
                iconSpan.innerHTML = downIcon;
                iconSpan.style.opacity = '0.2';
                th.style.color = '';
            }
        });
    },

    sortBy(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredData.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            if (column === 'score') {
                valA = Number(valA);
                valB = Number(valB);
            } else if (column === 'date') {
                valA = new Date(valA || a.dateApplied);
                valB = new Date(valB || b.dateApplied);
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.currentPage = 1;
        this.renderTable();
    },

    // --- FILTERS ---
    initFilters() {
        const applyBtn = document.getElementById('apply-filters');
        const resetLink = document.getElementById('reset-filters');

        if (applyBtn) applyBtn.addEventListener('click', () => this.applyFilters());
        if (resetLink) resetLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.resetFilters();
        });
    },

        applyFilters() {
        const searchInput = document.getElementById('search-candidates');
        const jobFilterEl = document.getElementById('job-filter');
        const statusFilterEl = document.getElementById('status-filter');

        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        const jobFilter = jobFilterEl ? jobFilterEl.value : 'all';
        const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';

        this.filteredData = this.allCandidates.filter(c => {
            const matchSearch = !searchText || c.name.toLowerCase().includes(searchText) || c.email.toLowerCase().includes(searchText);
            const matchJob = (jobFilter === 'all' || jobFilter === 'All Postings') ? true : (c.jobTitle || '').toLowerCase() === jobFilter.toLowerCase();
            const matchStatus = (statusFilter === 'all') ? true : c.status.toLowerCase() === statusFilter.toLowerCase();
            return matchSearch && matchJob && matchStatus;
        });

        this.currentPage = 1;
        this.renderTable();
        this.updatePaginationLabel();
    },

    resetFilters() {
        const jobFilterEl = document.getElementById('job-filter');
        const statusFilterEl = document.getElementById('status-filter');
        const searchInput = document.getElementById('search-candidates');
        if (jobFilterEl) jobFilterEl.value = 'all';
        if (statusFilterEl) statusFilterEl.value = 'all';
        if (searchInput) searchInput.value = '';
        this.filteredData = [...this.allCandidates];
        this.currentPage = 1;
        this.renderTable();
        this.updatePaginationLabel();
    },

    updateStats() {
        const total = this.allCandidates.length;
        const shortlisted = this.allCandidates.filter(c => c.status === 'Shortlisted').length;
        const rejected = this.allCandidates.filter(c => c.status === 'Rejected').length;
        const pending = this.allCandidates.filter(c => c.status === 'Pending').length;

        const totalEl = document.getElementById('stat-total');
        const shortEl = document.getElementById('stat-shortlisted');
        const rejEl = document.getElementById('stat-rejected');
        const pendEl = document.getElementById('stat-pending');

        if (totalEl) totalEl.textContent = total;
        if (shortEl) shortEl.textContent = shortlisted;
        if (rejEl) rejEl.textContent = rejected;
        if (pendEl) pendEl.textContent = pending;
    },

    openEmailModal(email, name) {
        const modal = document.getElementById('email-modal');
        const formContent = document.getElementById('email-form-content');
        const successContent = document.getElementById('email-success-content');

        if (formContent) formContent.style.display = 'block';
        if (successContent) successContent.style.display = 'none';

        const toInput = document.getElementById('email-to');
        const subjectInput = document.getElementById('email-subject');

        if (toInput) toInput.value = email;
        if (subjectInput) subjectInput.value = `Regarding your application for EBEN Recruitment`;

        const sendBtn = modal.querySelector('button[type="submit"]');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Email';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeEmailModal() {
        const modal = document.getElementById('email-modal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    async handleSendEmail() {
        const modal = document.getElementById('email-modal');
        const sendBtn = modal.querySelector('button[type="submit"]');
        const email = document.getElementById('email-to')?.value || '';
        const subject = document.getElementById('email-subject')?.value || 'Regarding your application for EBEN Recruitment';
        const message = document.getElementById('email-message')?.value || '';

        if (!email) return;

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        try {
            const backendUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL)
                ? import.meta.env.VITE_BACKEND_URL
                : (window.__VITE_BACKEND_URL__ || 'https://resume-screening-system-e5qq.onrender.com');

            const response = await fetch(`${backendUrl}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: subject,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E0DAD3; border-radius: 8px; background-color: #ffffff;">
                            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #C8963E; padding-bottom: 12px;">
                                <h1 style="color: #1C1C1C; font-size: 20px; margin: 0;">EBEN Recruitment Platform</h1>
                            </div>
                            <p style="color: #333333; line-height: 1.6; white-space: pre-wrap;">${message || 'Thank you for your application.'}</p>
                            <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
                            <p style="color: #6B6560; font-size: 14px;"><strong>Best regards,</strong><br>The Recruitment Team</p>
                        </div>
                    `
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to send email');
            }

            const sentEmails = JSON.parse(localStorage.getItem('eben-email-sent') || '{}');
            sentEmails[email] = true;
            localStorage.setItem('eben-email-sent', JSON.stringify(sentEmails));

            const formContent = document.getElementById('email-form-content');
            const successContent = document.getElementById('email-success-content');
            const successEmail = document.getElementById('email-success-email');

            if (formContent) formContent.style.display = 'none';
            if (successEmail) successEmail.textContent = email;
            if (successContent) successContent.style.display = 'block';

            this.renderTable();
        } catch (err) {
            console.error("[ERROR] Send email error:", err);
            alert("Failed to send email: " + err.message);
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Email';
        }
    },


    toggleDropdown(event, candidateId) {
        event.stopPropagation();
        
        // Close all other dropdowns
        document.querySelectorAll('.eben-dropdown-menu').forEach(menu => {
            if (menu.id !== `dropdown-${candidateId}`) {
                menu.style.display = 'none';
            }
        });

        const menu = document.getElementById(`dropdown-${candidateId}`);
        if (menu) {
            const isVisible = menu.style.display === 'block';
            menu.style.display = isVisible ? 'none' : 'block';
        }
    },

    downloadCandidatePDF(candidateId) {
        const candidate = this.allCandidates.find(c => String(c.id) === String(candidateId));
        if (!candidate) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const c = candidate.original || {};
        
        let resumeSummary = c.resume_summary || "";
        
        let education = [];
        try {
            education = (typeof c.education === 'object' && c.education !== null) 
                ? c.education 
                : JSON.parse(c.education || "[]");
        } catch(e) { education = []; }

        let experience = [];
        try {
            experience = (typeof c.experience === 'object' && c.experience !== null) 
                ? c.experience 
                : JSON.parse(c.experience || "[]");
        } catch(e) { experience = []; }

        let skills = [];
        try {
            skills = (typeof c.technical_skills === 'object' && c.technical_skills !== null) 
                ? c.technical_skills 
                : JSON.parse(c.technical_skills || "[]");
        } catch(e) { skills = []; }

        let scoreReasons = {};
        let resumeText = "";
        try {
            scoreReasons = (typeof c.score_reasons === 'object' && c.score_reasons !== null) 
                ? c.score_reasons 
                : JSON.parse(c.score_reasons || "{}");
            resumeText = scoreReasons.resumeText || "";
        } catch(e) { scoreReasons = {}; }

        let y = 20;
        const margin = 20;
        const width = 170; // 210 - 40
        
        const addSectionHeader = (title) => {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(13, 13, 13);
            doc.text(title, margin, y);
            y += 4;
            doc.setDrawColor(220, 218, 211);
            doc.setLineWidth(0.5);
            doc.line(margin, y, margin + width, y);
            y += 8;
        };

        const addParagraph = (text, fontSize = 10, isBold = false) => {
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            doc.setTextColor(80, 80, 80);
            
            const lines = doc.splitTextToSize(text, width);
            lines.forEach(line => {
                if (y > 275) { doc.addPage(); y = 20; }
                doc.text(line, margin, y);
                y += fontSize * 0.5;
            });
            y += 4;
        };

        // Title Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(212, 163, 89); // Gold Accent
        doc.text(candidate.name.toUpperCase(), margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${candidate.jobTitle} Candidate Profile`, margin, y);
        y += 12;

        // Contact box
        doc.setFillColor(248, 247, 245);
        doc.rect(margin, y, width, 24, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        doc.text("Email:", margin + 6, y + 8);
        doc.text("Phone:", margin + 6, y + 16);
        doc.text("Applied:", margin + width / 2 + 6, y + 8);
        doc.text("Match Score:", margin + width / 2 + 6, y + 16);

        doc.setFont("helvetica", "normal");
        doc.text(candidate.email, margin + 26, y + 8);
        doc.text(candidate.phone || "Not provided", margin + 26, y + 16);
        doc.text(candidate.date.split(" ")[0] || "N/A", margin + width / 2 + 36, y + 8);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(176, 125, 42);
        doc.text(`${candidate.score}% (${candidate.sustainability})`, margin + width / 2 + 36, y + 16);
        y += 34;

        if (resumeSummary) {
            addSectionHeader("PROFESSIONAL SUMMARY");
            addParagraph(resumeSummary, 10);
        }

        if (skills && skills.length > 0) {
            addSectionHeader("TECHNICAL SKILLS");
            const skillsStr = Array.isArray(skills) ? skills.join(", ") : String(skills);
            addParagraph(skillsStr, 10);
        }

        if (experience && experience.length > 0) {
            addSectionHeader("WORK EXPERIENCE");
            experience.forEach(exp => {
                const role = exp.role || exp.title || "Role not specified";
                const company = exp.company || "Company not specified";
                const duration = exp.duration || "Duration not specified";
                const desc = exp.description || exp.responsibilities || "";

                if (y > 250) { doc.addPage(); y = 20; }
                
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(30, 30, 30);
                doc.text(role, margin, y);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9.5);
                doc.setTextColor(100, 100, 100);
                doc.text(duration, margin + width - doc.getTextWidth(duration), y);
                y += 5;

                doc.setFont("helvetica", "italic");
                doc.setFontSize(9.5);
                doc.setTextColor(120, 120, 120);
                doc.text(company, margin, y);
                y += 6;

                if (desc) {
                    addParagraph(desc, 9.5);
                } else {
                    y += 2;
                }
            });
        }

        if (education && (Array.isArray(education) && education.length > 0 || education.degree)) {
            addSectionHeader("EDUCATION");
            if (Array.isArray(education)) {
                education.forEach(edu => {
                    const deg = edu.degree || edu.title;
                    if (deg) {
                        if (y > 260) { doc.addPage(); y = 20; }
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(10.5);
                        doc.setTextColor(30, 30, 30);
                        doc.text(deg, margin, y);
                        y += 5;

                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9.5);
                        doc.setTextColor(100, 100, 100);
                        const schoolStr = `${edu.institution || 'University'}${edu.year && edu.year !== 'N/A' ? ', ' + edu.year : ''}`;
                        doc.text(schoolStr, margin, y);
                        y += 8;
                    }
                });
            } else {
                if (y > 260) { doc.addPage(); y = 20; }
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(30, 30, 30);
                doc.text(education.degree, margin, y);
                y += 5;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9.5);
                doc.setTextColor(100, 100, 100);
                const schoolStr = `${education.institution || 'University'}${education.year && education.year !== 'N/A' ? ', ' + education.year : ''}`;
                doc.text(schoolStr, margin, y);
                y += 8;
            }
        }

        const fileName = `${candidate.name.replace(/\s+/g, "_")}_Resume.pdf`;
        doc.save(fileName);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenDashboard.init();
});

// ── INVITE PERMISSION CHECK (admin-only) ──────────────────────
async function checkInvitePermission() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await window.supabaseClient
            .from('recruiters')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            // Hide the invite recruiter button
            const inviteBtn = document.getElementById('invite-recruiter-btn');
            if (inviteBtn) inviteBtn.style.display = 'none';

            // Also hide the entire invite section if it exists
            const inviteSection = document.getElementById('invite-section');
            if (inviteSection) inviteSection.style.display = 'none';

            // Also hide the recruiters list section
            const recruitersList = document.getElementById('recruiters-list');
            if (recruitersList) recruitersList.style.display = 'none';
        }
    } catch (err) {
        console.error('[EBEN] Failed to check invite permission:', err);
    }
}

// Call permission check on dashboard load
checkInvitePermission();

function openInviteModal() {
  const modal = document.getElementById("invite-modal");
  modal.style.display = "flex";
  document.getElementById("invite-name").value = "";
  document.getElementById("invite-email").value = "";
  document.getElementById("invite-error").style.display = "none";
  document.getElementById("invite-success").style.display = "none";
  document.getElementById("send-invite-btn").textContent = "Send Invite";
  document.getElementById("send-invite-btn").disabled = false;
}

function closeInviteModal() {
  document.getElementById("invite-modal").style.display = "none";
}

document.getElementById("invite-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("invite-modal")) closeInviteModal();
});

async function sendRecruiterInvite() {
  // Check permission first — only admin can invite
  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const { data: profile } = await window.supabaseClient
      .from('recruiters')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      alert('You do not have permission to invite recruiters.');
      return;
    }
  } catch (permErr) {
    console.error('[EBEN] Permission check failed:', permErr);
    alert('Unable to verify permissions. Please try again.');
    return;
  }

  const fullName = document.getElementById("invite-name").value.trim();
  const email = document.getElementById("invite-email").value.trim();
  const sendBtn = document.getElementById("send-invite-btn");
  const errorEl = document.getElementById("invite-error");
  const successEl = document.getElementById("invite-success");

  if (!fullName || !email) {
    errorEl.textContent = "Please enter both full name and email address.";
    errorEl.style.display = "block";
    return;
  }

  sendBtn.textContent = "Sending invite...";
  sendBtn.disabled = true;
  errorEl.style.display = "none";
  successEl.style.display = "none";

  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    const inviteResponse = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        email: email,
        data: { full_name: fullName },
        redirect_to: 'https://ezitom.vercel.app/set-password.html'
      })
    });

    const inviteResult = await inviteResponse.json();

    if (!inviteResponse.ok) {
      throw new Error(inviteResult.msg || inviteResult.error_description || inviteResult.error || "Failed to send invite");
    }

    const { error: dbError } = await window.supabaseClient
      .from("recruiters")
      .insert([{
        id: inviteResult.id,
        full_name: fullName,
        email: email,
        role: "recruiter",
        status: "pending"
      }]);

    if (dbError) console.error("DB error:", dbError);

    successEl.textContent = `Invite sent to ${email} successfully! They will receive an email to set their password.`;
    successEl.style.display = "block";
    sendBtn.textContent = "Send Another Invite";
    sendBtn.disabled = false;
    document.getElementById("invite-name").value = "";
    document.getElementById("invite-email").value = "";

    if (typeof loadRecruiters === "function") loadRecruiters();

  } catch (err) {
    errorEl.textContent = err.message.includes("already registered")
      ? "This email is already registered as a recruiter."
      : "Failed to send invite: " + err.message;
    errorEl.style.display = "block";
    sendBtn.textContent = "Send Invite";
    sendBtn.disabled = false;
  }
}

async function loadRecruiters() {
  const { data: recruiters, error } = await window.supabaseClient
    .from("recruiters")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("Failed to load recruiters:", error); return; }

  const container = document.getElementById("recruiters-list");
  if (!container) return;

  container.innerHTML = recruiters.map(r => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px;">
      <div>
        <strong>${r.full_name}</strong>
        <div style="font-size:13px; color:#6b7280;">${r.email}</div>
      </div>
      <span style="font-size:12px; padding:4px 10px; border-radius:20px; background:${r.status === 'active' ? '#dcfce7' : '#fef9c3'}; color:${r.status === 'active' ? '#16a34a' : '#ca8a04'};">
        ${r.status === 'active' ? 'Active' : 'Pending'}
      </span>
    </div>
  `).join("");
}

loadRecruiters();

window.openInviteModal = openInviteModal;
window.closeInviteModal = closeInviteModal;
window.sendRecruiterInvite = sendRecruiterInvite;
window.loadRecruiters = loadRecruiters;
window.ebenDashboard = ebenDashboard;
