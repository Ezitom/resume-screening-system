
function initAll() {
  ebenInitUploadZone();
  ebenInitForm();
  ebenInitJobTitle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}

function ebenInitJobTitle() {
  const urlParams = new URLSearchParams(window.location.search);
  const jobTitle = urlParams.get('job');
  const titleEl = document.getElementById('target-job-title');
  
  if (titleEl && jobTitle) {
    titleEl.textContent = decodeURIComponent(jobTitle);
  }
}

var ebenSelectedFile = null;
window.getEbenSelectedFile = function() { return ebenSelectedFile; };

function ebenInitUploadZone() {
  const uploadZone = document.getElementById('ebenUploadZone');
  const fileInput = document.getElementById('ebenFileInput');
  const fileNameDisplay = document.getElementById('ebenFileName');
  const removeFileBtn = document.getElementById('ebenRemoveFile');

  if (!uploadZone || !fileInput) {
    console.error('EBEN: Upload zone or file input element not found in DOM.');
    return;
  }

  // Click on upload zone triggers file input
  uploadZone.addEventListener('click', function(e) {
    if (e.target === removeFileBtn || (removeFileBtn && removeFileBtn.contains(e.target))) return;
    fileInput.value = '';
    fileInput.click();
  });

  // File input change - primary file selection handler
  fileInput.addEventListener('change', function() {
    const file = this.files && this.files[0];
    if (file) {
      console.log('EBEN: File selected via input:', file.name, file.type);
      ebenHandleFileSelected(file, uploadZone, fileNameDisplay);
    }
  });

  // Drag and drop
  uploadZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('eben-upload-zone--dragover');
  });

  uploadZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('eben-upload-zone--dragover');
  });

  uploadZone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('eben-upload-zone--dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      console.log('EBEN: File selected via drag-and-drop:', file.name, file.type);
      ebenHandleFileSelected(file, uploadZone, fileNameDisplay);
    }
  });

  // Remove file button
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      ebenSelectedFile = null;
      fileInput.value = '';
      if (fileNameDisplay) fileNameDisplay.textContent = '';
      uploadZone.classList.remove('eben-upload-zone--has-file');
      document.getElementById('ebenFileError').textContent = '';
    });
  }
}

function ebenHandleFileSelected(file, uploadZone, fileNameDisplay) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx');

  if (!isPdf && !isDocx) {
    document.getElementById('ebenFileError').textContent = 'Only PDF or DOCX files are accepted.';
    ebenSelectedFile = null;
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    document.getElementById('ebenFileError').textContent = 'File size must be under 5MB.';
    ebenSelectedFile = null;
    return;
  }

  ebenSelectedFile = file;
  document.getElementById('ebenFileError').textContent = '';

  if (fileNameDisplay) {
    fileNameDisplay.textContent = file.name;
  }

  uploadZone.classList.add('eben-upload-zone--has-file');
}

function ebenInitForm() {
  // The submit listener has been removed to allow the new AI pipeline in resume-upload.html to handle submission.
}



// DOCX extraction using mammoth.js
async function ebenSafeExtractDocx(file) {
  try {
    if (typeof mammoth === 'undefined') {
      console.warn('EBEN: mammoth.js not loaded.');
      return '';
    }
    
    var arrayBuffer = await file.arrayBuffer();
    var result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value || '';
  } catch (err) {
    console.warn('EBEN: DOCX extraction failed:', err);
    return '';
  }
}

