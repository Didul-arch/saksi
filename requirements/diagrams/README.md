# Diagram Saksi

Indeks semua diagram untuk [kebutuhan pengguna Saksi](../user_requirement.md). Setiap file berisi satu topik, diagram Mermaid, penjelasan singkat, dan requirement (`UR-xx`) / skenario (`UA-xx`) yang dirujuk.

> Diagram menggambarkan **pengalaman dan perilaku yang dituju dari sudut pandang pengguna**. Nama kotak, status, dan entitas adalah bahasa bersama untuk diskusi, bukan keputusan arsitektur, format komunikasi, atau struktur penyimpanan.

## Daftar diagram

| No | Diagram | Jenis | Menjawab pertanyaan | Requirement utama |
| --- | --- | --- | --- | --- |
| 01 | [Konteks sistem](01-system-context.md) | Flowchart konteks | Siapa dan apa saja yang terlibat? Di mana batas kepercayaannya? | UR-01, UR-28, UR-36 |
| 02 | [Perjalanan pengguna](02-user-journey.md) | Journey + flowchart | Seperti apa satu siklus kerja dari setup sampai review ulang? | Bagian 5 |
| 03 | [Setup model](03-flow-setup-model.md) | Flowchart | Bagaimana pengguna menyiapkan dan memeriksa model pilihannya? | UR-01–05 |
| 04 | [Memulai review](04-flow-start-review.md) | Flowchart | Apa yang terjadi saat tombol/shortcut review ditekan? | UR-06–15, UR-36–39 |
| 05 | [Pipeline review](05-sequence-review-pipeline.md) | Sequence | Urutan dari snapshot sampai temuan tampil di editor. | UR-14–23, UR-31 |
| 06 | [Refinement](06-flow-refinement.md) | Flowchart | Bagaimana temuan diperiksa ulang, dipersempit, atau dibatalkan? | UR-21–25, bagian 9 |
| 07 | [Tindak lanjut temuan](07-flow-finding-followup.md) | Flowchart + sequence | Bertanya, klarifikasi, feedback, menerapkan & membatalkan saran. | UR-24–30, UR-41–42 |
| 08 | [Status review](08-state-review-status.md) | State | Semua status review yang harus bisa dibedakan. | UR-31–35, bagian 10 |
| 09 | [Siklus hidup temuan](09-state-finding-lifecycle.md) | State | Dari kandidat sampai aktif, dibuang, ditanggapi, kedaluwarsa. | UR-19, UR-23, UR-33, UR-41 |
| 10 | [ERD konseptual](10-erd-conceptual.md) | ER diagram | Informasi apa saja yang dikenal pengguna dan bagaimana kaitannya? | Bagian 7–8 |
| 11 | [Aliran data & privasi](11-data-flow-privacy.md) | Data flow | Data apa yang keluar, kapan, ke mana, dan siapa yang mengizinkan? | UR-03, UR-36–40 |
| 12 | [Contoh Go: akses fungsi](12-example-go-export.md) | Decision flow | Bagaimana reviewer menilai `setPaymentNumber`? | Bagian 9.3, UA-06, UA-07 |
| 13 | [Interaksi companion](13-companion-interaction.md) | Flowchart | Permukaan UI apa yang dipakai, termasuk keyboard-only & tanpa pet? | UR-44–50 |
| 14 | [Peta requirement](14-requirement-map.md) | Mindmap + tabel | Pengelompokan UR per area, prioritas, dan tahap rilis. | Bagian 6, 13 |
| 15 | [Traceability](15-traceability.md) | Matriks | UR mana diuji UA mana dan digambar di diagram mana? | Semua |

## Legenda yang dipakai

| Simbol / warna | Arti |
| --- | --- |
| Kotak bulat `( )` | Tindakan pengguna |
| Kotak siku `[ ]` | Perilaku Saksi |
| Belah ketupat `{ }` | Keputusan / percabangan |
| Kotak `[( )]` | Sumber data (repo, penyimpanan lokal) |
| Garis putus-putus | Opsional, bergantung pilihan pengguna, atau belum tentu tersedia |
| Kelas `user` (biru) | Kendali pengguna |
| Kelas `warn` (kuning) | Kondisi terbatas / butuh perhatian |
| Kelas `stop` (merah) | Gagal, dibatalkan, atau ditolak |
| Kelas `ok` (hijau) | Hasil yang dapat dipakai |

## Cara merender

- **GitHub**: otomatis.
- **VS Code**: pasang extension *Markdown Preview Mermaid Support*, lalu buka preview Markdown.
- **CLI**: `npx @mermaid-js/mermaid-cli -i file.md -o out.md` untuk menghasilkan SVG.
