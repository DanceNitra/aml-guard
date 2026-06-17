# AML Guard — Legal Review Package
## Pre compliance advokáta / právnu kanceláriu

### Čo potrebujeme

Dve AML politiky (SK a CZ) v troch variantoch — pre realitné kancelárie, účtovné firmy a predajcov áut.
Celkovo 6 dokumentov, každý ~4-6 strán A4, generovaný z databázy podľa odpovedí klienta.

### Stav (jún 2026)

| Dokument | Template | Právny review |
|---|---|---|
| SK — Realitná kancelária | ✅ Hotový (11 sekcií) | ❌ Treba |
| SK — Účtovná firma | ✅ Hotový (10 sekcií) | ❌ Treba |
| SK — Predajca áut | ✅ Hotový (8 sekcií) | ❌ Treba |
| CZ — Realitní kancelář | ✅ Hotový (11 sekcií) | ❌ Treba |
| CZ — Účetní firma | ✅ Hotový (10 sekcií) | ❌ Treba |
| CZ — Prodejce aut | ✅ Hotový (8 sekcií) | ❌ Treba |

### Legislatívny základ (v template)

**Slovensko:**
- Zákon č. 297/2008 Z.z. o ochrane pred legalizáciou príjmov z trestnej činnosti
- Zákon č. 54/2019 Z.z. o ochrane oznamovateľov
- Smernica Európskeho parlamentu a Rady (EÚ) 2018/843 (5. AML Directive)
- Smernica Európskeho parlamentu a Rady (EÚ) 2024/... (6. AML Directive, transpozícia 2024-2025)

**Česká republika:**
- Zákon č. 253/2008 Sb., o některých opatřeních proti legalizaci výnosů z trestné činnosti
- Zákon č. 171/2023 Sb., o ochraně oznamovatelů
- Směrnice Evropského parlamentu a Rady (EU) 2018/843

### Čo musí advokát skontrolovať

1. **Presnosť právnych odkazov** — sú paragrafy a zákony správne?
2. **Úplnosť** — nechýba niektorá povinná sekcia?
3. **Aktuálnosť** — platí legislatíva uvedená v template?
4. **Rozdiely SK vs CZ** — sú dostatočné?
5. **Zodpovednosť** — je správne formulovaná zodpovednosť compliance officera?
6. **Povinnosť mlčanlivosti** — je správne uvedená?
7. **Archivácia** — je správne uvedená 10-ročná lehota?

### Štruktúra template (SK realitka — ukážka)

```
1. Úvodné ustanovenia
2. Rozsah pôsobnosti
3. Zodpovedná osoba
4. Identifikácia a verifikácia klienta  
5. Konečný užívateľ výhod (UBO)
6. Politicky exponované osoby (PEP)
7. Riadenie rizík
8. Hlásenie podozrivých obchodov (STR)
9. Školenia zamestnancov
10. Archivácia a ochrana údajov
11. Záverečné ustanovenia
```

### Proces

1. Advokát dostane tento brief + aktuálne texty template (možno exportovať cez API)
2. Skontroluje template a vráti pripomienky
3. Zapracujeme do kódu (services/policy_gen.py)
4. Advokát finálne odsúhlasí
5. Každá vygenerovaná politika obsahuje disclaimer: "Tento dokument je vygenerovaný na základe vami zadaných údajov a nie je právnou radou."

### Odhad nákladov

- Review 6 template: ~€2,000-4,000 (SK advokát)
- Ongoing monitoring legislatívy: ~€500-1,000/mesiac (retainer)
- Alternatíva: one-off review + subscription na aktualizácie

### Kontaktné info (pre advokáta)

**Projekt:** AML Guard (amlguard.sk)
**Vývojár:** Rastislav Drahoš (rastislav.drahos@drahos.sk)
**GitHub:** https://github.com/DanceNitra/aml-guard
**Backend:** FastAPI Python, SQLite/PostgreSQL
