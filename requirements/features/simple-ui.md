# Fitur: UI yang simpel

| Informasi | Keterangan |
| --- | --- |
| Branch | `feature/simple-ui` |
| Status | **Draft, menunggu keputusan S1–S4** |
| Prinsip | YAGNI: kurangi, jangan tambah. Detail dan chat sudah ada di thread inline, jadi panel tidak perlu mengulanginya. |

## 1. Kenapa

Panel sekarang menampilkan semuanya sekaligus: dua dropdown, kartu temuan dengan 7+ bagian, bukti, riwayat penilaian, 4 tombol tanggapan + alasan + checkbox, kotak chat, cakupan review, info dukungan, pemakaian token, dan disclaimer. Untuk pelajar, layar ini terlalu ramai. Padahal detail, chat, dan tanggapan sudah tersedia di thread inline tepat di bawah kode (UR-57).

## 2. Celah

| # | Celah | Terkait | Akibat |
| --- | --- | --- | --- |
| G1 | Detail temuan, chat, dan tanggapan muncul dua kali (panel dan thread inline) | UR-46, UR-57 | Pengguna bingung harus pakai yang mana |
| G2 | Pilihan jarang dipakai (cakupan, kedalaman, shortcut) selalu terlihat | UR-13, UR-25 | Layar utama ramai |
| G3 | Penanda di editor bertumpuk: garis bawah, label di ujung baris, ikon thread | UR-46 | Kode jadi berisik |
| G4 | Belum ada requirement soal "layar utama sesedikit mungkin" | UR-46, UR-49 | Tidak ada acuan saat menambah elemen UI |

## 3. Requirement

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-59 | Penting | Saya langsung tahu harus melakukan apa saat membuka panel. | Layar utama panel hanya berisi: pet + status, tujuan perubahan, tombol **Review**, dan daftar temuan satu baris per temuan. Pengaturan lain ada di bagian **Lainnya** yang terlipat. Peringatan penting (sebagian, gagal, tidak dapat divalidasi) tetap terlihat di status. |
| UR-60 | Penting | Detail temuan ada di satu tempat. | Klik temuan di panel membuka kode dan thread inline-nya. Detail, bukti, chat, dan tanggapan hanya ada di thread inline. |

## 4. Mockup panel

```
┌─────────────────────────────────┐
│ (owl)  Selesai dengan temuan    │  ← pet + status (gelembung)
│        2 hal untuk diperiksa.   │
│                                 │
│ Tujuan (opsional)               │
│ [dipakai dari package billing ] │
│                                 │
│ [      Review  · Ctrl+Alt+I   ] │
│                                 │
│ ◇ fmt.Fprintf tanpa writer      │  ← satu baris per temuan,
│   main.go:6                     │    klik = buka thread inline
│ ? setPaymentNumber unexported   │
│   payment.go:3                  │
│                                 │
│ ▸ Lainnya                       │  ← cakupan, kedalaman, model,
└─────────────────────────────────┘    shortcut, cakupan review,
                                       salin ringkasan, token
```

Isi **Lainnya** (terlipat):

- Cakupan & kedalaman
- Model aktif + tombol atur model, atur shortcut
- Cakupan review (file dilewati, temuan dibuang + alasan, dugaan dibatalkan)
- Salin ringkasan, bersihkan hasil, pemakaian token, info bahasa yang didukung

Bagian ini terbuka otomatis saat status sebagian atau tidak dapat divalidasi.

## 5. Keputusan yang dibutuhkan

| # | Pertanyaan | Usulan |
| --- | --- | --- |
| S1 | Detail, chat, dan tanggapan dihapus dari panel (hanya di thread inline)? | **Ya** (UR-60) |
| S2 | Cakupan, kedalaman, dan pengaturan lain dipindah ke **Lainnya**? | **Ya** (UR-59) |
| S3 | Label teks di ujung baris kode dimatikan secara default (`saksi.inlineHints` = `false`)? Garis bawah + ikon thread sudah cukup. | **Ya**, setting tetap ada |
| S4 | Isi thread inline dipadatkan: tanpa "Konsekuensi" (digabung ke Saran) dan tanpa label "belum diperiksa ulang" di judul thread? | **Tidak**: kepastian dan "belum diperiksa ulang" tetap perlu terlihat (UR-19, UR-21). Hanya "Konsekuensi" digabung ke Saran. |
