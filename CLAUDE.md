# Catatan untuk Claude

- Ikuti alur branch di `CONTRIBUTING.md`: setiap pekerjaan di branch baru dari `main` dengan prefix `feature/`, `fix/`, `refactor/`, `docs/`, `test/`, atau `chore/`. Jangan commit langsung ke `main`.
- Jalankan `npm run check` sebelum push.
- `src/core/` tidak boleh import `vscode`; tes unit di `test/unit/` (Vitest, `vscode` di-alias ke `test/mock/vscode.ts`).
- Kebutuhan pengguna & diagram ada di `requirements/`; rujuk ID `UR-xx` / `UA-xx`.
- **Requirement dulu, baru koding.** Untuk fitur baru, tulis/perbarui `requirements/features/<fitur>.md` (kenapa, celah requirement, UR/UA, keputusan terbuka) dan minta keputusan sebelum menulis kode.
- **YAGNI.** Implementasi minimal yang memenuhi requirement. Jangan tambah fungsi, modul, setting, atau abstraksi baru kalau bisa memakai yang sudah ada.
