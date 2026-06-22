# CRM Solusi Klik

Aplikasi CRM untuk mencatat & mengelola **Lead** dan mengonversinya menjadi **SPK** (Surat Perintah Kerja), dengan alur kerja Sales → Finance, manajemen role/hak akses dinamis, dan pencatatan riwayat status (audit trail).

## Teknologi

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + SweetAlert2
- **Backend:** NestJS 10 + Prisma ORM (JWT Auth + RBAC)
- **Database:** PostgreSQL

## Fitur Utama

- Autentikasi JWT + login Google (opsional) dengan RBAC dinamis (role & hak akses dikelola via UI).
- Manajemen **Lead**: tambah, edit, hapus, ubah status (disertai catatan), reassign ke sales lain, pencarian, filter, dan pagination.
- Konversi Lead **WON** menjadi **SPK** dengan nomor otomatis (`SPK/YYYY/MM/0001`).
- Alur **SPK** Finance: klaim (shared queue + lock) → setujui/tolak → pembatalan yang mencascade ke Lead.
- Manajemen **User** & **Role** (akun Admin terlindungi, status user aktif/nonaktif).
- **Dashboard** ringkasan dan **Riwayat Status** lengkap di setiap Lead/SPK.

## Menjalankan Secara Lokal

### Prasyarat
- Node.js 18+ dan npm
- PostgreSQL (lokal atau via Docker)

### 1. Database (opsional via Docker)
```bash
docker compose up -d
```
PostgreSQL berjalan di `localhost:5432`. Jika memakai PostgreSQL sendiri, sesuaikan `DATABASE_URL` di `backend/.env`.

### 2. Backend
```bash
cd backend
cp .env.example .env          # sesuaikan DATABASE_URL & JWT_SECRET
npm install
npx prisma migrate deploy     # buat tabel
npm run prisma:seed           # isi role, permission & user demo
npm run start:dev             # http://localhost:3001/api
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL ke backend
npm install
npm run dev                    # http://localhost:3000
```

## Akun Demo

Password semua: `password123`

| Email | Role |
|-------|------|
| admin@solusiklik.id | Admin |
| sales@solusiklik.id | Sales |
| finance@solusiklik.id | Finance |

## Struktur Proyek

```
backend/    NestJS API (auth, users, roles, leads, spk, dashboard, history)
frontend/   Next.js App Router (halaman & komponen)
```

## Variabel Lingkungan

**backend/.env**
```
DATABASE_URL="postgresql://user:password@host:5432/crm_db"
JWT_SECRET="ganti-dengan-string-acak-panjang"
FRONTEND_ORIGIN="https://domain-anda.com"
# Google OAuth (opsional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="https://api.domain-anda.com/api/auth/google/callback"
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL="https://api.domain-anda.com/api"
```

## Lisensi

Proprietary — Solusi Klik.
