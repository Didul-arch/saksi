# Saksi

Companion reviewer kode di VS Code: review perubahan kodemu dengan model AI pilihanmu sendiri, dengan bukti yang bisa diperiksa dan ketidakpastian yang dinyatakan jujur.

> Status: scaffold awal. Kebutuhan & diagram ada di [`requirements/`](requirements/README.md).

## Tech stack

| Bagian | Pilihan |
| --- | --- |
| Bahasa | TypeScript (strict) |
| Platform | VS Code Extension API, `engines.vscode ^1.96.0` |
| Bundler | esbuild → `dist/extension.js` |
| Unit test | Vitest (untuk `src/core`, tanpa `vscode`) |
| Lint | ESLint + typescript-eslint |
| Packaging | `@vscode/vsce` |

Runtime tanpa dependency npm; semua paket di atas hanya devDependencies.

## Struktur

```
src/
  extension.ts   entry point: daftar command, view, lifecycle (boleh import 'vscode')
  core/          logika domain murni, tidak import 'vscode', diuji Vitest
test/unit/       unit test untuk src/core
media/           ikon & aset webview
requirements/    user requirement + diagram
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

Tekan **F5** di VS Code untuk menjalankan Extension Development Host. `npm run watch` untuk rebuild otomatis.
