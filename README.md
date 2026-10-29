# Saksi

Companion reviewer kode di VS Code: review perubahan kodemu dengan model AI pilihanmu sendiri, dengan bukti yang bisa diperiksa dan ketidakpastian yang dinyatakan jujur. Saksi tidak mengubah kodemu.

> Status: **0.1.0, eksperimental.** Kebutuhan & diagram ada di [`requirements/`](requirements/README.md). Tes otomatis memakai repository Git sungguhan, server HTTP lokal, dan modul `vscode` tiruan; belum diuji di VS Code sungguhan dengan model sungguhan.

## Mulai pakai

1. `npm install && npm run package`, lalu di VS Code: **Extensions: Install from VSIX…** (atau tekan **F5** untuk Extension Development Host).
2. Buka repository Git (workspace tepercaya). Untuk Go, pasang extension Go agar `gopls` memberi konteks referensi & diagnostics.
3. **Saksi: Configure Model** — isi URL chat-completions, API key (opsional untuk server lokal), lalu pilih model dari daftar layanan atau ketik manual. **Saksi: Test Model Configuration** memeriksanya (diberi tahu dulu karena bisa berbayar).
4. Tulis **tujuan perubahan** di panel Saksi bila perlu, lalu tekan **Ctrl+Alt+I** (macOS **Cmd+Alt+I**) atau tombol **Review**. Keduanya memakai tujuan, cakupan, dan kedalaman yang sama.
5. Sebelum pengiriman pertama (atau saat layanan/cakupan/aturan/pengecualian berubah, atau ada informasi sensitif) Saksi bertanya dulu dan bisa menampilkan isi konteks yang dikirim.
6. Buka lokasi & bukti, tanya “kenapa?”, beri klarifikasi untuk penilaian ulang, atau tandai temuan **Relevan / Keliru / Disengaja / Ditunda** (opsional diingat untuk kode yang sama).

Ingin **Ctrl+I**? Klik *Atur shortcut* di panel (membuka Keyboard Shortcuts untuk `saksi.review`). Ctrl+I sudah dipakai fitur lain (mis. inline chat), jadi tidak dijadikan default.

## Yang sudah diimplementasikan

| Area (diagram) | Perilaku | Requirement |
| --- | --- | --- |
| Setup model (03) | Endpoint chat-completions (HTTPS / HTTP localhost), daftar model, key di SecretStorage, cek konfigurasi, model aktif di status bar; tidak ada fallback diam-diam. Endpoint/model hanya dari User Settings. | UR-01–05 |
| Memulai review (04) | Perintah, tombol, shortcut, menu konteks; tujuan perubahan bersama; aturan proyek (`saksi.projectRules`); cakupan: tersimpan sejak commit terakhir · staged · file aktif · bagian terpilih; file belum disimpan → pilih simpan atau lewati. | UR-06–13 |
| Konteks (05) | File baru, berubah, rename, dan **dihapus** (sebagai konteks penghapusan); referensi language provider + pencarian teks Go; file dilewati selalu dicatat beserta alasannya. | UR-14, UR-15 |
| Temuan (09) | Lokasi & kutipan divalidasi ke snapshot; label **Masalah terkonfirmasi** (hanya bila ada error language provider di lokasi itu) · **Dugaan masalah** · **Pertanyaan** · **Saran opsional**; dampak terpisah dari kepastian; pengamatan / alasan / yang belum diketahui dipisah. | UR-16–20 |
| Refinement (06) | Kedalaman Cepat / Standar / Mendalam; mencari bukti pendukung & pembantah, boleh meminta file tambahan (tetap patuh pengecualian), hasil: dipertahankan · dipersempit · jadi pertanyaan · disesuaikan · dibuang, dengan riwayat alasan. | UR-21–25 |
| Tindak lanjut (07) | Tanya & klarifikasi per temuan, saran + konsekuensi, feedback berlabel yang bisa diubah/diingat, salin ringkasan. Tidak ada perubahan kode otomatis. | UR-24, 26–28, 41, 42, 45 |
| Status (08) | Belum ada perubahan · berjalan (3 tahap) · selesai dengan/tanpa temuan · sebagian · tidak dapat divalidasi · gagal · dibatalkan · kedaluwarsa; hanya temuan yang kodenya berubah yang kedaluwarsa. | UR-31–35 |
| Data (11) | Konfirmasi & pratinjau sebelum kirim, `saksi.excludePaths` di semua tahap, deteksi heuristik informasi sensitif, redirect tidak diikuti, tanpa telemetry. | UR-36–40 |
| Companion (13) | Penanda dekat kode + Problems + Quick Fix, panel yang bisa dipakai dengan keyboard, label status/kepastian dalam teks, maskot bisa disembunyikan, gaya & bahasa penjelasan, info token per sesi. | UR-44, 46–50 |

Belum ada: penerapan saran dengan preview & undo (UR-29, UR-30 — perbaikan masih manual, sesuai pilihan awal di requirement bagian 14), riwayat review lintas sesi (UR-43), dan estimasi biaya (hanya token yang dilaporkan layanan).

## Pengaturan penting

| Setting | Default | Keterangan |
| --- | --- | --- |
| `saksi.endpoint`, `saksi.model` | — | User Settings saja. |
| `saksi.reviewDepth` | `standard` | `quick` / `standard` / `deep`. |
| `saksi.excludePaths` | `[]` | Path/folder yang tidak boleh dikirim. |
| `saksi.projectRules` | `[]` | Aturan proyek, ikut dikirim. |
| `saksi.confirmBeforeSend` | `whenChanged` | `always` untuk selalu bertanya. |
| `saksi.explanationStyle` / `saksi.explanationLanguage` | `concise` / `id` | Gaya & bahasa penjelasan. |
| `saksi.showOptionalSuggestions`, `saksi.showCompanion`, `saksi.inlineHints` | `true` | Tampilan. |

## Tech stack

| Bagian | Pilihan |
| --- | --- |
| Bahasa | TypeScript (strict); webview vanilla JS |
| Platform | VS Code Extension API, `engines.vscode ^1.96.0` |
| Bundler | esbuild → `dist/extension.js` |
| Test | Vitest (`src/core` + wiring extension dengan `vscode` tiruan) |
| Lint / packaging | ESLint + typescript-eslint / `@vscode/vsce` |

Runtime tanpa dependency npm.

## Struktur

```
src/
  core/            logika murni, tanpa 'vscode'
    snapshot.ts    cakupan + snapshot Git (baru/berubah/rename/dihapus), batas, pengecualian
    review.ts      satu run review: konteks → konfirmasi → pemeriksaan awal → refinement → status
    refine.ts      putaran refinement & penerapan verdict
    validate.ts    validasi lokasi/kutipan, label kepastian
    prompts.ts     prompt review, refinement, percakapan
    provider.ts    adapter chat-completions
    status.ts      state machine status review (diagram 08)
    staleness.ts, feedback.ts, sensitive.ts, related.ts, summary.ts, labels.ts
  controller.ts    orkestrasi di editor: dirty files, staleness, chat, feedback
  editorUi.ts      diagnostics, dekorasi, quick fix
  preview.ts       konfirmasi & pratinjau pengiriman
  setup.ts         konfigurasi model
  view.ts, viewState.ts, media/   panel companion
test/unit/         Vitest; test/mock/vscode.ts = modul vscode tiruan
requirements/      user requirement + diagram
```

## Development

```bash
npm install
```

```bash
npm run check
```

```bash
npm run package
```

**F5** menjalankan Extension Development Host; `npm run watch` untuk rebuild otomatis.
