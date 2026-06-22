# CRM — Manajemen Lead & SPK

Aplikasi CRM untuk mencatat dan mengelola **Lead**, lalu mengonversinya menjadi **SPK** (Surat Perintah Kerja), dengan alur kerja **Sales → Finance**, manajemen role/hak akses dinamis, dan pencatatan riwayat status (audit trail).

## Teknologi

| Lapisan  | Teknologi                                          |
| -------- | -------------------------------------------------- |
| Frontend | Next.js 14 (App Router), Tailwind CSS, SweetAlert2 |
| Backend  | NestJS 10, Prisma ORM (JWT Auth + RBAC)            |
| Database | PostgreSQL                                         |

## Fitur Utama

* **Autentikasi & RBAC** — login JWT (opsional Google OAuth); role dan hak akses dikelola dinamis lewat UI.
* **Lead** — tambah, edit, hapus, ubah status (disertai catatan), reassign antar sales, plus pencarian, filter, dan pagination.
* **Konversi ke SPK** — hanya Lead berstatus *WON*, dengan nomor otomatis (`SPK/YYYY/MM/0001`).
* **Alur SPK (Finance)** — klaim (shared queue + lock) → setujui/tolak → pembatalan yang otomatis membatalkan Lead terkait.
* **User & Role** — manajemen pengguna, akun admin terlindungi, status aktif/nonaktif.
* **Dashboard & Audit Trail** — ringkasan data dan riwayat status lengkap di setiap Lead/SPK.

## Menjalankan Secara Lokal

### Prasyarat

* Node.js 18+
* PostgreSQL

Pastikan PostgreSQL sudah terinstal dan berjalan, lalu buat database sesuai kebutuhan dan sesuaikan nilai `DATABASE_URL` pada file `backend/.env`.

### 1. Backend

```bash
cd backend
cp .env.example .env          # sesuaikan DATABASE_URL & JWT_SECRET
npm install
npx prisma migrate deploy     # buat tabel
npm run prisma:seed           # isi role, permission & user demo
npm run start:dev             # http://localhost:3001/api
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL ke backend
npm install
npm run dev                   # http://localhost:3000
```

## Akun Demo

Password semua: `password123`

| Email                                             | Role    |
| ------------------------------------------------- | ------- |
| [admin@example.com](mailto:admin@example.com)     | Admin   |
| [sales@example.com](mailto:sales@example.com)     | Sales   |
| [finance@example.com](mailto:finance@example.com) | Finance |

## Struktur Proyek

```
backend/    NestJS API (auth, users, roles, leads, spk, dashboard, history)
frontend/   Next.js App Router (halaman & komponen)
```

## Variabel Lingkungan

### backend/.env

```env
DATABASE_URL="postgresql://user:password@host:5432/crm_db"
JWT_SECRET="string-acak-panjang"
FRONTEND_ORIGIN="http://localhost:3000"

# Google OAuth (opsional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL=""
```

### frontend/.env.local

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

Dibuat sebagai technical test.
