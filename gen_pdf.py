import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

text_path = r"D:\proyects\libros-tracker\funciones-main.txt"
pdf_path = r"D:\proyects\libros-tracker\funciones-main.pdf"

doc = SimpleDocTemplate(pdf_path, pagesize=A4,
                        leftMargin=2 * cm, rightMargin=2 * cm,
                        topMargin=2 * cm, bottomMargin=2 * cm)

styles = getSampleStyleSheet()
title_style = ParagraphStyle('Title', parent=styles['Title'],
                             fontSize=18, leading=22, spaceAfter=2 * cm)
subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                fontSize=12, textColor=colors.grey, spaceAfter=1.5 * cm)
section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14,
                               spaceBefore=1 * cm, spaceAfter=0.6 * cm,
                               textColor=colors.HexColor('#1a1a2e'))
subsection_style = ParagraphStyle('Subsection', parent=styles['Heading3'], fontSize=12,
                                  spaceBefore=0.6 * cm, spaceAfter=0.3 * cm,
                                  textColor=colors.HexColor('#2b2b4a'))
body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10,
                            leading=14, spaceAfter=0.4 * cm)
bullet_style = ParagraphStyle('Bullet', parent=body_style, leftIndent=1.2 * cm,
                              bulletIndent=0.2 * cm, spaceAfter=0.2 * cm)

story = []
story.append(Paragraph('FUNCIONES A AGREGAR A MAIN', title_style))
story.append(Paragraph('Actualizado: 21/10/2026', subtitle_style))
story.append(HRFlowable(width='100%', thickness=1, color=colors.grey, spaceAfter=1 * cm))

with open(text_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

para_buffer = []

def flush_paragraphs():
    global para_buffer
    if para_buffer:
        story.append(Paragraph(' '.join(para_buffer), body_style))
        story.append(Spacer(1, 0.2 * cm))
        para_buffer.clear()

for raw in lines:
    line = raw.strip()
    if not line:
        flush_paragraphs()
        continue

    # Section heading: line of '='
    if re.fullmatch(r'=+', line):
        flush_paragraphs()
        story.append(Paragraph(line, section_style))
        continue

    # Subsection heading: line of '-'
    if re.fullmatch(r'-+', line):
        flush_paragraphs()
        story.append(Paragraph(line, subsection_style))
        continue

    # Item heading: numeric (1.1, 2.1, ...)
    m = re.match(r'^(\d+\.\d+)\s+(.+)$', line)
    if m:
        flush_paragraphs()
        story.append(Paragraph(m.group(1) + ' ' + m.group(2), subsection_style))
        continue

    # Bullet item
    if line.startswith('- '):
        flush_paragraphs()
        bullet_text = line[2:].strip()
        story.append(Paragraph('•  ' + bullet_text, bullet_style))
        continue

    # Normal paragraph line
    para_buffer.append(line)

flush_paragraphs()

doc.build(story)
print('PDF generado:', pdf_path)