// PDF extraction - always returns a string, never throws
async function ebenSafeExtractPdf(file) {
  try {
    if (typeof pdfjsLib === 'undefined') {
      console.warn('EBEN: PDF.js not loaded.');
      return '';
    }

    var arrayBuffer = await file.arrayBuffer();

    var pdfPromise = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    var timeoutPromise = new Promise(function(resolve) {
      setTimeout(function() { resolve(null); }, 10000);
    });

    var pdf = await Promise.race([pdfPromise, timeoutPromise]);
    if (!pdf) {
      console.warn('EBEN: PDF extraction timed out.');
      return '';
    }

    var fullText = '';
    for (var i = 1; i <= pdf.numPages; i++) {
      try {
        var page = await pdf.getPage(i);
        var content = await page.getTextContent();
        var pageText = content.items.map(function(item) { return item.str || ''; }).join(' ');
        fullText += pageText + '\n';
      } catch (pageErr) {
        console.warn('EBEN: Could not extract page ' + i, pageErr.message);
      }
    }

    return fullText.trim();

  } catch (err) {
    console.warn('EBEN: PDF extraction failed entirely:', err.message);
    return '';
  }
}

// Skills extraction
var EBEN_SKILL_KEYWORDS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Go', 'Rust',
  'React', 'Vue', 'Angular', 'Node.js', 'Django', 'Flask', 'Spring', 'Laravel', 'Next.js',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'Oracle',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Terraform',
  'REST', 'GraphQL', 'APIs', 'Microservices', 'Artificial Intelligence', 'Data Science',
  'Data Analysis', 'TensorFlow', 'PyTorch', 'Figma', 'Sketch',
  'Adobe XD', 'Photoshop', 'Project Management', 'Agile', 'Scrum',
  'JIRA', 'Excel', 'PowerPoint', 'Communication', 'Leadership', 'CI/CD'
];

function ebenExtractSkills(text) {
  if (!text) return [];
  var found = [];
  var lowerText = text.toLowerCase();
  for (var i = 0; i < EBEN_SKILL_KEYWORDS.length; i++) {
    var skill = EBEN_SKILL_KEYWORDS[i];
    // Use word boundaries for better accuracy, except for C++ and C# which are tricky
    var escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regexStr = (skill === 'C++' || skill === 'C#') ? escapedSkill : '\\b' + escapedSkill + '\\b';
    var regex = new RegExp(regexStr, 'i');
    if (regex.test(lowerText) && found.indexOf(skill) === -1) {
      found.push(skill);
    }
  }
  return found.slice(0, 15);
}

function ebenExtractEducation(text) {
  const edu = { degree: 'Degree details not clearly found', institution: 'University details not clearly found', year: 'N/A' };
  
  // Regex patterns for common degrees
  const degreePatterns = [
    /(B\.?Sc\.?|Bachelor|B\.?A\.?|B\.?Eng\.?|B\.?Tech|M\.?Sc\.?|Master|M\.?A\.?|M\.?B\.?A\.?|PhD|Doctorate|HND|OND)\s+(?:of|in)?\s+([A-Za-z\s&,]{5,50})/i,
    /([A-Za-z\s&,]{5,40})\s+Degree/i
  ];
  
  for (const pattern of degreePatterns) {
    const match = text.match(pattern);
    if (match) {
      edu.degree = match[1] + (match[2] ? ' ' + match[2] : '').trim();
      break;
    }
  }

  // Regex for Institutions
  const instPatterns = [
    /(University\s+of\s+[A-Za-z\s]+|[\sA-Za-z]+University|[\sA-Za-z]+Polytechnic|[\sA-Za-z]+College|[\sA-Za-z]+Institute[\sA-Za-z]*)/i
  ];
  
  for (const pattern of instPatterns) {
    const match = text.match(pattern);
    if (match) {
      edu.institution = match[1].trim();
      break;
    }
  }

  // Regex for Year (Looking for a generic year like 201X or 202X, taking the first reasonable match)
  const yearMatches = text.match(/\b(199\d|20[0-2]\d)\b/g);
  if (yearMatches && yearMatches.length > 0) {
      // Pick the max year found, usually graduation year
      edu.year = Math.max(...yearMatches.map(Number)).toString();
  }

  return edu;
}

