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
    const prompt = `You are an expert resume parser. Extract the following information from the resume text below and return it as a valid JSON object only. No markdown, no backticks, no extra text - just raw JSON.

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

    const raw = await askGroq(prompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error:", e, "Raw:", cleaned);
      return { technicalSkills: [], education: [], experience: [], yearsOfExperience: "", name: "", email: "", phone: "" };
    }
  }

  // ── STEP 5: GENERATE SCORE BREAKDOWN ────────────────────
  async function generateScores(resumeText, sustainabilityAnswer = "") {
    const prompt = `You are a senior HR evaluator for a Candidate Sustainability Assessment System.
Analyze the resume AND the candidate's sustainability statement below. Score the candidate across 7 categories.
Return ONLY a raw JSON object - no markdown, no backticks, no explanation before or after the JSON.

RESUME TEXT:
${resumeText}

CANDIDATE SUSTAINABILITY STATEMENT:
${sustainabilityAnswer || "No sustainability statement provided."}

SCORING INSTRUCTIONS:
- skillsMatch: Score based on technical and soft skills found in the resume (0-100)
- experienceLevel: Score based on years, seniority, and quality of work experience (0-100)
- education: Score based on degree level, institution, and relevance of field (0-100)
- communication: Score based on how clearly and professionally the resume is written (0-100)
- leadership: Score based on evidence of leadership, mentoring, or initiative in the resume (0-100)
- sustainability: Score based PRIMARILY on the candidate's sustainability statement above.
  Consider: environmental awareness, social responsibility, community involvement, ethical work
  practices, values-driven projects, volunteer work, mentoring, open source contributions,
  and any effort to create positive impact. A detailed, genuine statement should score 70+.
  A vague or minimal statement should score 30-50. An empty statement scores 0.
- overallScore: A holistic weighted average of all 6 categories above (0-100)

Return this exact JSON structure:
{
  "skillsMatch": { "score": 0, "reason": "..." },
  "experienceLevel": { "score": 0, "reason": "..." },
  "education": { "score": 0, "reason": "..." },
  "communication": { "score": 0, "reason": "..." },
  "leadership": { "score": 0, "reason": "..." },
  "sustainability": { "score": 0, "reason": "Explain specifically what sustainability qualities were found in their statement and resume." },
  "overallScore": { "score": 0, "reason": "..." }
}

Every score must be a number between 0 and 100. Every reason must reference specific content from the resume or sustainability statement. Return ONLY the JSON.`;

    const raw = await askGroq(prompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Score parse error:", e, "Raw:", cleaned);
      return null;
    }
  }

  // ── MAIN: RUN FULL EVALUATION ────────────────────────────
  async function evaluate(file, sustainabilityAnswer = "") {
    const resumeText = await extractText(file);
    const [summary, structured, scores] = await Promise.all([
      generateSummary(resumeText),
      extractStructuredData(resumeText),
      generateScores(resumeText, sustainabilityAnswer)
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
