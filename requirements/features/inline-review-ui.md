# Fitur: Review inline di editor & pet companion

| Informasi | Keterangan |
| --- | --- |
| Branch | `feature/inline-review-ui` (di atas `feature/terse-style`) |
| Status | Diputuskan dan diimplementasikan |
| Prinsip | YAGNI: pakai UI bawaan VS Code (Comments API), jangan buat widget sendiri. |

## 1. Kenapa

Sejauh ini detail temuan dan chat hanya ada di panel samping, sehingga pengguna harus bolak-balik antara kode dan panel. Pengguna ingin temuan, penjelasan, dan chat muncul **langsung di bawah baris kode**, dan companion yang terasa hidup.

## 2. Celah di requirement saat ini

| # | Celah | Terkait | Usulan |
| --- | --- | --- | --- |
| G1 | UR-46 hanya meminta "penanda dekat kode", belum menyebut detail dan percakapan di tempat yang sama | UR-26, UR-46 | UR-57 |
| G2 | UR-47 hanya mengatur pet agar bisa disembunyikan; belum ada peran pet | UR-47 | UR-58 |
| G3 | Panel jadi panjang saat temuan banyak | UR-46 | Kartu di panel bisa dilipat; panel = ringkasan |

## 3. Requirement

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-57 | Wajib | Saya membaca, bertanya, dan menanggapi temuan tepat di bawah kodenya. | Tiap temuan aktif punya thread inline di lokasinya, berisi label kepastian & dampak, pengamatan, konsep, alasan, yang belum diketahui, saran, dan tautan bukti. Saya bisa **Tanya**, **Klarifikasi & nilai ulang**, dan **Tanggapi** dari thread itu. Thread hilang saat temuan kedaluwarsa atau dibuang. Teks dari model tidak pernah dirender sebagai HTML/markdown aktif. |
| UR-58 | Opsional | Companion menunjukkan keadaan review dengan ekspresi. | Pet di panel berekspresi sesuai status (diam, berpikir, menemukan sesuatu, bersih, bermasalah) dan "mengucapkan" status dalam teks yang sama dengan status biasa. Tanpa animasi bila sistem meminta reduced motion. Bisa disembunyikan (UR-47) tanpa kehilangan informasi. Tidak berjalan di atas kode. |

## 4. Skenario penerimaan

| ID | Situasi | Yang harus terlihat | UR |
| --- | --- | --- | --- |
| UA-32 | Review selesai dengan 1 temuan. | Ada thread inline di baris temuan; Quick Fix "Lihat detail" membukanya. | UR-57 |
| UA-33 | Pengguna membalas "kenapa?" di thread inline. | Pertanyaan dan jawaban Saksi muncul di thread yang sama; kode tidak berubah. | UR-57, UR-26, UR-28 |
| UA-34 | Pengguna mengedit baris temuan. | Thread inline hilang; temuan tampil di panel sebagai kedaluwarsa. | UR-57, UR-33 |
| UA-35 | Model menulis `[klik](command:...)` di penjelasan. | Teks tampil apa adanya, tidak menjadi tautan aktif. | UR-57 |
| UA-36 | Review berjalan, lalu selesai tanpa temuan. | Pet berpikir, lalu senang; teks status sama dengan saat pet disembunyikan. | UR-58 |

## 5. Keputusan

| # | Keputusan |
| --- | --- |
| D1 | Thread inline memakai Comments API VS Code, satu thread per temuan, terlipat secara default. Terbuka saat dipilih dari panel atau Quick Fix. |
| D2 | Balasan di thread punya dua tombol: **Tanya** dan **Klarifikasi & nilai ulang** (alur yang sama dengan panel). |
| D3 | Tanggapan (Relevan / Keliru / Disengaja / Ditunda) dari tombol di judul thread, lalu alasan opsional dan pilihan "ingat". |
| D4 | Tautan bukti di thread hanya boleh menjalankan satu perintah Saksi (`saksi.openEvidence`). |
| D5 | Diagnostics (Problems) dan label di ujung baris tetap ada untuk navigasi keyboard (UR-49). |
| D6 | Pet hanya di panel; tidak ada pet yang berjalan di editor. |