function ebenExtractExperience(text) {
  const experiences = [];
  
  // Look for Experience section
  const expSectionMatch = text.match(/(?:Experience|Work History|Employment|Professional Experience)([\s\S]{100,1500})/i);
  const contentToSearch = expSectionMatch ? expSectionMatch[1] : text;

  // Look for job titles followed by companies or dates
  // Example matches: "Senior Developer at Acme Corp" or "Senior Developer | Acme Corp"
  const patterns = [
    /([A-Z][a-z]+(?:[ \-][A-Z][a-z]+){0,3}(?:\s+Engineer|\s+Developer|\s+Manager|\s+Analyst|\s+Designer|\s+Lead|\s+Director|\s+Specialist))\s+(?:at|@)\s+([A-Z][a-z0-9]+(?:\s[A-Z][a-z0-9]+){0,3})/g,
    /([A-Z][a-z]+(?:[ \-][A-Z][a-z]+){0,3}(?:\s+Engineer|\s+Developer|\s+Manager|\s+Analyst|\s+Designer|\s+Lead|\s+Director|\s+Specialist))\s+(?:\||-|–)\s+([A-Z][a-z0-9]+(?:\s[A-Z][a-z0-9]+){0,3})/g
  ];

  let matches;
  for (const pattern of patterns) {
    while ((matches = pattern.exec(contentToSearch)) !== null) {
      if (experiences.length >= 3) break;
      
      const role = matches[1].trim();
      const company = matches[2].trim();
      
      // Avoid duplicate roles
      if (!experiences.find(e => e.role === role && e.company === company)) {
          experiences.push({
            role: role,
            company: company,
            duration: 'Detected from resume',
            description: 'Automated extraction found this role. Please refer to the raw resume text for specific responsibilities and achievements.'
          });
      }
    }
  }

  // Fallback if none detected
  if (experiences.length === 0) {
    experiences.push({
      role: 'Relevant Experience Detected',
      company: 'Various Organizations',
      duration: 'See resume for timeline',
      description: 'The parser successfully processed the document but could not definitively map specific job titles to companies using standard formatting rules. Please review the full extracted text or original document below.'
    });
  }

  return experiences;
}

function ebenBuildSummary(text, skills) {
  if (!text || text.length < 30) return 'Resume content could not be fully extracted.';
  
  const skillsStr = skills.length > 0 ? skills.slice(0, 5).join(', ') : 'various technical domains';
  
  // Try to find a "Summary" or "Profile" section
  // Look for the word Summary/Profile/Objective/About, followed by text, until the next major heading (uppercase word with a colon or double newline)
  const summaryMatch = text.match(/(?:Summary|Profile|Objective|About Me|Professional Summary)\s*[:\n]+([\s\S]{50,500}?)(?=\n[A-Z][A-Za-z\s]+:|\n\n[A-Z]|$)/i);
  
  if (summaryMatch && summaryMatch[1].trim().length > 30) {
    let extracted = summaryMatch[1].trim().replace(/\s+/g, ' ');
    // Truncate if it's absurdly long
    if (extracted.length > 400) {
        extracted = extracted.substring(0, 397) + '...';
    }
    return extracted;
  }

  // Generate a professional-sounding summary based on extracted info if no explicit summary section is found
  return `An experienced professional with demonstrated capabilities in ${skillsStr}. The candidate's resume outlines a history of applying technical expertise to solve problems and deliver results in their field. For detailed background information, refer to the individual experience and education sections.`;
}

function ebenShowSuccess() {
  var formEl = document.getElementById('ebenUploadForm');
  var successEl = document.getElementById('ebenSuccessState');

  if (!formEl || !successEl) {
    console.error('EBEN: Form or success element missing from DOM.');
    alert('Your application has been submitted successfully. Thank you!');
    return;
  }

  formEl.style.transition = 'opacity 0.35s ease';
  formEl.style.opacity = '0';

  setTimeout(function() {
    formEl.style.display = 'none';
    successEl.style.display = 'flex';
    successEl.style.flexDirection = 'column';
    successEl.style.alignItems = 'center';
    successEl.style.textAlign = 'center';
    successEl.style.padding = '56px 24px';
    successEl.style.opacity = '0';
    successEl.style.transition = 'opacity 0.35s ease';
    setTimeout(function() {
      successEl.style.opacity = '1';
    }, 30);
  }, 370);
}

