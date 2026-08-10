// ============================================================
// RESUME EVALUATOR ENGINE
// File: resume-evaluator.js
// Place this file in the ROOT of your project folder
// ============================================================

import { askGroq } from "./js/utils/groq.js";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const ResumeEvaluator = (() => {

  // ── STEP 1: EXTRACT TEXT FROM FILE ──────────────────────
  async function extractText(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      return await extractFromPDF(file);
    } else if (ext === "docx") {
      return await extractFromDOCX(file);
    } else {
      throw new Error("Unsupported file type. Please upload a PDF or Word (.docx) file.");
    }
  }

  async function extractFromPDF(file) {
    if (!window.pdfjsLib) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }
    if (fullText.trim().length < 50) {
      throw new Error("This PDF appears to be scanned or image-based. Please upload a text-based PDF or Word document.");
    }
    return fullText.trim();
  }

  async function extractFromDOCX(file) {
    if (!window.mammoth) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    if (!result.value || result.value.trim().length < 50) {
      throw new Error("Could not extract text from this Word document. Please ensure it contains readable text.");
    }
    return result.value.trim();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }



  // ── STEP 3: GENERATE RESUME SUMMARY ─────────────────────
  async function generateSummary(resumeText) {
    const prompt = `You are an expert HR professional. Based on the resume text below, write a concise professional summary of this candidate in 3-4 sentences. Focus on their key strengths, experience level, and what makes them stand out. Write in third person. CRITICAL: Always use gender-neutral pronouns (they/them/their) or refer to them as "the candidate". Do not assume or guess their gender under any circumstances.

Resume Text:
${resumeText}

Return ONLY the summary paragraph. No labels, no headers, no extra text.`;
    return await askGroq(prompt);
  }

  // ── STEP 4: EXTRACT STRUCTURED DATA ─────────────────────
  async function extractStructuredData(resumeText) {
    const prompt = `You are an expert resume parser. Extract the following information from the resume text below and return it as a valid JSON object only. No markdown, no backticks, no extra text — just raw JSON.

Resume Text:
${resumeText}

Return this exact JSON structure:
{
  "technicalSkills": ["skill1", "skill2", "skill3"],
  "education": [
    { "degree": "...", "institution": "...", "year": "..." }
  ],
  "experience": [
    { "title": "...", "company": "...", "duration": "...", "responsibilities": "..." }
  ],
  "yearsOfExperience": "...",
  "name": "...",
  "email": "...",
  "phone": "..."
}

If a field cannot be found, use an empty string or empty array. Return ONLY the JSON object.`;

    const raw = await askGroq(prompt, { jsonMode: true });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error:", e, "Raw:", cleaned);
      return { technicalSkills: [], education: [], experience: [], yearsOfExperience: "", name: "", email: "", phone: "" };
    }
  }

  const ALLOWED_RECOMMENDATIONS = ["Highly Suitable", "Suitable", "Under Review", "Not Suitable"];

  // STEP 5: GENERATE SCORE BREAKDOWN
  async function generateScores(resumeText, sustainabilityAnswer = "", jobPosting = null) {
    if (!jobPosting || typeof jobPosting !== "object") {
      throw new Error("Job posting data is required for evaluation. Candidate scoring cannot be performed without valid job posting context.");
    }

    const jobTitle = jobPosting.title || jobPosting.job_title || "Unspecified Role";
    const jobDescription = jobPosting.description || "No description provided.";
    const requiredSkills = jobPosting.mustHaveSkills || jobPosting.must_have || jobPosting.required_skills || jobPosting.skills || "Not explicitly specified.";
    const preferredSkills = jobPosting.niceToHaveSkills || jobPosting.nice_to_have || jobPosting.preferred_skills || "Not explicitly specified.";
    const requiredExperience = jobPosting.experienceLevel || jobPosting.experience_level || "Not explicitly specified.";

    const prompt = `You are a senior HR evaluator and talent acquisition specialist.
Analyze the candidate's resume AND sustainability statement against the specific job posting requirements below.
Score the candidate across 6 distinct categories and compute the exact overall weighted score.

Return ONLY a raw JSON object matching the exact schema specified. No markdown fences, no backticks, no text before or after the JSON.

==================================================
1. JOB POSTING DETAILS
==================================================
Job Title: ${jobTitle}
Experience Level Required: ${requiredExperience}
Job Description: ${jobDescription}
Must-Have / Required Skills: ${requiredSkills}
Nice-to-Have / Preferred Skills: ${preferredSkills}

==================================================
2. CANDIDATE RESUME TEXT
==================================================
${resumeText}

==================================================
3. CANDIDATE SUSTAINABILITY STATEMENT
==================================================
${sustainabilityAnswer || "No sustainability statement provided."}

==================================================
4. EVALUATION RUBRIC & SCORING BANDS
==================================================
Evaluate the candidate across the following categories (0-100 score each):

1. skillsMatch (Weight: 35%):
   Compare candidate's technical and soft skills directly against the Must-Have and Nice-to-Have lists above. Use these exact scoring bands:
   - 90-100: Meets all must-haves + most nice-to-haves.
   - 70-89: Meets all must-haves, missing some nice-to-haves.
   - 50-69: Missing 1-2 core must-have skills.
   - <50: Missing major must-have skills.

2. experienceLevel (Weight: 25%):
   Evaluate candidate's total years of experience, seniority, and past roles explicitly against what this specific job requires (${requiredExperience}). Do not score experience in isolation; evaluate suitability for this specific role.

3. education (Weight: 15%):
   Score based on degree level, institution, field relevance, and academic/professional certifications relative to the job position.

4. communication (Weight: 10%):
   Score based on document structure, clarity, professional tone, formatting, and articulation of achievements in the resume.

5. leadership (Weight: 5%):
   Score based on evidence of project ownership, team management, mentoring, initiative, or leadership roles in the resume.

6. sustainability (Weight: 10%):
   Score based PRIMARILY on the candidate's sustainability statement. Consider environmental awareness, social responsibility, community involvement, ethical work practices, values-driven projects, and mentoring.
   - Detailed, genuine statement: 70-100.
   - Vague or minimal statement: 30-50.
   - Empty statement: 0.

OVERALL WEIGHTED SCORE FORMULA:
Calculate overallScore using this exact formula:
overallScore = Math.round((skillsMatch * 0.35) + (experienceLevel * 0.25) + (education * 0.15) + (communication * 0.10) + (leadership * 0.05) + (sustainability * 0.10))

==================================================
5. REQUIRED JSON OUTPUT SCHEMA
==================================================
{
  "skillsMatch": {
    "score": <number 0-100>,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["missingSkill1"],
    "reason": "<Detailed justification citing specific matched and missing requirements>"
  },
  "experienceLevel": {
    "score": <number 0-100>,
    "yearsFound": "<e.g. 5 years>",
    "reason": "<Detailed justification evaluating candidate experience against the job's required experience level>"
  },
  "education": {
    "score": <number 0-100>,
    "reason": "<Justification referencing candidate degree and relevance to role>"
  },
  "communication": {
    "score": <number 0-100>,
    "reason": "<Justification referencing document clarity and structure>"
  },
  "leadership": {
    "score": <number 0-100>,
    "reason": "<Justification referencing evidence of initiative or leadership>"
  },
  "sustainability": {
    "score": <number 0-100>,
    "reason": "<Justification referencing specific sustainability statement content and resume evidence>"
  },
  "overallScore": {
    "score": <number 0-100>,
    "recommendation": "<Must be exactly one of: 'Highly Suitable' | 'Suitable' | 'Under Review' | 'Not Suitable'>",
    "reason": "<Holistic summary of fit, key strengths, and critical gaps relative to the job posting>"
  }
}`;

    const raw = await askGroq(prompt, { jsonMode: true });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.overallScore) {
        const rec = parsed.overallScore.recommendation;
        if (!ALLOWED_RECOMMENDATIONS.includes(rec)) {
          const score = Number(parsed.overallScore.score) || 0;
          if (score >= 80) parsed.overallScore.recommendation = "Highly Suitable";
          else if (score >= 65) parsed.overallScore.recommendation = "Suitable";
          else if (score >= 50) parsed.overallScore.recommendation = "Under Review";
          else parsed.overallScore.recommendation = "Not Suitable";
        }
      }
      return parsed;
    } catch (e) {
      console.error("Critical: Score parse error in generateScores:", e, "Raw output:", raw);
      throw new Error("Evaluation parsing failed: The AI evaluation response could not be parsed as valid JSON. Raw output: " + raw);
    }
  }

  // MAIN: RUN FULL EVALUATION
  async function evaluate(file, sustainabilityAnswer = "", jobPosting = null) {
    if (!jobPosting || typeof jobPosting !== "object") {
      throw new Error("Job posting data is required for evaluation. Candidate scoring cannot be performed without valid job posting context.");
    }

    const resumeText = await extractText(file);
    const [summary, structured, scores] = await Promise.all([
      generateSummary(resumeText),
      extractStructuredData(resumeText),
      generateScores(resumeText, sustainabilityAnswer, jobPosting)
    ]);
    return {
      resumeText,
      sustainabilityAnswer,
      summary,
      technicalSkills:   structured.technicalSkills || [],
      education:         structured.education || [],
      experience:        structured.experience || [],
      yearsOfExperience: structured.yearsOfExperience || "",
      extractedName:     structured.name || "",
      extractedEmail:    structured.email || "",
      extractedPhone:    structured.phone || "",
      scores:            scores,
      dateApplied:       new Date().toISOString()
    };
  }

  return { evaluate };

})();

window.ResumeEvaluator = ResumeEvaluator;
