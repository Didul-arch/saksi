# 02 · Perjalanan Pengguna

Turunan dari bagian 5 dokumen requirement. Diagram pertama menunjukkan **perasaan yang dituju** di tiap langkah (skor 1–5 = target kenyamanan, bukan hasil pengukuran). Diagram kedua menunjukkan **siklus kerja** yang berulang.

## Journey

```mermaid
journey
    title Satu siklus review dengan Saksi
    section Persiapan
      Memilih layanan, model, dan akses: 3: Pengguna
      Tahu konfigurasi bisa dipakai dan ke mana konteks dikirim: 4: Pengguna, Saksi
    section Menulis
      Mengubah kode seperti biasa tanpa gangguan: 5: Pengguna
      Menulis tujuan perubahan bila perlu: 4: Pengguna
    section Review
      Memulai review dengan satu tindakan: 5: Pengguna
      Melihat cakupan aktif dan file belum disimpan: 4: Saksi
      Tetap bekerja sambil melihat progres: 4: Pengguna, Saksi
    section Menilai temuan
      Membaca temuan yang sudah diperiksa ulang: 4: Saksi
      Membuka bukti tanpa mencari file sendiri: 5: Pengguna, Saksi
      Bertanya, klarifikasi, terima, atau abaikan: 4: Pengguna
    section Lanjut
      Mengubah kode lalu review ulang: 4: Pengguna
      Hasil lama tidak menyesatkan: 5: Saksi
```

## Siklus kerja

```mermaid
flowchart TD
    A(["1 · Menyiapkan model"]) --> B(["2 · Menulis perubahan"])
    B --> C(["3 · Menyampaikan tujuan<br/>opsional"])
    C --> D(["4 · Memulai review"])
    B --> D
    D --> E["5 · Menunggu pemeriksaan<br/>progres terlihat"]
    E --> F["6 · Menerima hasil<br/>fakta / dugaan / pertanyaan dibedakan"]
    F --> G(["7 · Memeriksa bukti"])
    G --> H{"8 · Menentukan tindakan"}
    H -- "tanya / klarifikasi" --> I["Penjelasan & penilaian ulang"]
    I --> H
    H -- "terima saran" --> J(["Mengubah kode<br/>manual atau dengan preview"])
    H -- "abaikan + alasan" --> K["Feedback dicatat<br/>sesuai cakupan pilihan"]
    J --> L(["9 · Melanjutkan pekerjaan"])
    K --> L
    L --> M["Temuan terdampak<br/>ditandai kedaluwarsa"]
    M --> B

    classDef user fill:#dbeafe,stroke:#1d4ed8,color:#111
    class A,B,C,D,G,J,L user
```

| Langkah | Detail flow |
| --- | --- |
| 1 | [03 · Setup model](03-flow-setup-model.md) |
| 3–5 | [04 · Memulai review](04-flow-start-review.md), [05 · Pipeline](05-sequence-review-pipeline.md) |
| 6 | [06 · Refinement](06-flow-refinement.md) |
| 7–8 | [07 · Tindak lanjut](07-flow-finding-followup.md) |
| 9 | [08 · Status review](08-state-review-status.md), [09 · Siklus temuan](09-state-finding-lifecycle.md) |