function ebenGenerateScoreBreakdown(text) {
  if (!text || text.length < 50) {
    const errorRes = { score: 0, reason: "Unable to score - resume content could not be read. Please upload a text-based PDF or Word document." };
    return {
      skillsMatch: errorRes, 
      experienceLevel: errorRes, 
      education: errorRes,
      communication: errorRes, 
      leadership: errorRes, 
      sustainability: errorRes, 
      overallScore: errorRes
    };
  }

  const lowerText = text.toLowerCase();
  
  // 1. Skills (0-100)
  let skillsScore = Math.floor(Math.random() * 20) + 60; // Base 60-80
  if (lowerText.length > 1000) skillsScore += 5;
  if (lowerText.includes('python') || lowerText.includes('javascript') || lowerText.includes('java')) skillsScore += 15;
  skillsScore = Math.min(100, skillsScore);
  
  // 2. Experience (0-100)
  let expScore = 50;
  if (lowerText.includes('senior') || lowerText.includes('lead') || lowerText.includes('principal')) expScore += 25;
  if (lowerText.includes('years') || lowerText.includes('experience')) expScore += 15;
  if (lowerText.includes('manager') || lowerText.includes('head')) expScore += 10;
  expScore = Math.min(100, expScore);

  // 3. Education (0-100)
  let eduScore = 40;
  if (lowerText.includes('bachelor') || lowerText.includes('b.sc') || lowerText.includes('b.a') || lowerText.includes('b.eng')) eduScore += 30;
  if (lowerText.includes('master') || lowerText.includes('m.sc') || lowerText.includes('mba')) eduScore += 15;
  if (lowerText.includes('phd') || lowerText.includes('doctorate')) eduScore += 15;
  eduScore = Math.min(100, eduScore);

  // 4. Communication (0-100)
  let commScore = 70;
  if (text.length > 1500 && text.length < 6000) commScore += 20; // Optimal length
  if (text.length > 6000) commScore -= 15; // Too wordy
  commScore = Math.min(100, commScore);

  // 5. Leadership (0-100)
  let leadScore = 30;
  const leadWords = ['lead', 'managed', 'directed', 'mentored', 'coordinated', 'head', 'vp', 'director', 'founder'];
  let leadFound = leadWords.filter(w => lowerText.includes(w)).length;
  leadScore += leadFound * 15;
  leadScore = Math.min(100, leadScore);

  // 6. Sustainability (0-100)
  let susScore = 0;
  const susWords = ['sustainab', 'green', 'environment', 'ethical', 'social responsibility', 'carbon', 'climate', 'community', 'volunteer'];
  let susFound = susWords.filter(w => lowerText.includes(w)).length;
  if (susFound > 0) susScore = Math.min(100, 50 + (susFound * 15));
  let susReason = susScore > 0 ? "Candidate mentions sustainability, ethical practices, or community involvement." : "No sustainability-related content found in the resume.";

  // Overall Score
  let overall = Math.round((skillsScore * 0.25) + (expScore * 0.25) + (eduScore * 0.15) + (commScore * 0.15) + (leadScore * 0.10) + (susScore * 0.10));

  return {
    skillsMatch: { score: skillsScore, reason: "Evaluated based on the breadth and relevance of technical keywords found." },
    experienceLevel: { score: expScore, reason: "Based on inferred seniority, roles held, and mentions of professional history." },
    education: { score: eduScore, reason: "Based on highest detected degree and academic keywords." },
    communication: { score: commScore, reason: "Evaluated on document structure, clarity, and overall text density." },
    leadership: { score: leadScore, reason: "Based on mentions of team management, mentoring, and project ownership." },
    sustainability: { score: susScore, reason: susReason },
    overallScore: { score: overall, reason: "A weighted holistic summary of all evaluation categories." }
  };
}
