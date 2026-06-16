# AML Guard — Real Backend Build
# Fáza 1: FastAPI server + PostgreSQL + JWT Auth + Stripe

## Stack
- **Backend:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15+ (SQLAlchemy async + asyncpg)
- **Auth:** JWT (python-jose + passlib + bcrypt)
- **Payments:** Stripe
- **PDF:** ReportLab / WeasyPrint
- **Deployment:** Railway / Fly.io (alebo VPS)

## Štruktúra
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              — FastAPI app, CORS, middleware
│   ├── config.py            — Settings (env vars)
│   ├── database.py          — Async SQLAlchemy engine + session
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py          — User + Profile models
│   │   ├── company.py       — Company model
│   │   ├── policy.py        — AML Policy model
│   │   ├── cdd.py           — CDD/KYC record model
│   │   ├── ubo.py           — UBO record model
│   │   ├── str.py           — Suspicious Transaction Report model
│   │   └── training.py      — Training record model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py          — Login/Register schemas
│   │   ├── policy.py        — Policy request/response schemas
│   │   ├── cdd.py           — CDD schemas
│   │   └── ...
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py          — /api/auth/* endpoints
│   │   ├── policy.py        — /api/policy/* endpoints
│   │   ├── cdd.py           — /api/cdd/* endpoints
│   │   ├── ubo.py           — /api/ubo/* endpoints
│   │   ├── str.py           — /api/str/* endpoints
│   │   ├── training.py      — /api/training/* endpoints
│   │   ├── billing.py       — /api/billing/* (Stripe)
│   │   └── admin.py         — /api/admin/* (pre profesionálne komory)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py          — JWT creation/validation
│   │   ├── policy_gen.py    — PDF policy generator
│   │   └── billing.py       — Stripe integration
│   └── templates/
│       ├── sk/
│       │   ├── realestate.txt  — SK realitná AML šablóna
│       │   ├── accounting.txt
│       │   └── auto.txt
│       └── cz/
│           ├── realestate.txt
│           ├── accounting.txt
│           └── auto.txt
├── alembic/                 — DB migrations
├── alembic.ini
├── requirements.txt
├── .env.example
├── docker-compose.yml       — PostgreSQL + app
└── Dockerfile
```

## API Endpoints

### Auth
- POST /api/auth/register — Register + create company
- POST /api/auth/login — Login → JWT token
- GET /api/auth/me — Current user profile

### Policy
- POST /api/policy/generate — Generate AML policy PDF
- GET /api/policies — List company policies
- GET /api/policy/{id} — Get policy detail + PDF download

### CDD
- POST /api/cdd — Create CDD record
- GET /api/cdd — List CDD records
- GET /api/cdd/{id} — CDD detail
- PUT /api/cdd/{id}/verify — Mark ID as verified

### UBO
- POST /api/ubo — Create UBO record
- GET /api/ubo — List UBO records

### STR
- POST /api/str — Create suspicious transaction report
- GET /api/str — List reports

### Training
- POST /api/training/complete — Mark training as completed
- GET /api/training — List training records

### Billing
- POST /api/billing/create-checkout — Stripe checkout session
- POST /api/billing/webhook — Stripe webhook
- GET /api/billing/subscription — Current subscription

### Dashboard
- GET /api/dashboard — Compliance score + stats

## Deployment
1. `docker-compose up` — PostgreSQL + app lokálne
2. Pridať Stripe API keys do .env
3. Pridať DATABASE_URL (PostgreSQL connection string)
4. Nasadiť na Railway / Fly.io
