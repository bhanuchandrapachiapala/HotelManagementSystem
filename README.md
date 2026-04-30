# Casco Bay Hotel Management System

Internal web application for Casco Bay Hotel with three user surfaces: Admin Dashboard, Employee Checklist, and Guest Dinner Menu.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # fill in Supabase credentials
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env    # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
npm run dev
```

## Access
| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Admin login (ID: `CascoBay`, PW: `Casco@123`) |
| `http://localhost:5173/checklist` | Employee daily checklist (public) |
| `http://localhost:5173/dinner` | Guest dinner menu (public) |
| `http://localhost:8000/docs` | FastAPI interactive docs |

## Database Setup
Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor before first use.
