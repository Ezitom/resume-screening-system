// ============================================================
// RESUME EVALUATOR ENGINE
// File: resume-evaluator.js
// Evaluates resumes by passing extracted text to backend Flask API
// ============================================================

const ResumeEvaluator = (() => {

  // ── STEP 1: EXTRACT TEXT FROM FILE CLIENT-SIDE ────────────
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
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  // ── STEP 2: MAIN EVALUATION ENTRY POINT ────────────────────
  async function evaluate(file, sustainabilityAnswer = "", jobPosting = null) {
    if (!jobPosting || typeof jobPosting !== "object") {
      throw new Error("Job posting data is required for evaluation. Candidate scoring cannot be performed without valid job posting context.");
    }

    const resumeText = await extractText(file);

    const backendUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL)
      ? import.meta.env.VITE_BACKEND_URL
      : (window.__VITE_BACKEND_URL__ || 'https://resume-screening-system-e5qq.onrender.com');

    const response = await fetch(`${backendUrl}/api/evaluate-resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resume_text: resumeText,
        sustainability_statement: sustainabilityAnswer,
        job_posting: jobPosting
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Evaluation request failed (Status ${response.status})`);
    }

    return await response.json();
  }

  return { evaluate };

})();

window.ResumeEvaluator = ResumeEvaluator;
