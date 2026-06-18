# DentaLedger 🦷

ระบบจัดการรายได้และภาษีเงินได้สำหรับทันตแพทย์ พร้อม AI อ่านใบเสร็จอัตโนมัติ

## Tech Stack

| Layer | Technology | Deploy |
|-------|-----------|--------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | Vercel (free) |
| Backend | .NET Core 8 Web API | Render.com (free) |
| Database | Supabase PostgreSQL + Auth + Storage | Supabase (free) |
| AI / OCR | Google Gemini 2.5 Flash | Google AI Studio (free tier) |

## Features

- 📸 AI อ่านใบเสร็จจากรูปภาพ (Gemini Vision)
- 📊 สรุปรายได้รายวัน / รายเดือน / รายปี
- 🧾 คำนวณภาษีตามมาตรา 40(1), 40(2), 40(6)
- 📅 ประมาณการ ภ.ง.ด.94 (ครึ่งปี) และ ภ.ง.ด.90 (สิ้นปี)
- 🔐 Auth ด้วย Supabase (JWT)

## Project Structure

```
dentaledger/
├── frontend/          # Next.js 14 App Router
├── backend/           # .NET Core 8 Web API
└── supabase/          # SQL migrations + seed
```

## Quick Start

### Prerequisites
- Node.js 20+
- .NET 8 SDK
- Supabase account (free)
- Google AI Studio API key (free)

### 1. Clone & setup env

```bash
git clone https://github.com/yourname/dentaledger.git
cd dentaledger

# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/DentaLedger.API/appsettings.example.json backend/DentaLedger.API/appsettings.Development.json
```

### 2. Supabase setup

1. สร้าง project ที่ [supabase.com](https://supabase.com)
2. รัน SQL จาก `supabase/migrations/001_init.sql`
3. Copy `Project URL` และ `anon key` ไปใส่ใน `.env.local`

### 3. Run frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 4. Run backend

```bash
cd backend/DentaLedger.API
dotnet restore
dotnet run
# → http://localhost:5000
```

## Deploy

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
```

### Backend → Render.com
1. Push to GitHub
2. New Web Service → connect repo → select `backend/` folder
3. Build command: `dotnet publish -c Release -o out`
4. Start command: `dotnet out/DentaLedger.API.dll`
5. เพิ่ม Environment Variables ใน Render dashboard

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

### Backend (appsettings.json)
```json
{
  "Supabase": {
    "Url": "https://xxx.supabase.co",
    "ServiceRoleKey": "eyJ..."
  },
  "Gemini": {
    "ApiKey": "AIza...",
    "Model": "gemini-2.5-flash"
  },
  "Jwt": {
    "Secret": "your-supabase-jwt-secret"
  }
}
```
