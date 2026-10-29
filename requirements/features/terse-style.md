# Fitur: Gaya ringkas & saran minimalis

| Informasi | Keterangan |
| --- | --- |
| Branch | `feature/terse-style` |
| Status | **Draft, menunggu keputusan** (bagian 6). Belum ada kode tambahan sampai keputusan diambil. |
| Prinsip | YAGNI: tambahkan hanya yang dibutuhkan requirement di bawah. |

## 1. Kenapa

Pengguna ingin temuan Saksi:

- langsung ke **inti masalah**, ringkas, tanpa basa-basi;
- **tidak mengarang**: tidak ada kode, file, atau hasil tes yang tidak ada;
- menyarankan **perubahan sekecil mungkin** (YAGNI), bukan fungsi atau abstraksi baru;
- tetap bisa **diajak chat**;
- berangkat dari **tujuan proyek**, bukan hanya potongan kode.

Requirement saat ini (UR-44, UR-48) cuma bilang "ringkas atau mendidik" tanpa kriteria yang bisa dicek.

## 2. Celah di requirement saat ini

| # | Celah | Requirement terkait | Akibatnya | Usulan |
| --- | --- | --- | --- | --- |
| G1 | "Ringkas" tidak punya kriteria terukur | UR-44 | Tiap model menafsirkan sendiri, hasil tidak konsisten | UR-51 |
| G2 | Tidak ada aturan saran minimal | UR-27 | Model cenderung menyarankan helper, refactor, atau layer baru | UR-52 |
| G3 | UR-27 meminta alternatif tiap ada tradeoff | UR-27 | Saran memanjang dan menambah opsi yang tidak dibutuhkan | Ubah UR-27: alternatif hanya bila tradeoff nyata, maksimal satu |
| G4 | Belum ditegaskan bahwa ringkas tidak boleh menggabungkan fakta dan dugaan | UR-18, UR-19 | Kalimat ringkas cenderung membuang "mungkin" dan "belum diketahui" | UR-53 |
| G5 | Gaya chat tidak diatur | UR-26, UR-44 | Temuan ringkas, tapi jawaban chat bertele-tele | UR-54 |
| G6 | Tidak ada konteks proyek tingkat atas; yang ada hanya tujuan per perubahan (UR-08) dan aturan proyek (UR-09) | UR-08, UR-09 | Reviewer menilai kode tanpa tahu proyeknya untuk apa | UR-55 |
| G7 | Persona "developer yang sedang belajar" butuh penjelasan, padahal gaya default ringkas | Bagian 2, UR-44 | Pemula kehilangan penjelasan | Keputusan K1 |
| G8 | Angka batas panjang belum ditentukan | Bagian 14 | Tidak bisa diuji | Keputusan K4 |
| G9 | Merapikan bahasa bisa butuh permintaan tambahan ke model | UR-50 | Biaya dan waktu bertambah diam-diam | Keputusan K5 |

## 3. Requirement baru / diubah

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-51 | Wajib | Saya menangkap inti masalah dari judulnya saja. | Judul menyebut akar masalah, bukan gejala, dalam ≤ 8 kata. Satu temuan per akar masalah; lokasi lain dengan penyebab sama masuk ke bukti. Bagian lain hanya diisi bila memberi informasi baru. |
| UR-52 | Wajib | Saya mendapat saran perbaikan yang minimal. | Saran = perubahan terkecil yang menyelesaikan masalah temuan itu. Tidak ada fungsi, abstraksi, dependency, atau konfigurasi baru kecuali masalahnya memang tidak selesai tanpa itu, dan alasannya disebut. Tidak ada saran di luar masalah temuan. |
| UR-53 | Wajib | Penjelasan yang ringkas tetap jujur. | Pengamatan, dugaan, dan hal yang belum diketahui tetap terpisah. "Pasti" hanya untuk temuan terkonfirmasi. Identifier di bagian pengamatan dan file yang disebut harus ada di kode yang direview; kalau tidak, temuan ditolak. Tidak ada klaim hasil tes/build yang tidak pernah dijalankan. |
| UR-54 | Wajib | Chat juga ringkas dan langsung menjawab. | Jawaban chat mengikuti gaya yang dipilih, menjawab pertanyaan di kalimat pertama, dan tetap terkait temuan (UR-26). |
| UR-55 | Penting | Saksi tahu proyek ini dibuat untuk apa sebelum menilai kode. | Saksi memakai ringkasan proyek (tujuan, pengguna, batasan) bila ada. Bila tidak ada, hasil review menyebut bahwa penilaian hanya berdasarkan kode dan tujuan perubahan. Cara mengisinya mudah ditemukan. |
| UR-27 (ubah) | Wajib | Saran menjelaskan tujuan dan konsekuensinya. | … Alternatif hanya ditampilkan bila tradeoff-nya nyata, maksimal satu. |
| UR-44 (ubah) | Penting | Gaya bantuan bisa diatur. | Pilihan gaya dibatasi pada yang benar-benar beda kebutuhannya (lihat K1). Batas panjang per bagian terdokumentasi. |

