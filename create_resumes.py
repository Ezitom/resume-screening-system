from docx import Document
from reportlab.pdfgen import canvas
import os

resume_text = """
JOHN DOE
johndoe@email.com | +1234567890

PROFESSIONAL SUMMARY:
Highly motivated Senior Backend Engineer with over 8 years of experience in designing, developing, and deploying scalable software solutions. Proven track record of improving system performance and leading cross-functional teams in agile environments. Strong expertise in building microservices and working with cloud platforms.

SKILLS:
Python, JavaScript, Go, Django, React, PostgreSQL, Docker, Kubernetes, AWS, Git, CI/CD, Microservices

EXPERIENCE:
Senior Backend Engineer @ Tech Innovations Inc
2018 - Present
- Architected and implemented a microservices architecture using Go and Docker, improving system scalability by 40%.
- Led a team of 5 developers to deliver a new payment processing system ahead of schedule.

Software Developer | Data Solutions Corp
2015 - 2018
- Developed RESTful APIs using Python and Django, serving over 1 million requests daily.
- Optimized database queries in PostgreSQL, reducing average response time by 30%.

EDUCATION:
B.Sc. in Computer Science
University of Technology
2011 - 2015
"""

# Create DOCX
doc = Document()
doc.add_paragraph(resume_text)
doc.save('test_resume.docx')

# Create PDF
c = canvas.Canvas('test_resume.pdf')
y = 800
for line in resume_text.split('\n'):
    c.drawString(50, y, line)
    y -= 15
    if y < 50:
        c.showPage()
        y = 800
c.save()

print("Created test_resume.docx and test_resume.pdf")
