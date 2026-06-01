/* candidate-details.js */

const ebenCandidateDetails = {
    candidateId: null,
    candidateData: null,

    init() {
        // Fix BUG 1: Prioritize URL parameter for ID to ensure correct participant is shown
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        
        // If ID is in URL, use it and update localStorage for consistency
        if (urlId) {
            this.candidateId = urlId;
            localStorage.setItem('eben-selected-candidate', urlId);
        } else {
            this.candidateId = localStorage.getItem('eben-selected-candidate') || 'mock-adaeze-nwosu';
        }

        // Reset state and UI to prevent stale data "bleed through"
        this.candidateData = null;
        this.resetUI();

        // loadCandidateFromSupabase is async — loadSavedState and ebenRenderResumeTab
        // are called at the END of that function after data is ready.
        this.loadCandidateFromSupabase();

        this.initTabs();
        this.initNotes();
        this.initSaveStatus();
        this.initSendEmail();
    },

    resetUI() {
        const els = [
            'sidebar-candidate-name', 'sidebar-candidate-job', 'sidebar-candidate-email',
            'sidebar-candidate-phone', 'sidebar-candidate-experience', 'sidebar-candidate-date',
            'sidebar-candidate-score', 'gauge-score-text', 'evaluation-suitability', 'summary-text', 'breadcrumb-name'
        ];
        els.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });

        // Reset gauge and breakdown bars
        const fillPath = document.getElementById('gauge-fill-path');
        if (fillPath) fillPath.style.strokeDashoffset = '125.66';
        
        ['skills', 'experience', 'relevance', 'education'].forEach(key => {
            const el = document.getElementById(`breakdown-${key}-fill`);
            if (el) el.style.width = '0%';
        });
        const skillsGrid = document.getElementById('skills-grid');
        if (skillsGrid) skillsGrid.innerHTML = '';
    },

    
    async loadCandidateFromSupabase() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const candidateId = urlParams.get('id') || localStorage.getItem('eben-selected-candidate');
            if (!candidateId) return;

            this.candidateId = candidateId;
            localStorage.setItem('eben-selected-candidate', candidateId);

            let candidate = null;
            let realStatus = "Pending";

            // Try loading from Supabase first
            try {
                const { data: dbCandidate, error } = await window.supabaseClient
                    .from("candidates")
                    .select("*")
                    .eq("id", candidateId)
                    .single();

                if (error) throw error;
                candidate = dbCandidate;
                console.log("[OK] Candidate loaded from Supabase:", candidate);

                // Fetch real status from applications table
                const { data: appData } = await window.supabaseClient
                    .from("applications")
                    .select("status")
                    .eq("candidate_id", candidateId)
                    .maybeSingle();
                if (appData && appData.status) {
                    const s = appData.status;
                    if (s.toLowerCase() === 'shortlisted') realStatus = 'Shortlisted';
                    else if (s.toLowerCase() === 'rejected') realStatus = 'Rejected';
                    else realStatus = 'Pending';
                }
                console.log("[OK] Candidate status from applications table:", realStatus);
            } catch (dbError) {
                console.warn("[WARN] Supabase candidate fetch failed, trying mock fallback:", dbError);
                
                // Fallback to mock data
                const mockCand = (typeof EBEN_MOCK_CANDIDATES !== 'undefined') 
                    ? EBEN_MOCK_CANDIDATES.find(c => c.id === candidateId) 
                    : null;

                if (mockCand) {
                    candidate = {
                        id: mockCand.id,
                        name: mockCand.name,
                        email: mockCand.email,
                        phone: mockCand.phone || "",
                        years_of_experience: mockCand.experience || 0,
                        job_title: mockCand.jobTitle || "General Application",
                        overall_score: mockCand.score || 0,
                        sustainability_score: mockCand.sustainability === 'Highly Suitable' ? 85 : (mockCand.sustainability === 'Suitable' ? 65 : 35),
                        resume_summary: mockCand.resumeSummary || "",
                        technical_skills: mockCand.detectedSkills || [],
                        education: mockCand.education || {},
                        experience: mockCand.workExperience || [],
                        score_reasons: {
                            overallScore: { score: mockCand.score, reason: "Excellent match based on mock evaluation." }
                        },
                        date_applied: mockCand.date || new Date().toISOString()
                    };

                    const localStatuses = JSON.parse(localStorage.getItem('eben-candidate-statuses') || '{}');
                    const savedStatus = localStatuses[candidateId] || mockCand.status;
                    if (savedStatus) {
                        if (savedStatus.toLowerCase() === 'shortlisted') realStatus = 'Shortlisted';
                        else if (savedStatus.toLowerCase() === 'rejected') realStatus = 'Rejected';
                        else realStatus = 'Pending';
                    }
                } else {
                    // Try parsing local candidate backup from localStorage (analyzed in resume-upload.html)
                    const localBackup = localStorage.getItem("candidate_eval_" + candidateId);
                    if (localBackup) {
                        try {
                            const parsed = JSON.parse(localBackup);
                            candidate = {
                                id: parsed.id,
                                name: parsed.name,
                                email: parsed.email,
                                phone: parsed.phone || "",
                                years_of_experience: parsed.yearsExp || 0,
                                job_title: parsed.jobTitle || "General Application",
                                overall_score: parsed.evaluation?.scores?.overallScore?.score || 0,
                                sustainability_score: parsed.evaluation?.scores?.sustainability?.score || 0,
                                resume_summary: parsed.evaluation?.summary || "",
                                technical_skills: parsed.evaluation?.technicalSkills || [],
                                education: parsed.evaluation?.education || [],
                                experience: parsed.evaluation?.experience || [],
                                score_reasons: parsed.evaluation?.scores || {},
                                date_applied: parsed.dateApplied || new Date().toISOString(),
                                resumeText: parsed.evaluation?.resumeText || ""
                            };

                            const localStatuses = JSON.parse(localStorage.getItem('eben-candidate-statuses') || '{}');
                            const savedStatus = localStatuses[candidateId] || parsed.status || "Pending";
                            if (savedStatus.toLowerCase() === 'shortlisted') realStatus = 'Shortlisted';
                            else if (savedStatus.toLowerCase() === 'rejected') realStatus = 'Rejected';
                            else realStatus = 'Pending';
                        } catch (parseErr) {
                            console.error("Failed to parse local backup", parseErr);
                        }
                    }
                }
            }

            if (!candidate) {
                console.error("[ERROR] Candidate not found in Supabase or local mock storage.");
                return;
            }

            let extractedResumeText = candidate.resumeText || "";
            let cleanedScoreReasons = {};

            try {
                const parsedScores = (typeof candidate.score_reasons === 'object' && candidate.score_reasons !== null)
                    ? candidate.score_reasons
                    : JSON.parse(candidate.score_reasons || "{}");
                
                if (parsedScores && parsedScores.resumeText) {
                    extractedResumeText = parsedScores.resumeText;
                    cleanedScoreReasons = { ...parsedScores };
                    delete cleanedScoreReasons.resumeText;
                } else {
                    cleanedScoreReasons = parsedScores || {};
                }
            } catch (e) {
                console.warn("Failed to parse score_reasons JSON:", e);
                cleanedScoreReasons = (typeof candidate.score_reasons === 'object' && candidate.score_reasons !== null) ? candidate.score_reasons : {};
            }

            this.candidateData = {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                experience: candidate.years_of_experience,
                jobTitle: candidate.job_title,
                score: candidate.overall_score || 0,
                status: realStatus,
                date: candidate.date_applied ? new Date(candidate.date_applied).toLocaleDateString() : "",
                sustainability: candidate.sustainability_score >= 80 ? 'Highly Suitable' : (candidate.sustainability_score >= 50 ? 'Suitable' : 'Marginally Suitable'),
                scoreBreakdown: cleanedScoreReasons,
                resumeSummary: candidate.resume_summary,
                sustainabilityAnswer: candidate.sustainability_answer || "",
                detectedSkills: (typeof candidate.technical_skills === 'object' && candidate.technical_skills !== null) ? candidate.technical_skills : (() => { try { return JSON.parse(candidate.technical_skills || "[]"); } catch(e) { return []; } })(),
                education: (typeof candidate.education === 'object' && candidate.education !== null) ? candidate.education : (() => { try { return JSON.parse(candidate.education || "[]"); } catch(e) { return []; } })(),
                workExperience: (typeof candidate.experience === 'object' && candidate.experience !== null) ? candidate.experience : (() => { try { return JSON.parse(candidate.experience || "[]"); } catch(e) { return []; } })(),
                resumeText: extractedResumeText
            };

            // Populate left sidebar fields.
            const setField = (id, value) => {
                const el = document.getElementById(id);
                if (el && value !== null && value !== undefined) el.textContent = value;
            };

            setField("sidebar-candidate-name",  candidate.name);
            setField("sidebar-candidate-email", candidate.email);
            setField("sidebar-candidate-phone", candidate.phone || 'Not provided');
            setField("sidebar-candidate-experience", (candidate.years_of_experience || 0) + ' Years');
            setField("sidebar-candidate-date",  candidate.date_applied ? new Date(candidate.date_applied).toLocaleDateString() : "");
            setField("sidebar-candidate-job",   candidate.job_title || 'General Application');
            setField("breadcrumb-name", candidate.name);

            // Populate Sustainability Statement
            const sustainabilityEl = document.getElementById("sustainability-statement-text");
            if (sustainabilityEl) {
                if (candidate.sustainability_answer && candidate.sustainability_answer.trim()) {
                    sustainabilityEl.textContent = candidate.sustainability_answer.trim();
                    sustainabilityEl.style.fontStyle = 'italic';
                } else {
                    sustainabilityEl.innerHTML = '<span style="color: var(--eben-text-secondary); font-style: normal;">No sustainability statement was provided by this candidate.</span>';
                }
            }
            
            const emailTo = document.getElementById('email-to');
            if (emailTo) emailTo.value = candidate.email;
            
            setField("gauge-score-text", candidate.overall_score || 0);
            setField("sidebar-candidate-score", candidate.overall_score || 0);

            const sustainabilityVal = candidate.sustainability_score >= 80 ? 'Highly Suitable' : (candidate.sustainability_score >= 50 ? 'Suitable' : 'Marginally Suitable');
            setField("evaluation-suitability", sustainabilityVal);

            // Update status badge and dropdown with real status
            this.updateStatusBadge(realStatus);
            const statusSelect = document.getElementById('status-select');
            if (statusSelect) statusSelect.value = realStatus;

            // Update breakdown bars
            const breakdownContainer = document.getElementById('dynamic-score-breakdown');
            const loadingEl = document.getElementById('score-breakdown-loading');

            if (breakdownContainer && loadingEl) {
                breakdownContainer.style.display = 'none';
                loadingEl.style.display = 'block';

                setTimeout(() => {
                    loadingEl.style.display = 'none';
                    breakdownContainer.style.display = 'block';
                    
                    const scores = (typeof candidate.score_reasons === 'object' && candidate.score_reasons !== null)
                        ? candidate.score_reasons
                        : (() => { try { return JSON.parse(candidate.score_reasons || "{}"); } catch(e) { return {}; } })();
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

            // Render AI evaluation results and load saved state AFTER data is fully ready
            this.ebenRenderResumeTab();
            this.loadSavedState();

        } catch (error) {
            console.error("[ERROR] Failed to load candidate:", error);
        }
    },


    renderScoreBreakdown(breakdownData, container) {
        container.innerHTML = '';
        
        // Helper to get color class based on score
        const getColorStyle = (score) => {
            if (score <= 40) return 'background-color: var(--eben-danger);';
            if (score <= 70) return 'background-color: var(--eben-warning);';
            return 'background-color: var(--eben-success);';
        };

        const renderItem = (label, dataObj) => {
            if (!dataObj) return '';
            const color = getColorStyle(dataObj.score);
            return `
                <div class="eben-breakdown-item" style="margin-bottom: 20px;">
                    <div class="eben-breakdown-header" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="eben-uppercase-label" style="margin: 0; font-size: 0.75rem;">${label}</span>
                        <span style="font-weight: 600; font-size: 0.85rem; color: var(--eben-text-primary);">${dataObj.score} / 100</span>
                    </div>
                    <div class="eben-progress-track" style="margin-bottom: 8px; background: var(--eben-border);">
                        <div class="eben-progress-fill" style="width: ${dataObj.score}%; ${color}"></div>
                    </div>
                    <p class="eben-text-secondary" style="font-size: 0.8rem; margin: 0; line-height: 1.4;">${dataObj.reason}</p>
                </div>
            `;
        };

        let html = '';
        
        // Overall Score at the top
        if (breakdownData.overallScore) {
            html += `
                <div style="padding: 16px; background: var(--eben-bg); border-radius: 8px; margin-bottom: 24px; border: 1px solid var(--eben-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 class="eben-uppercase-label" style="margin: 0; color: var(--eben-text-primary);">Overall AI Evaluation</h4>
                        <span style="font-size: 1.25rem; font-weight: 700; color: var(--eben-accent);">${breakdownData.overallScore.score} <span style="font-size: 0.85rem; font-weight: 400; color: var(--eben-text-secondary);">/ 100</span></span>
                    </div>
                    <p class="eben-text-secondary" style="margin: 0; font-size: 0.9rem;">${breakdownData.overallScore.reason}</p>
                </div>
            `;
        }

        html += renderItem('Skills Match', breakdownData.skillsMatch);
        html += renderItem('Experience Level', breakdownData.experienceLevel);
        html += renderItem('Education Fit', breakdownData.education);
        html += renderItem('Communication & Presentation', breakdownData.communication);
        html += renderItem('Leadership & Initiative', breakdownData.leadership);
        html += renderItem('Sustainability & Values Alignment', breakdownData.sustainability);

        container.innerHTML = html;
    },

    ebenRenderResumeTab() {
        const data = this.candidateData;
        if (!data) return;

        const summaryText = document.getElementById('summary-text');
        const skillsGrid = document.getElementById('skills-grid');

        // Professional Summary
        if (data.resumeSummary && summaryText) {
            summaryText.textContent = data.resumeSummary;
        } else if (summaryText) {
            summaryText.innerHTML = '<span class="eben-text-secondary">No resume summary available.</span>';
        }

        // Technical Skills
        if (data.detectedSkills && data.detectedSkills.length > 0 && skillsGrid) {
            skillsGrid.innerHTML = '';
            data.detectedSkills.forEach(skill => {
                const chip = document.createElement('span');
                chip.className = 'eben-skill-chip';
                chip.textContent = skill;
                skillsGrid.appendChild(chip);
            });
        } else if (skillsGrid) {
            skillsGrid.innerHTML = '<span class="eben-text-secondary">No technical skills explicitly detected.</span>';
        }

        // Education
        const eduContent = document.getElementById('education-content');
        if (eduContent) {
            if (Array.isArray(data.education) && data.education.length > 0) {
                let eduHtml = '';
                data.education.forEach(edu => {
                    const deg = edu.degree || edu.title;
                    if (deg && deg !== 'N/A' && deg !== 'Not detected' && deg !== 'Degree details not clearly found') {
                        eduHtml += `
                            <div class="eben-edu-item" style="margin-bottom: 12px;">
                                <p class="eben-edu-title">${deg}</p>
                                <p class="eben-text-secondary">${edu.institution || 'Institution not clearly found'}${edu.year && edu.year !== 'N/A' ? ', ' + edu.year : ''}</p>
                            </div>
                        `;
                    }
                });
                if (eduHtml) {
                    eduContent.innerHTML = eduHtml;
                } else {
                    eduContent.innerHTML = '<p class="eben-text-secondary">No education details detected from resume.</p>';
                }
            } else if (data.education && data.education.degree && data.education.degree !== 'N/A' && data.education.degree !== 'Not detected' && data.education.degree !== 'Degree details not clearly found') {
                eduContent.innerHTML = `
                    <p class="eben-edu-title">${data.education.degree}</p>
                    <p class="eben-text-secondary">${data.education.institution || 'Institution not clearly found'}${data.education.year && data.education.year !== 'N/A' ? ', ' + data.education.year : ''}</p>
                `;
            } else {
                eduContent.innerHTML = '<p class="eben-text-secondary">No education details detected from resume.</p>';
            }
        }

        // Experience
        const expList = document.getElementById('experience-list');
        if (expList) {
            if (data.workExperience && data.workExperience.length > 0) {
                let expHtml = '';
                data.workExperience.forEach(exp => {
                    const roleName = exp.role || exp.title || 'Role not specified';
                    const expDesc = exp.description || exp.responsibilities || '';
                    expHtml += `
                        <div class="eben-exp-item">
                            <div class="eben-exp-header">
                                <strong>${roleName}</strong>
                                <span>${exp.duration || 'Duration not specified'}</span>
                            </div>
                            <p class="eben-text-secondary">${exp.company || 'Company not specified'}</p>
                            ${expDesc ? `<p class="eben-text-secondary" style="font-size: 0.875rem; margin-top: 4px; line-height: 1.4;">${expDesc}</p>` : ''}
                        </div>
                    `;
                });
                expList.innerHTML = expHtml;
            } else {
                expList.innerHTML = '<p class="eben-text-secondary">No work experience details detected from resume.</p>';
            }
        }
    },

    initTabs() {
        const tabBtns = document.querySelectorAll('.eben-tab-btn');
        const tabContents = document.querySelectorAll('.eben-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `tab-${targetTab}`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    },

    initNotes() {
        const saveNoteBtn = document.querySelector('#tab-notes .eben-btn');
        const textarea = document.querySelector('#tab-notes textarea');
        const notesList = document.querySelector('.eben-notes-list');

        if (saveNoteBtn && textarea && notesList) {
            saveNoteBtn.addEventListener('click', () => {
                const noteText = textarea.value.trim();
                if (!noteText) return;

                const noteItem = document.createElement('div');
                noteItem.className = 'eben-note-item';
                noteItem.innerHTML = `
                    <p class="eben-note-text">${noteText}</p>
                    <span class="eben-note-meta">${new Date().toLocaleDateString()} · Sarah Okafor</span>
                `;
                notesList.prepend(noteItem);
                textarea.value = '';
            });
        }
    },

    // --- SAVE STATUS ---
    initSaveStatus() {
        const saveBtn = document.getElementById('save-status-btn');
        const statusSelect = document.getElementById('status-select');

        if (saveBtn && statusSelect) {
            saveBtn.addEventListener('click', async () => {
                const selectedStatus = statusSelect.value;

                // 1. Save to localStorage for quick local access
                const statuses = JSON.parse(localStorage.getItem('eben-candidate-statuses') || '{}');
                statuses[this.candidateId] = selectedStatus;
                localStorage.setItem('eben-candidate-statuses', JSON.stringify(statuses));

                // Update badge immediately
                this.updateStatusBadge(selectedStatus);

                // Loading state
                saveBtn.disabled = true;
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Saving...';

                try {
                    // 2. Persist status to Supabase applications table ONLY if it's a real candidate
                    const isMock = this.candidateId.startsWith('mock-') || this.candidateId.startsWith('cand-');
                    
                    if (!isMock) {
                        // Check if application exists first to prevent upsert conflicts
                        const { data: existingApp, error: checkError } = await window.supabaseClient
                            .from('applications')
                            .select('id')
                            .eq('candidate_id', this.candidateId)
                            .maybeSingle();

                        if (checkError) throw checkError;

                        if (existingApp) {
                            // Update existing application
                            const { error: updateError } = await window.supabaseClient
                                .from('applications')
                                .update({ status: selectedStatus.toLowerCase() })
                                .eq('candidate_id', this.candidateId);
                            if (updateError) throw updateError;
                        } else {
                            // Insert new application
                            const { error: insertError } = await window.supabaseClient
                                .from('applications')
                                .insert([{
                                    candidate_id: this.candidateId,
                                    status: selectedStatus.toLowerCase(),
                                    job_title: this.candidateData?.jobTitle || 'General Application',
                                    overall_score: this.candidateData?.score || 0,
                                    created_at: new Date().toISOString()
                                }]);
                            if (insertError) throw insertError;
                        }
                        console.log('[OK] Status saved to Supabase:', selectedStatus);
                    } else {
                        console.log('[INFO] Mock candidate status saved to local storage:', selectedStatus);
                    }

                    // Update local candidateData to keep in sync
                    if (this.candidateData) this.candidateData.status = selectedStatus;

                    saveBtn.textContent = 'Status Saved';
                    saveBtn.classList.add('eben-btn-success');
                } catch (err) {
                    console.error('[ERROR] Failed to save status to Supabase:', err);
                    saveBtn.textContent = 'Save Failed!';
                    saveBtn.style.background = 'var(--eben-danger)';
                    saveBtn.style.color = '#fff';
                } finally {
                    setTimeout(() => {
                        saveBtn.textContent = originalText;
                        saveBtn.disabled = false;
                        saveBtn.classList.remove('eben-btn-success');
                        saveBtn.style.background = '';
                        saveBtn.style.color = '';
                    }, 2000);
                }
            });
        }
    },

    updateStatusBadge(status) {
        const badge = document.getElementById('sidebar-status-badge');
        if (!badge) return;

        badge.className = 'eben-badge eben-full-width-badge';

        if (status === 'Shortlisted') {
            badge.classList.add('eben-badge-success');
            badge.textContent = 'Shortlisted';
        } else if (status === 'Rejected') {
            badge.classList.add('eben-badge-danger');
            badge.textContent = 'Rejected';
        } else {
            badge.classList.add('eben-badge-warning');
            badge.textContent = 'Pending';
        }
    },

    loadSavedState() {
        // NOTE: Status is now loaded from Supabase in loadCandidateFromSupabase().
        // We no longer override the status from localStorage here to avoid
        // stale data overriding the authoritative Supabase value.

        // Load email sent state
        const sentEmails = JSON.parse(localStorage.getItem('eben-email-sent') || '{}');
        const email = this.candidateData ? this.candidateData.email : '';
        if (email && sentEmails[email]) {
            this.showSentIndicator();
        }
    },

    showSentIndicator() {
        const sendBtn = document.getElementById('sidebar-send-email-btn');
        if (!sendBtn) return;

        let indicator = sendBtn.parentNode.querySelector('.eben-sidebar-sent');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'eben-sidebar-sent eben-sent-indicator';
            indicator.innerHTML = `
                <svg class="eben-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg> Email sent
            `;
            indicator.style.display = 'flex';
            indicator.style.alignItems = 'center';
            indicator.style.justifyContent = 'center';
            indicator.style.marginTop = '8px';
            indicator.style.color = 'var(--eben-success)';
            indicator.style.fontSize = '0.75rem';
            sendBtn.parentNode.insertBefore(indicator, sendBtn.nextSibling);
        }
    },

    // --- SEND EMAIL ---
    initSendEmail() {
        const sendBtn = document.getElementById('sidebar-send-email-btn');
        const modal = document.getElementById('candidate-email-modal');
        const cancelBtn = document.getElementById('candidate-email-cancel');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.openEmailModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeEmailModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeEmailModal();
            });
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    this.closeEmailModal();
                }
            });

            const form = modal.querySelector('form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleSendEmail();
                });
            }
        }
    },

    openEmailModal() {
        const modal = document.getElementById('candidate-email-modal');
        const formContent = document.getElementById('candidate-email-form');
        const successContent = document.getElementById('candidate-email-success');

        if (formContent) formContent.style.display = 'block';
        if (successContent) successContent.style.display = 'none';

        // Reset send button
        const sendBtn = modal.querySelector('button[type="submit"]');
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Email'; }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeEmailModal() {
        const modal = document.getElementById('candidate-email-modal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    handleSendEmail() {
        const modal = document.getElementById('candidate-email-modal');
        const sendBtn = modal.querySelector('button[type="submit"]');

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        setTimeout(() => {
            // Save sent state
            const sentEmails = JSON.parse(localStorage.getItem('eben-email-sent') || '{}');
            const email = this.candidateData ? this.candidateData.email : '';
            if (email) {
                sentEmails[email] = true;
                localStorage.setItem('eben-email-sent', JSON.stringify(sentEmails));
            }

            // Show success
            const formContent = document.getElementById('candidate-email-form');
            const successContent = document.getElementById('candidate-email-success');
            if (formContent) formContent.style.display = 'none';
            if (successContent) successContent.style.display = 'block';

            this.showSentIndicator();
        }, 1500);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ebenCandidateDetails.init();
});

