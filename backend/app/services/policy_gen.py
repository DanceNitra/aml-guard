"""
AML Guard — Policy Generator Service
Generates complete AML policy documents as text and PDF.
"""

from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors
import os


class PolicyTemplate:
    
    SK_SECTIONS = {
        "realestate": [
            ("Úvodné ustanovenia", [
                "Táto AML politika (ďalej len 'Politika') je základným dokumentom spoločnosti {company_name} v oblasti boja proti legalizácii príjmov z trestnej činnosti a financovaniu terorizmu (AML/FT).",
                "Spoločnosť vykonáva činnosť sprostredkovania predaja a prenájmu nehnuteľností.",
                "Politika je vydaná v súlade so zákonom č. 297/2008 Z.z. o ochrane pred legalizáciou príjmov z trestnej činnosti v platnom znení.",
            ]),
            ("Rozsah pôsobnosti", [
                "Táto Politika sa vzťahuje na všetkých {employee_count} zamestnancov Spoločnosti.",
                "Vzťahuje sa na všetky obchodné vzťahy a jednorazové transakcie.",
            ]),
            ("Zodpovedná osoba", [
                "Zodpovednou osobou za AML/FT compliance je: {co_name}.",
                "Kontakt: {co_contact}",
            ]),
            ("Identifikácia a verifikácia klienta", [
                "Spoločnosť je povinná identifikovať každého klienta pred vznikom obchodného vzťahu.",
                "Identifikácia fyzickej osoby: občiansky preukaz alebo cestovný pas.",
                "Spôsob identifikácie: {id_procedure}.",
            ]),
            ("Konečný užívateľ výhod (UBO)", [
                "Spoločnosť identifikuje konečného užívateľa výhod každej právnickej osoby.",
                "Konečným užívateľom výhod je fyzická osoba s viac ako 25% podielom.",
            ]),
            ("Politicky exponované osoby (PEP)", [
                "Osobitná pozornosť pri obchodných vzťahoch s PEP osobami.",
                "Vyžaduje sa schválenie vedením a zvýšené monitorovanie.",
            ]),
            ("Riadenie rizík", [
                "Úroveň rizika Spoločnosti: {risk_level}.",
                "Riziko sa posudzuje podľa typu klienta, geografie, výšky transakcií.",
            ]),
            ("Hlásenie podozrivých obchodov (STR)", [
                "Každý zamestnanec je povinný bezodkladne informovať zodpovednú osobu o podozrivých transakciách.",
                "Zodpovedná osoba posúdi a v prípade potreby podá hlásenie Finančnej polícii.",
            ]),
            ("Školenia zamestnancov", [
                "Pravidelné ročné školenie všetkých zamestnancov v oblasti AML/FT.",
                "Školenie zahŕňa legislatívu, rozpoznávanie podozrivých obchodov, postupy identifikácie.",
            ]),
            ("Archivácia a ochrana údajov", [
                "Záznamy sa uchovávajú 10 rokov od skončenia obchodného vzťahu.",
                "Osobné údaje sú spracúvané v súlade s GDPR.",
            ]),
            ("Záverečné ustanovenia", [
                "Táto Politika je platná od {date}.",
                "Politika bude prehodnotená minimálne raz ročne.",
            ]),
        ],
    }
    
    @classmethod
    def build_text(cls, answers: dict) -> str:
        jurisdiction = answers.get("jurisdiction", "SK")
        company_type = answers.get("business_type", "realestate")
        sections = cls.SK_SECTIONS.get(company_type, cls.SK_SECTIONS["realestate"])
        
        fmt = {
            "company_name": answers.get("company_name", "Spoločnosť"),
            "ico": answers.get("ico", ""),
            "employee_count": answers.get("employee_count", "1"),
            "co_name": answers.get("co_name", "Zodpovedná osoba"),
            "co_contact": answers.get("co_contact", ""),
            "id_procedure": {"in_person": "osobná", "electronic": "elektronická", "both": "osobná alebo elektronická"}.get(answers.get("id_procedure"), "osobná"),
            "risk_level": {"low": "nízke", "medium": "stredné", "high": "vysoké"}.get(answers.get("risk_level"), "štandardné"),
            "date": datetime.utcnow().strftime("%d. %m. %Y"),
        }
        
        lines = [f"{'='*60}", f"AML POLITIKA", f"Spoločnosť: {fmt['company_name']}", f"IČO: {fmt['ico']}", f"Dátum: {fmt['date']}", f"{'='*60}\n"]
        for title, paragraphs in sections:
            lines.append(f"{'─'*40}\n{title.upper()}\n{'─'*40}\n")
            for p in paragraphs:
                lines.append(p.format(**fmt) + "\n")
        lines.append(f"{'='*60}\n{fmt['company_name']}\n{fmt['date']}\n\n_________________________\n{fmt['co_name']}\nCompliance Officer\n{'='*60}")
        return "\n".join(lines)
    
    @classmethod
    def build_pdf(cls, answers: dict, output_path: str) -> str:
        text = cls.build_text(answers)
        doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('T', parent=styles['Title'], fontSize=16, spaceAfter=20, textColor=colors.HexColor('#1a1a2e'))
        heading_style = ParagraphStyle('H', parent=styles['Heading2'], fontSize=11, spaceBefore=12, spaceAfter=6, textColor=colors.HexColor('#16213e'), fontName='Helvetica-Bold')
        body_style = ParagraphStyle('B', parent=styles['Normal'], fontSize=9, spaceAfter=6, leading=14)
        
        story = [Paragraph(f"AML POLITIKA", title_style),
            Paragraph(f"Spoločnosť: <b>{answers.get('company_name', '')}</b><br/>Dátum: {datetime.utcnow().strftime('%d. %m. %Y')}", body_style),
            Spacer(1, 12)]
        
        jurisdiction = answers.get("jurisdiction", "SK")
        company_type = answers.get("business_type", "realestate")
        sections = cls.SK_SECTIONS.get(company_type, cls.SK_SECTIONS["realestate"])
        fmt = {"company_name": answers.get("company_name", ""), "employee_count": answers.get("employee_count", "1"),
            "co_name": answers.get("co_name", ""), "co_contact": answers.get("co_contact", ""),
            "id_procedure": "osobná", "risk_level": "štandardné", "date": datetime.utcnow().strftime("%d. %m. %Y")}
        
        for title, paragraphs in sections:
            story.append(Paragraph(f"<b>{title}</b>", heading_style))
            for p in paragraphs:
                story.append(Paragraph(p.format(**fmt), body_style))
            story.append(Spacer(1, 6))
        
        story.append(Spacer(1, 20))
        story.append(Paragraph("_________________________", body_style))
        story.append(Paragraph(f"{fmt['co_name']}", body_style))
        story.append(Paragraph("Compliance Officer", body_style))
        doc.build(story)
        return output_path
