# AML Guard — Backend

## Rýchly štart

### Lokálne (bez Dockeru)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8222 --reload
```

### Docker

```bash
cd backend
docker build -t aml-guard-api .
docker run -d --name aml-guard -p 8222:8222 aml-guard-api
```

### Docker Compose (odporúčané)

```bash
cd backend
docker compose up -d
```

### Render (free tier)

1. Forkni repo na GitHub
2. Na [dashboard.render.com](https://dashboard.render.com) klikni **New + > Blueprint**
3. Prepoj repo — Render automaticky nájde `backend/render.yaml`
4. Nastav `SECRET_KEY` v Environment Variables (alebo nechaj auto-generate)
5. Deploy jedným klikom → API na `https://aml-guard.onrender.com`

> ⚠️ **Free tier limity:** SQLite dáta sa stratia pri každom reštarte (ephemeral filesystem).  
> Pre ostrú prevádzku použi Render **Starter** ($7/mes) s PostgreSQL.

### Demo účet

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
