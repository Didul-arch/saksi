# 01 · Konteks Sistem

Gambaran siapa dan apa saja yang terlibat ketika Saksi dipakai, serta **batas kepercayaan**: apa yang tetap di mesin pengguna dan apa yang keluar ke layanan model.

```mermaid
flowchart LR
    dev(("Developer"))

    subgraph local["Mesin pengguna · tetap di bawah kendali pengguna"]
        direction TB
        editor["Editor VS Code<br/>kode, file belum disimpan, penanda"]
        saksi["Saksi<br/>companion reviewer"]
        repo[("Repository proyek<br/>kode + riwayat perubahan Git")]
        lang["Language provider<br/>mis. gopls: simbol, referensi, diagnostics"]
        secret[("Penyimpanan rahasia editor<br/>API key")]
        prefs[("Pengaturan & riwayat lokal<br/>tujuan, aturan, pengecualian, feedback")]
    end

    subgraph ext["Di luar mesin pengguna · dipilih pengguna"]
        model["Layanan & model AI<br/>pilihan pengguna"]
    end

    other(("Rekan / alat lain"))

    dev -- "menulis kode,<br/>memulai review,<br/>memberi keputusan" --> editor
    editor <--> saksi
    saksi -- "membaca perubahan<br/>(tanpa mengubah)" --> repo
    saksi -- "meminta konteks" --> lang
    saksi -- "mengambil key" --> secret
    saksi <--> prefs
    saksi == "konteks terpilih<br/>HANYA saat review dimulai<br/>& tujuan terlihat" ==> model
    model == "temuan mentah<br/>(belum dipercaya)" ==> saksi
    dev -. "menyalin ringkasan<br/>atas pilihan sendiri (UR-45)" .-> other

    classDef user fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef ext fill:#fef3c7,stroke:#b45309,color:#111
    class dev user
    class model ext
```

## Poin penting

| Hubungan | Aturan dari requirement |
| --- | --- |
| Saksi → Repository | Hanya membaca. Tidak menyimpan, commit, atau mengubah kode tanpa tindakan pengguna (UR-28). |
| Saksi → Layanan model | Hanya saat pengguna memulai review/refinement/percakapan; tujuan dan cakupan pengiriman jelas (UR-36). Pengecualian dihormati di semua tahap (UR-37). |
| Layanan model → Saksi | Keluaran model **tidak dipercaya** sampai lokasi dan buktinya diperiksa terhadap kode yang direview (UR-17, bagian 8.3). |
| Pemilihan layanan | Tidak berpindah ke layanan lain diam-diam saat gagal (UR-04, UR-35). |
| API key | Tidak tampil di hasil review atau tampilan biasa; bisa diganti & dihapus (UR-03). |
| Ke pihak lain | Tidak ada pengiriman otomatis; menyalin ringkasan adalah pilihan pengguna (UR-45). |

> **MVP saat ini:** endpoint *chat-completions compatible* (HTTPS atau HTTP localhost), key di VS Code SecretStorage terikat ke URL endpoint, tanpa telemetry atau server Saksi.
