# Kontribusi ke Saksi

## Alur branch

`main` adalah base yang selalu bisa di-build dan lulus `npm run check`. Jangan commit langsung ke `main`; semua perubahan lewat branch + pull request.

1. Update `main`, lalu buat branch dari situ:

   ```bash
   git switch main && git pull && git switch -c feature/nama-singkat
   ```

2. Commit kecil dan jelas, push, buka PR ke `main`.
3. PR di-merge setelah review dan `npm run check` hijau. Hapus branch setelah merge.

## Nama branch

Format: `<jenis>/<deskripsi-singkat-kebab-case>`, opsional dengan ID requirement.

| Prefix | Untuk | Contoh |
| --- | --- | --- |
| `feature/` | Fitur / perilaku baru | `feature/apply-suggestion-preview`, `feature/ur-43-review-history` |
| `fix/` | Perbaikan bug | `fix/stale-after-rename` |
| `refactor/` | Ubah struktur tanpa ubah perilaku | `refactor/split-controller` |
| `docs/` | Dokumen, requirement, diagram | `docs/update-erd` |
| `test/` | Menambah / memperbaiki tes | `test/staged-scope-edge-cases` |
| `chore/` | Tooling, dependency, CI, build | `chore/add-ci-workflow` |

Satu branch = satu tujuan. Kalau sebuah perubahan menyentuh requirement, sebut ID-nya (`UR-xx`, `UA-xx`) di deskripsi PR, dan perbarui `requirements/` di PR yang sama bila perilakunya berubah.

## Commit

- Kalimat perintah singkat di baris pertama, mis. `Add staged scope to snapshot collection`.
- Jelaskan *kenapa* di badan commit bila tidak jelas dari diff.

## Sebelum push

```bash
npm run check
```

Logika domain baru masuk `src/core/` (tanpa import `vscode`) dan diberi tes Vitest di `test/unit/`.