window.ebenCandidateDetails = ebenCandidateDetails;

// ── SHORTLIST & REJECTION EMAIL FUNCTIONS ──────────────────────

async function sendShortlistEmail() {
    const shortlistBtn = document.getElementById('shortlist-btn');
    const statusEl = document.getElementById('shortlist-status');

    // Get candidate details from the current page
    const candidateName = document.getElementById('sidebar-candidate-name')?.textContent || 'Candidate';
    const candidateEmail = document.getElementById('sidebar-candidate-email')?.textContent || '';
    const jobTitle = document.getElementById('sidebar-candidate-job')?.textContent || 'the position';

    if (!candidateEmail || candidateEmail === 'No Email') {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--eben-danger)';
        statusEl.textContent = 'No email address found for this candidate.';
        return;
    }

    shortlistBtn.disabled = true;
    shortlistBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; animation: eben-spin 1s linear infinite;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Sending...';
    statusEl.style.display = 'none';

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: candidateEmail,
                subject: `Congratulations! You have been shortlisted for ${jobTitle}`,
                html: `
                    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #E0DAD3; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #C8963E; padding-bottom: 16px;">
                            <h1 style="color: #1C1C1C; font-size: 20px; margin: 0;">EBEN Recruitment Platform</h1>
                        </div>
                        <h2 style="color: #3A7D44; font-size: 22px;">Congratulations, ${candidateName}!</h2>
                        <p style="color: #1C1C1C; line-height: 1.7;">We are pleased to inform you that after carefully reviewing your application and resume, you have been <strong>shortlisted</strong> for the position of <strong>${jobTitle}</strong>.</p>
                        <p style="color: #1C1C1C; line-height: 1.7;">Our recruitment team was impressed with your qualifications, experience, and sustainability values. We would like to invite you to the next stage of our recruitment process.</p>
                        <p style="color: #1C1C1C; line-height: 1.7;">You will receive further details about the next steps shortly. Please ensure your contact details are up to date.</p>
                        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
                        <p style="color: #1C1C1C; line-height: 1.7;">We look forward to speaking with you soon.</p>
                        <p style="color: #1C1C1C; line-height: 1.7;"><strong>Best regards,</strong><br>The Recruitment Team</p>
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E0DAD3; font-size: 12px; color: #6B6560; text-align: center;">
                            This email was sent from the EBEN Recruitment Platform.
                        </div>
                    </div>
                `
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to send email');
        }

        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--eben-success)';
        statusEl.textContent = `Shortlist email sent successfully to ${candidateEmail}`;
        shortlistBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Email Sent';
        shortlistBtn.style.background = '#22c55e';

    } catch (err) {
        console.error('[ERROR] Shortlist email error:', err);
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--eben-danger)';
        statusEl.textContent = 'Failed to send email: ' + err.message;
        shortlistBtn.disabled = false;
        shortlistBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Shortlist Candidate';
    }
}

