# ⚡ Supabase PostgreSQL Backend Architecture — TEC Events Platform

The backend for the **TEC Events Platform** runs **exclusively on Supabase PostgreSQL**.

---

## 🛠️ Step 1: Create Your Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/).
2. Create a new project named **`tec-events-platform`**.
3. Copy your **Database Password**.

---

## 🔑 Step 2: Set Your Database Connection String

Open `server/.env` and paste your Supabase Connection URI:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars
JWT_EXPIRES_IN=24h
REG_ID_PREFIX=TEC
CLIENT_URL=http://localhost:5173

# ─── Supabase PostgreSQL Connection ──────────────────────────────────────
# Obtain from Supabase Dashboard -> Project Settings -> Database -> Connection String (URI)
DATABASE_URL=postgresql://postgres.[your-project-ref]:[your-password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# ─── Supabase Client SDK ─────────────────────────────────────────────────
# Obtain from Supabase Dashboard -> Project Settings -> API
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 🗄️ Step 3: Run Database Migrations & Seeds

You can initialize the database tables on Supabase in two ways:

### Option A: Automatic CLI Migration
Run the start command; Knex will migrate the schema directly to your Supabase PostgreSQL database:
```bash
cd server
npm start
```

### Option B: Supabase SQL Editor (1-Click)
1. Go to your **Supabase Dashboard → SQL Editor**.
2. Open `server/src/db/supabase_schema.sql`.
3. Copy and paste the SQL script into the editor and click **RUN**.

---

## 🔐 Default Admin Credentials Seeded
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `SUPER_ADMIN`
