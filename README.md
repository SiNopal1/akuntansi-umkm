# Akuntansi UMKM

Aplikasi pencatatan keuangan lokal untuk usaha mikro, kecil, dan menengah manufaktur Indonesia.

## Cara Membuka Aplikasi

Buka `index.html` langsung di browser modern (Chrome, Firefox, Edge, Safari terbaru).

Atau deploy ke Vercel sebagai situs statis (lihat bagian Deployment).

## Stack Teknologi

- HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- Tailwind CSS via Play CDN (development mode)
- Browser `localStorage` sebagai penyimpanan data

## Struktur Direktori

```
akuntansi-umkm/
├── index.html              # Entry point
├── vercel.json             # Vercel routing config
├── css/
│   ├── tokens.css          # Design tokens
│   └── app.css             # Component styles
├── js/
│   ├── app/                # Bootstrap, router, state, events
│   ├── domain/             # Accounting engine, inventory, tax (Phase 2+)
│   ├── services/           # Transaction and report services (Phase 3+)
│   ├── storage/            # localStorage abstraction (Phase 2+)
│   ├── ui/
│   │   ├── components/     # Modal, toast, table, form components
│   │   ├── pages/          # Page render functions
│   │   └── layout.js       # Application shell
│   └── utils/              # Currency, date, validation, ID utilities
├── assets/
│   └── icons/              # SVG icon library
└── docs/                   # Architecture notes, accounting rules, QA checklist
```

## Deployment ke Vercel

1. Push ke repositori GitHub.
2. Import di [vercel.com](https://vercel.com).
3. Tidak ada build command yang diperlukan — ini adalah situs statis.
4. Vercel akan menyajikan `index.html` untuk semua rute (dikonfigurasi via `vercel.json`).

## Catatan Penting: Penyimpanan Data

Data keuangan tersimpan di `localStorage` browser ini saja.

- Data **tidak tersinkronisasi** ke Vercel atau server manapun.
- Data **tidak tersedia** di browser atau perangkat lain.
- Lakukan **ekspor cadangan (JSON)** secara rutin dari menu Pengaturan.
- Hapus data browser (clear site data) akan **menghapus semua catatan keuangan**.

## Catatan: Tailwind CSS Play CDN

Aplikasi ini menggunakan Tailwind CSS Play CDN untuk kemudahan deployment tanpa build tools.

**Keterbatasan:**
- Memerlukan koneksi internet untuk memuat dan menghasilkan style Tailwind.
- Jika dibuka secara offline, tampilan mungkin tidak berfungsi meskipun data tetap aman.
- Tidak disarankan untuk produksi skala besar karena overhead runtime.
- Versi CDN harus dipantau untuk pembaruan keamanan.

**Migrasi ke produksi:** Jika diperlukan, dapat diganti dengan Tailwind CLI build yang menghasilkan CSS statis. Konsultasikan dengan tim teknis sebelum migrasi.

## Fase Implementasi

| Fase | Status | Deskripsi |
|------|--------|-----------|
| 0    | ✅ Selesai | Discovery, arsitektur, perencanaan |
| 1    | ✅ Selesai | Shell aplikasi dan design system |
| 2    | Menunggu approval | Konfigurasi usaha dan persistensi |
| 3    | Menunggu approval | Transaksi dan mesin akuntansi |
| 4    | Menunggu approval | Inventaris dan manufaktur |
| 5    | Menunggu approval | Laporan keuangan |
| 6    | Menunggu approval | Perpajakan |
| 7    | Menunggu approval | Pertukaran data |
| 8    | Menunggu approval | QA dan deployment |
