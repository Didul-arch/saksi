# Saksi — Requirements

Folder ini berisi **kebutuhan pengguna** dan **diagram** untuk Saksi, companion reviewer kode di VS Code.

## Saksi itu apa?

Saksi membantu developer menemukan kesalahan dan keraguan yang relevan pada perubahan kode mereka, **langsung dari editor**. Developer menulis kode, memulai review dengan satu tindakan, lalu menerima temuan yang:

- menunjuk bagian kode secara tepat,
- menjelaskan apa yang diamati, dampaknya, dan buktinya,
- jujur tentang apa yang **belum** diketahui (dugaan ≠ fakta, pertanyaan ≠ tuduhan).

Pengguna memakai **layanan dan model AI pilihannya sendiri**. Pengguna tetap memegang keputusan atas cakupan review, data yang dikirim, temuan yang diterima, dan perubahan kode yang diterapkan. Saksi tidak mengubah kode tanpa tindakan pengguna.

Fokus awal yang diusulkan: **developer Go di VS Code**, penjelasan dalam Bahasa Indonesia.

## Folder ini buat apa?

Untuk menyepakati **apa yang dibutuhkan pengguna** sebelum memutuskan **bagaimana membangunnya**.

| Dipakai untuk | Caranya |
| --- | --- |
| Membahas & memprioritaskan kebutuhan | Rujuk ID `UR-xx` di [`user_requirement.md`](user_requirement.md). |
| Menilai apakah pengalaman sudah benar | Pakai skenario `UA-xx` (bagian 11 dokumen requirement). |
| Menyamakan gambaran alur, status, dan data | Baca diagram di [`diagrams/`](diagrams/README.md). |
| Mulai mendesain implementasi | Diagram memberi bentuk; keputusan teknis tetap dibuat di dokumen desain terpisah. |

Dokumen ini **bukan** daftar fitur yang sudah jadi dan **bukan** spesifikasi teknis. Prioritas dan pilihan awal di dalamnya masih usulan.

## Isi folder

```
requirements/
├── README.md                 ← kamu di sini
├── user_requirement.md       ← kebutuhan pengguna (UR-01…UR-50, UA-01…UA-24)
└── diagrams/
    ├── README.md             ← indeks diagram + cara membaca
    ├── 01-system-context.md
    ├── 02-user-journey.md
    ├── 03-flow-setup-model.md
    ├── 04-flow-start-review.md
    ├── 05-sequence-review-pipeline.md
    ├── 06-flow-refinement.md
    ├── 07-flow-finding-followup.md
    ├── 08-state-review-status.md
    ├── 09-state-finding-lifecycle.md
    ├── 10-erd-conceptual.md
    ├── 11-data-flow-privacy.md
    ├── 12-example-go-export.md
    ├── 13-companion-interaction.md
    ├── 14-requirement-map.md
    └── 15-traceability.md
```

Semua diagram ditulis dengan [Mermaid](https://mermaid.js.org/) di dalam Markdown, sehingga langsung ter-render di GitHub dan VS Code (dengan extension Markdown Mermaid) dan mudah di-diff saat requirement berubah.

## Cara membaca (urutan yang disarankan)

1. **[`user_requirement.md`](user_requirement.md) bagian 1–5** — tujuan, pengguna, prinsip, batas, perjalanan utama.
2. **[Konteks sistem](diagrams/01-system-context.md)** dan **[perjalanan pengguna](diagrams/02-user-journey.md)** — gambaran besar.
3. **Flow 03–07** — alur per tahap: setup, mulai review, pipeline, refinement, tindak lanjut.
4. **State 08–09** — semua status review dan temuan yang harus bisa dibedakan pengguna.
5. **[ERD konseptual](diagrams/10-erd-conceptual.md)** dan **[aliran data](diagrams/11-data-flow-privacy.md)** — informasi apa yang ada dan ke mana ia pergi.
6. **[Traceability](diagrams/15-traceability.md)** — cek UR mana sudah tergambar dan diuji oleh UA mana.

## Prinsip yang tidak boleh hilang

Apa pun prioritas yang berubah, delapan prinsip di bagian 3 dokumen requirement tetap dijaga. Ringkasnya:

- Koreksi harus dapat diperiksa — selalu ada bukti yang bisa dibuka.
- Keraguan dinyatakan jujur — terkonfirmasi, dugaan, pertanyaan, dan saran opsional dibedakan.
- Refinement boleh **membatalkan** temuan.
- Pengguna mengendalikan tindakan dan data.
- Hasil kosong ≠ kode bebas bug; review gagal/sebagian ≠ review bersih.

## Hubungan dengan prototipe MVP

Ada prototipe awal `saksi-review` 0.1.0 (extension VS Code, belum di repo ini) yang dipakai sebagai **referensi**, bukan acuan final. Diagram di sini menggambarkan pengalaman yang **dituju**. Bila perilaku prototipe berbeda, diagram memberi catatan "MVP saat ini". Beberapa jarak yang menonjol:

| Area | Prototipe 0.1.0 | Yang dituju requirement |
| --- | --- | --- |
| Model | Endpoint chat-completions compatible, key di SecretStorage | Sama arahnya; plus cek konfigurasi & info biaya (UR-02) |
| Cakupan | Saved working tree vs `HEAD` + untracked; file belum disimpan dilewati | Plus pilihan cakupan lain, file dihapus/rename dipertimbangkan (UR-13, UR-14) |
| Shortcut | `Ctrl+Alt+I`, bisa diganti ke `Ctrl+I` | Sama; benturan shortcut dijelaskan (UR-07) |
| Validasi | Lokasi & kutipan dicek ke snapshot; label hanya "Dugaan AI" / "Pertanyaan" | Plus label terkonfirmasi bila ada dasar yang bisa ditunjukkan (UR-19) |
| Refinement | Belum ada | Pemeriksaan ulang yang bisa mempertahankan/mempersempit/membatalkan (UR-21–25) |
| Tindak lanjut | Lihat bukti, abaikan | Tanya, klarifikasi, feedback berlabel, preview & undo saran (UR-24–30, UR-41) |
| Kode berubah | Seluruh hasil dibatalkan | Hanya temuan terdampak yang kedaluwarsa (UR-33, UR-34) |

## Status

| Informasi | Keterangan |
| --- | --- |
| Versi requirement | 1.0 (draft untuk dibahas) |
| Tanggal | 29 Oktober 2026 |
| Langkah berikutnya | Sepakati prioritas Wajib → dokumen desain teknis → evaluasi pengguna |

Kalau requirement berubah, perbarui `user_requirement.md` lebih dulu, lalu diagram yang terdampak dan tabel di [traceability](diagrams/15-traceability.md).
