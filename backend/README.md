# AML Guard — Backend

## Rýchly štart

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8222 --reload
```

API beží na http://localhost:8222

## API Endpointy

- `GET /api/health` — Health check
- `POST /api/auth/register` — Registrácia
- `POST /api/auth/login` — Prihlásenie → JWT token
- `GET /api/auth/me` — Profil + compliance dashboard
- `POST /api/policy/generate` — Generovanie AML politiky (vrátane PDF)
- `GET /api/policy/list` — Zoznam politík
- `GET /api/policy/{id}` — Detail politiky
- `POST /api/cdd/` — Vytvorenie KYC záznamu
- `GET /api/cdd/` — Zoznam KYC záznamov
- `GET /api/cdd/{id}` — Detail KYC
- `PUT /api/cdd/{id}/verify` — Overenie KYC
- `POST /api/ubo/` — Vytvorenie UBO záznamu
- `GET /api/ubo/` — Zoznam UBO
- `POST /api/str/` — Hlásenie podozrivého obchodu
- `GET /api/str/` — Zoznam STR
- `POST /api/str/{id}/submit` — Odoslanie STR
- `POST /api/training/complete` — Absolvovanie školenia
- `GET /api/training/` — Zoznam školení

## Demo účet

Po spustení servera spustiť seed skript:

```bash
.venv/bin/python3 scripts/seed.py
```

Prihlasovacie údaje: `demo@amlguard.sk` / `demo1234`
