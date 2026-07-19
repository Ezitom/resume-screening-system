/* eben-data.js - shared mock data */
const EBEN_MOCK_CANDIDATES = [
  { 
    id: 'cand-ebenezer-tomiwa-oni', 
    name: 'Ebenezer Tomiwa Oni', 
    email: 'oniebenezer1@gmail.com', 
    jobTitle: 'Senior Backend Engineer', 
    score: 74, 
    status: 'Shortlisted', 
    sustainability: 'Suitable', 
    date: 'May 11, 2026', 
    experience: 7, 
    phone: '+234 810 555 0123',
    resumeSummary: 'Highly skilled Backend Engineer with 7 years of experience in architecting scalable distributed systems and microservices. Expert in Python, Django, and cloud infrastructure (AWS/GCP). Proven track record of optimizing database performance and leading technical teams in agile environments.',
    detectedSkills: ['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Redis', 'REST APIs', 'Git', 'CI/CD'],
    education: {
      degree: 'B.Eng. Computer Engineering',
      institution: 'Covenant University',
      year: '2019'
    },
    workExperience: [
      {
        role: 'Senior Software Engineer',
        company: 'FinTech Solutions',
        duration: '2022 – Present',
        description: 'Led the migration of monolithic services to microservices, improving deployment frequency by 40%.'
      },
      {
        role: 'Backend Developer',
        company: 'CloudScale Inc.',
        duration: '2019 – 2022',
        description: 'Optimized query performance for high-traffic APIs, reducing latency by 200ms.'
      }
    ]
  },
  { 
    id: 'cand-chidi-oliver', 
    name: 'Chidi Oliver', 
    email: 'chisco@gmail.com', 
    jobTitle: 'Senior Backend Engineer', 
    score: 60, 
    status: 'Shortlisted', 
    sustainability: 'Suitable', 
    date: 'May 12, 2026', 
    experience: 5, 
    phone: '+234 902 333 4444',
    resumeSummary: 'Dedicated Backend Developer with a strong foundation in Java and Spring Boot. Experienced in building robust APIs and managing database schemas. Passionate about clean code and system reliability.',
    detectedSkills: ['Java', 'Spring Boot', 'MySQL', 'Hibernate', 'REST APIs', 'Unit Testing', 'Maven'],
    education: {
      degree: 'B.Sc. Computer Science',
      institution: 'University of Ibadan',
      year: '2021'
    },
    workExperience: [
      {
        role: 'Software Engineer',
        company: 'DataFlow Systems',
        duration: '2021 – Present',
        description: 'Developing core features for an enterprise resource planning tool.'
      }
    ]
  },
  { id: 'mock-adaeze-nwosu', name: 'Adaeze Nwosu', email: 'adaeze.nwosu@email.com', jobTitle: 'Senior Backend Engineer', score: 91, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Dec 5, 2025', experience: 6, phone: '+234 801 234 5678' },
  { id: 'mock-emeka-obi', name: 'Emeka Obi', email: 'emeka.obi@email.com', jobTitle: 'Senior Backend Engineer', score: 84, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Dec 5, 2025', experience: 5, phone: '+234 802 345 6789' },
  { id: 'mock-fatima-alrashid', name: 'Fatima Al-Rashid', email: 'fatima.alrashid@email.com', jobTitle: 'UX Researcher', score: 78, status: 'Pending', sustainability: 'Suitable', date: 'Dec 4, 2025', experience: 4, phone: '+971 50 123 4567' },
  { id: 'mock-james-thornton', name: 'James Thornton', email: 'j.thornton@email.com', jobTitle: 'Senior Backend Engineer', score: 73, status: 'Pending', sustainability: 'Suitable', date: 'Dec 4, 2025', experience: 3, phone: '+44 7700 900123' },
  { id: 'mock-ngozi-eze', name: 'Ngozi Eze', email: 'ngozi.eze@email.com', jobTitle: 'Senior Backend Engineer', score: 65, status: 'Pending', sustainability: 'Marginally Suitable', date: 'Dec 3, 2025', experience: 2, phone: '+234 803 456 7890' },
  { id: 'mock-kwame-asante', name: 'Kwame Asante', email: 'k.asante@email.com', jobTitle: 'Senior Backend Engineer', score: 61, status: 'Rejected', sustainability: 'Marginally Suitable', date: 'Dec 3, 2025', experience: 4, phone: '+233 20 123 4567' },
  { id: 'mock-priya-mehta', name: 'Priya Mehta', email: 'priya.mehta@email.com', jobTitle: 'Senior Backend Engineer', score: 88, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Dec 2, 2025', experience: 6, phone: '+91 98765 43210' },
  { id: 'mock-olumide-bankole', name: 'Olumide Bankole', email: 'o.bankole@email.com', jobTitle: 'Senior Backend Engineer', score: 55, status: 'Rejected', sustainability: 'Marginally Suitable', date: 'Dec 2, 2025', experience: 2, phone: '+234 804 567 8901' },
  { id: 'mock-clara-mensah', name: 'Clara Mensah', email: 'clara.mensah@email.com', jobTitle: 'UX Researcher', score: 42, status: 'Rejected', sustainability: 'Not Suitable', date: 'Dec 1, 2025', experience: 1, phone: '+233 24 234 5678' },
  { id: 'mock-tunde-adeyemi', name: 'Tunde Adeyemi', email: 'tunde.adeyemi@email.com', jobTitle: 'UX Researcher', score: 79, status: 'Pending', sustainability: 'Suitable', date: 'Dec 1, 2025', experience: 5, phone: '+234 805 678 9012' },
  { id: 'mock-aisha-mohammed', name: 'Aisha Mohammed', email: 'aisha.mohammed@email.com', jobTitle: 'UX Researcher', score: 92, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Nov 30, 2025', experience: 4, phone: '+234 701 234 5678' },
  { id: 'mock-david-okonkwo', name: 'David Okonkwo', email: 'd.okonkwo@email.com', jobTitle: 'UX Researcher', score: 67, status: 'Pending', sustainability: 'Marginally Suitable', date: 'Nov 30, 2025', experience: 2, phone: '+234 702 345 6789' },
  { id: 'mock-grace-muthoni', name: 'Grace Muthoni', email: 'grace.muthoni@email.com', jobTitle: 'Data Analyst', score: 85, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Nov 29, 2025', experience: 3, phone: '+254 712 345678' },
  { id: 'mock-samuel-kiplangat', name: 'Samuel Kiplangat', email: 's.kiplangat@email.com', jobTitle: 'Data Analyst', score: 44, status: 'Rejected', sustainability: 'Not Suitable', date: 'Nov 29, 2025', experience: 1, phone: '+254 722 345678' },
  { id: 'mock-chiamaka-ofor', name: 'Chiamaka Ofor', email: 'c.ofor@email.com', jobTitle: 'Data Analyst', score: 76, status: 'Pending', sustainability: 'Suitable', date: 'Nov 28, 2025', experience: 2, phone: '+234 703 456 7890' },
  { id: 'mock-yusuf-abdullahi', name: 'Yusuf Abdullahi', email: 'y.abdullahi@email.com', jobTitle: 'Data Analyst', score: 53, status: 'Rejected', sustainability: 'Marginally Suitable', date: 'Nov 28, 2025', experience: 2, phone: '+234 704 567 8901' },
  { id: 'mock-blessing-ige', name: 'Blessing Ige', email: 'b.ige@email.com', jobTitle: 'Data Analyst', score: 89, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Nov 27, 2025', experience: 4, phone: '+234 705 678 9012' },
  { id: 'mock-kofi-annan-jr', name: 'Kofi Annan Jr.', email: 'kofi.annan@email.com', jobTitle: 'Data Analyst', score: 71, status: 'Pending', sustainability: 'Suitable', date: 'Nov 27, 2025', experience: 3, phone: '+233 26 123 4567' },
  { id: 'mock-zainab-bello', name: 'Zainab Bello', email: 'z.bello@email.com', jobTitle: 'Data Analyst', score: 38, status: 'Rejected', sustainability: 'Not Suitable', date: 'Nov 26, 2025', experience: 1, phone: '+234 706 789 0123' },
  { id: 'mock-peter-osei', name: 'Peter Osei', email: 'p.osei@email.com', jobTitle: 'HR Business Partner', score: 82, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Nov 26, 2025', experience: 5, phone: '+233 27 123 4567' },
  { id: 'mock-amara-diallo', name: 'Amara Diallo', email: 'a.diallo@email.com', jobTitle: 'HR Business Partner', score: 74, status: 'Pending', sustainability: 'Suitable', date: 'Nov 25, 2025', experience: 4, phone: '+221 77 123 4567' },
  { id: 'mock-chinedu-nwachukwu', name: 'Chinedu Nwachukwu', email: 'c.nwachukwu@email.com', jobTitle: 'HR Business Partner', score: 60, status: 'Rejected', sustainability: 'Marginally Suitable', date: 'Nov 25, 2025', experience: 3, phone: '+234 707 890 1234' },
  { id: 'mock-folake-adeyinka', name: 'Folake Adeyinka', email: 'f.adeyinka@email.com', jobTitle: 'DevOps Engineer', score: 95, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Nov 24, 2025', experience: 7, phone: '+234 708 901 2345' },
  { id: 'mock-ibrahim-musa', name: 'Ibrahim Musa', email: 'i.musa@email.com', jobTitle: 'DevOps Engineer', score: 47, status: 'Rejected', sustainability: 'Not Suitable', date: 'Nov 24, 2025', experience: 2, phone: '+234 709 012 3456' },
  { id: 'mock-nneka-okoli', name: 'Nneka Okoli', email: 'n.okoli@email.com', jobTitle: 'DevOps Engineer', score: 83, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Nov 23, 2025', experience: 5, phone: '+234 810 123 4567' },
  { id: 'mock-ousman-traore', name: 'Ousman Traore', email: 'o.traore@email.com', jobTitle: 'DevOps Engineer', score: 69, status: 'Pending', sustainability: 'Marginally Suitable', date: 'Nov 23, 2025', experience: 3, phone: '+223 66 123 4567' },
  { id: 'mock-rita-okafor', name: 'Rita Okafor', email: 'r.okafor@email.com', jobTitle: 'DevOps Engineer', score: 77, status: 'Pending', sustainability: 'Suitable', date: 'Nov 22, 2025', experience: 4, phone: '+234 811 234 5678' },
  { id: 'mock-solomon-tesfaye', name: 'Solomon Tesfaye', email: 's.tesfaye@email.com', jobTitle: 'Product Manager', score: 33, status: 'Rejected', sustainability: 'Not Suitable', date: 'Nov 22, 2025', experience: 2, phone: '+251 91 123 4567' },
  { id: 'mock-uchenna-eze', name: 'Uchenna Eze', email: 'u.eze@email.com', jobTitle: 'Product Manager', score: 86, status: 'Shortlisted', sustainability: 'Highly Suitable', date: 'Nov 21, 2025', experience: 6, phone: '+234 812 345 6789' },
  { id: 'mock-wanjiru-kamau', name: 'Wanjiru Kamau', email: 'w.kamau@email.com', jobTitle: 'Product Manager', score: 72, status: 'Pending', sustainability: 'Suitable', date: 'Nov 21, 2025', experience: 4, phone: '+254 733 123456' }
];

window.EBEN_MOCK_CANDIDATES = EBEN_MOCK_CANDIDATES;
