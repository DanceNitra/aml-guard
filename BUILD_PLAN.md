# AML Guard — Build Plan

## Product
AML compliance SaaS pre SK/CZ nefinančné subjekty (realitky, autobazáry, advokáti, notári, učtovníci).

## Stack
| Vrstva | Technológia | Prečo |
|--------|------------|-------|
| Frontend | Vanilla JS, HTML, CSS | Najrýchlejší MVP, žiadny build step |
| Auth | Supabase Auth | Email/heslo, magic link, free tier |
| Databáza | Supabase PostgreSQL | 500MB free, row-level security |
| Storage | Supabase Storage | Pre nahraté ID, dokumenty |
| PDF | jsPDF + html2canvas | Client-side generovanie |
| Hosting | GitHub Pages + Supabase | €0/mesiac na začiatok |

## Architektúra
```
site/
├── index.html          — Landing page
├── app/
│   ├── index.html      — Dashboard (po prihlásení)
│   ├── policy.html     — Policy generátor
│   ├── cdd.html        — KYC / CDD workflow
│   ├── ubo.html        — Register UBO
│   ├── str.html        — Hlásenie podozrivých obchodov
│   ├── training.html   — Školenie
│   └── settings.html   — Nastavenia firmy
├── js/
│   ├── supabase.js     — Supabase client config
│   ├── auth.js         — Auth handling
│   ├── app.js          — Dashboard logic
│   ├── policy.js       — Policy generator
│   ├── cdd.js          — CDD workflow
│   ├── ubo.js          — UBO register
│   ├── str.js          — Suspicious transaction reporting
│   ├── training.js     — Training module
│   └── templates.js    — AML document templates (SK+CZ)
├── css/
│   └── app.css         — App styles
└── assets/
    └── training/       — Training video content (later)
```

## Fáza 1 — MVP (4-5 mesiacov)

### 1. Dátové modely + Auth (1. týždeň)
- Supabase project setup
- User auth (email/heslo + magic link)
- Tabuľky: profiles, companies, cdd_records, ubo_records, str_reports, policies, training_records
- Row-level security policies

### 2. Policy Generator (2. týždeň)
- Dotazník: typ firmy, veľkosť, rizikové faktory, jurisdikcia
- Generovanie AML politiky ako PDF (SK aj CZ verzia)
- Uloženie v histórii
- Download + print ready

### 3. CDD/KYC Workflow (2-3. týždeň)
- Formulár: meno, priezvisko, IČO/rodné číslo
- Upload ID (občianka/pas)
- Overenie identity (najprv manuálne, neskôr API)
- Register osôb a firiem
- Vyhľadávanie, filter, export

### 4. Register UBO (3. týždeň)
- Formulár pre konečných užívateľov výhod
- Prepojenie na CDD záznamy
- Strom vlastníctva (jednoduchý)
- Validácia: 25%+ ownership rule

### 5. STR Reporting (3-4. týždeň)
- Sprievodca: "je táto transakcia podozrivá?"
- Checklist podľa SK/CZ AML zákona
- Generovanie hlásenia (PDF)
- API submission (neskôr, najprv manuálny export)

### 6. Training Module (4. týždeň)
- Textový/obrázkový content (video neskôr)
- Kvíz na konci
- Certifikát (PDF)
- Tracking kto kedy absolvoval

### 7. Dashboard (4-5. týždeň)
- Compliance score
- Čo chýba / čo je po termíne
- Kalendár termínov
- Rýchle akcie

## Fáza 2 — Produkcia (6-9 mesiacov)
- eID / BankID / MojeID integrácia
- API pre STR submission na FS/FÚ
- Sanctions/PEP screening (open data)
- Viacuživateľské role
- API pre externé systémy
- Training video content (5-10 hodín)

## Revenue Model
| Tier | Cena/mes | Pre koho |
|------|----------|----------|
| Solo | €29 | Živnostník, 1 user, 10 CDD kontrol/mes |
| Small | €79 | Do 5 userov, 50 CDD, full features |
| Medium | €199 | Do 20 userov, neobmedzene, školenie |
| Add-on školenie | €199/rok | Ročný tréningový modul |

## Break-even
~200 zákazníkov pri €15-20K MRR → dosiahnuteľné 12-18 mesiacov.