async function sendRejectionEmail() {
    const rejectBtn = document.getElementById('reject-btn');
    const statusEl = document.getElementById('shortlist-status');

    const candidateName = document.getElementById('sidebar-candidate-name')?.textContent || 'Candidate';
    const candidateEmail = document.getElementById('sidebar-candidate-email')?.textContent || '';
    const jobTitle = document.getElementById('sidebar-candidate-job')?.textContent || 'the position';

    if (!candidateEmail || candidateEmail === 'No Email') {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--eben-danger)';
        statusEl.textContent = 'No email address found for this candidate.';
        return;
    }

    rejectBtn.disabled = true;
    rejectBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; animation: eben-spin 1s linear infinite;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Sending...';
    statusEl.style.display = 'none';

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: candidateEmail,
                subject: `Update on your application for ${jobTitle}`,
                html: `
                    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #E0DAD3; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #C8963E; padding-bottom: 16px;">
                            <h1 style="color: #1C1C1C; font-size: 20px; margin: 0;">EBEN Recruitment Platform</h1>
                        </div>
                        <h2 style="color: #1C1C1C; font-size: 22px;">Thank you for your application, ${candidateName}</h2>
                        <p style="color: #1C1C1C; line-height: 1.7;">We appreciate the time and effort you put into applying for the position of <strong>${jobTitle}</strong> and for sharing your experience and sustainability values with us.</p>
                        <p style="color: #1C1C1C; line-height: 1.7;">After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. This was a difficult decision as we received many strong applications.</p>
                        <p style="color: #1C1C1C; line-height: 1.7;">We encourage you to apply for future opportunities with us and wish you the very best in your career journey.</p>
                        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
                        <p style="color: #1C1C1C; line-height: 1.7;">Thank you again for your interest.</p>
                        <p style="color: #1C1C1C; line-height: 1.7;"><strong>Best regards,</strong><br>The Recruitment Team</p>
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E0DAD3; font-size: 12px; color: #6B6560; text-align: center;">
                            This email was sent from the EBEN Recruitment Platform.
                        </div>
                    </div>
                `
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to send email');
        }

        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--eben-warning)';
        statusEl.textContent = `Rejection email sent to ${candidateEmail}`;
        rejectBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Email Sent';

    } catch (err) {
        console.error('[ERROR] Rejection email error:', err);
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--eben-danger)';
        statusEl.textContent = 'Failed to send email: ' + err.message;
        rejectBtn.disabled = false;
        rejectBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Send Rejection';
    }
}

// Expose functions globally
window.sendShortlistEmail = sendShortlistEmail;
window.sendRejectionEmail = sendRejectionEmail;
