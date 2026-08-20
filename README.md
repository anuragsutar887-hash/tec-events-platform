# TEC Events Platform

A modern, full-stack **Technical Events Management Platform** built for **Indira College of Engineering and Management** — Technical Committee.

## 🌐 Live Features

- 🏠 **Public Landing Page** — Matrix/hacker-style scramble text hero with scroll-reveal animations
- 📅 **Events Listing & Detail** — Full event info, registration windows, venue, rules
- 📝 **Duo Team Registration** — Collects complete details for both Leader & Teammate
- 🔍 **Registration Lookup** — Find your ticket by Registration ID
- ⚡ **Live Arena Leaderboard** — Real-time QR check-in stream projected on arena screen
- 🔐 **Admin Panel** — Secure login-protected management dashboard

## 🛠 Admin Features

- 📊 **Executive Dashboard** — Live telemetry with skeleton-shimmer loading
- 📋 **Registrations** — Full table view with search, 4-column filters, check-in status
- ✅ **Check-in Console** — Intelligent QR scanner with URL/UUID/token parser
- ⚡ **Live Arena View** — Embedded inside admin panel (no public header bleed)
- 📊 **Excel Export** — Professional Duo Team CSV export (no scientific notation on phone numbers)
- ➕ **On-site Registration** — Instant desk registration for walk-in teams

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Pure CSS (Cyberpunk / Terminal Dark theme) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel / Any static host |

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/tec-events-platform.git
cd tec-events-platform/client
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Create a `.env` file in the `client/` directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ **Never commit your `.env` file** — it's in `.gitignore` for security.

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 5. Build for production
```bash
npm run build
```

## 📁 Project Structure

```
technical/
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/             # Supabase client (all API calls)
│   │   ├── components/
│   │   │   ├── common/      # Skeleton loaders, RevealOnScroll
│   │   │   ├── features/    # EventCard, etc.
│   │   │   └── layout/      # PublicHeader, Footer, AdminLayout
│   │   ├── hooks/           # useAuth, useScrambleText
│   │   ├── pages/
│   │   │   ├── admin/       # Dashboard, Events, CheckIn, Registrations...
│   │   │   └── public/      # Home, Events, EventDetail, Register, Lookup...
│   │   └── styles/          # global.css (design tokens)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── SUPABASE_SETUP.md        # Database schema reference
└── README.md
```

## 🗄️ Database (Supabase)

### Tables
- `events` — Event config, dates, registration windows, team size
- `registrations` — Team registrations with QR token and check-in status
- `participants` — Individual participant records (Leader + Teammate)

See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for full schema.

## 🎨 Design System

Custom cyberpunk/terminal dark theme using CSS custom properties:
- Background: `#070b14` → `#101828`
- Accent: `#38bdf8` (Cyan)
- Secondary: `#818cf8` (Purple)
- Font: JetBrains Mono + Inter

---

**Built with ❤️ for Indira College of Engineering and Management — Technical Committee**
