import re

with open('js/dashboard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the loadCandidatesFromSupabase block. I'll just rewrite the file content since I messed it up.
# Actually, I will restore it by downloading the original file from before my edit, or just replacing the missing methods.

# Missing methods: sortCandidatesByDate, applyInitialFilters, populateJobDropdown

missing_methods = """
    sortCandidatesByDate() {
        this.allCandidates.sort((a, b) => {
            const dateA = new Date(a.date || a.dateApplied);
            const dateB = new Date(b.date || b.dateApplied);
            return dateB - dateA;
        });
    },

    applyInitialFilters() {
        const externalFilter = localStorage.getItem('eben-active-job-filter');
        if (externalFilter) {
            const dropdown = document.getElementById('job-filter');
            if (dropdown) dropdown.value = externalFilter;
            localStorage.removeItem('eben-active-job-filter');
        }
        
        this.applyFilters();
    },

    populateJobDropdown() {
        const dropdown = document.getElementById('job-filter');
        if (!dropdown) return;

        const defaultJobs = [
            'Senior Backend Engineer',
            'UX Researcher',
            'Data Analyst',
            'HR Business Partner',
            'DevOps Engineer',
            'Product Manager'
        ];

        const storedJobs = JSON.parse(localStorage.getItem('eben-job-postings') || '[]');
        const jobTitles = new Set(storedJobs.length > 0 ? storedJobs.map(j => j.title) : defaultJobs);
        
        this.allCandidates.forEach(c => {
            if (c.jobTitle) jobTitles.add(c.jobTitle);
        });

        dropdown.innerHTML = '<option>All Postings</option>';
        Array.from(jobTitles).forEach(title => {
            const option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            dropdown.appendChild(option);
        });
    },
"""

content = content.replace("    // --- TABLE RENDERING ---", missing_methods + "\n    // --- TABLE RENDERING ---")

# Now update the renderTable to group by job
render_table_replacement = """
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
                    <td class="eben-table-actions" style="text-align: right;">
                        <a href="candidate-details.html?id=${c.id}" class="eben-action-icon" title="View Details" onclick="localStorage.setItem('eben-selected-candidate', '${c.id}')">
                            <svg class="eben-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </a>
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
"""

content = re.sub(r'renderTable\(\) \{.*?(?=getSustainClass)', render_table_replacement, content, flags=re.DOTALL)

with open('js/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(content)