## 4. Skenario penerimaan

| ID | Situasi | Yang harus terlihat | UR |
| --- | --- | --- | --- |
| UA-25 | Dua baris berbeda gagal karena error yang sama diabaikan. | Satu temuan, judulnya akar masalah, dua lokasi sebagai bukti. | UR-51 |
| UA-26 | Bug cukup diperbaiki dengan menambah satu pengecekan `err`. | Saran hanya menambah pengecekan itu, tanpa helper atau wrapper baru. | UR-52 |
| UA-27 | Model menyebut `validateCard()` di pengamatan, padahal fungsi itu tidak ada. | Temuan tidak ditampilkan dan dihitung sebagai keluaran yang dibuang. | UR-53 |
| UA-28 | Pengguna bertanya "kenapa?" pada sebuah temuan. | Kalimat pertama jawaban adalah alasannya, tanpa pembuka basa-basi. | UR-54 |
| UA-29 | Belum ada ringkasan proyek. | Review tetap jalan; cakupan review menyebut bahwa tujuan proyek tidak diketahui. | UR-55 |
| UA-30 | Temuan pakai gaya ringkas, padahal kepastiannya rendah. | Label tetap dugaan, dan bagian "belum diketahui" tetap terisi. | UR-53 |

## 5. Audit YAGNI terhadap kode yang sudah ada di branch ini

Commit `c8e1300` sudah menambahkan sebagian implementasi sebelum requirement ini ditulis. Usulannya:

| Bagian | Dibutuhkan oleh | Usulan |
| --- | --- | --- |
| Aturan gaya + contoh di prompt | UR-51, UR-52, UR-54 | **Simpan**; tambahkan aturan saran minimal dan aturan chat |
| Tolak identifier/file karangan | UR-53 | **Simpan** (kecil, dan langsung mencegah ngarang) |
| Deteksi klaim "pasti" dan klaim hasil tes/build | UR-53 | **Simpan**, hanya bagian itu |
| Deteksi frasa pengisi (daftar regex) | — (aturan di prompt sudah cukup) | **Buang** |
| Permintaan rewrite tambahan ke model | — (menambah biaya, G9) | **Buang**, kecuali K5 memutuskan lain |
| Potong paksa di batas karakter | UR-51? | Tergantung K4 |
| Tiga gaya (`terse`, `concise`, `educational`) | UR-44 | Tergantung K1; usulan: **dua gaya** |
| Konteks proyek | UR-55 | Belum ada; tunggu K2 |

## 6. Keputusan yang dibutuhkan sebelum koding

| # | Pertanyaan | Usulan (paling minimal) |
| --- | --- | --- |
| K1 | Berapa pilihan gaya? | Dua: **Ringkas** (default) dan **Mendidik** (untuk pemula). `concise` dibuang. |
| K2 | Dari mana Saksi tahu tujuan proyek? | Pakai yang sudah ada: `README.md` di root repo + `saksi.projectRules`. Tidak ada file atau setting baru. |
| K3 | Apakah review diblokir sampai konteks proyek diisi? | **Tidak.** Cukup disebut di cakupan review (UA-29). Memblokir melanggar UR-06 (satu tindakan). |
| K4 | Kalau teks melebihi batas? | Batas cukup diminta di prompt dan tidak dipotong, karena potongan bisa memutus makna. Hanya teks lebih dari 2× batas yang dipotong. |
| K5 | Permintaan rewrite tambahan? | **Buang.** Prompt + contoh + penolakan grounding sudah cukup; tanpa biaya tambahan. |
| K6 | Apakah Saksi juga harus menandai perubahan yang tidak sesuai atau tidak tercakup requirement proyek? | **Belum.** Itu fitur terpisah (butuh UR-55 dulu). Catat sebagai kandidat berikutnya. |

Setelah keputusan K1–K6 diambil, implementasi cukup mengubah `src/core/prompts.ts`, `src/core/style.ts`, `src/core/review.ts`, dan tesnya. Tidak perlu modul baru.
