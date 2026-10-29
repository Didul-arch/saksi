# 13 · Interaksi Companion

Permukaan tempat pengguna berinteraksi dengan Saksi di dalam editor, dan bagaimana fungsi inti tetap bisa dipakai **tanpa pet, tanpa mouse, dan tanpa bergantung pada warna/animasi**. Mencakup **UR-44, UR-46–UR-50**, skenario **UA-21, UA-22**.

```mermaid
flowchart LR
    subgraph editor["Di dalam editor"]
        mark["Penanda dekat kode<br/>label teks singkat + hover"]
        problems["Daftar masalah editor<br/>dapat dinavigasi keyboard"]
        quick["Aksi cepat pada baris<br/>lihat bukti · tanya · tanggapi"]
    end

    subgraph panel["Panel Saksi"]
        form["Tujuan perubahan<br/>+ tombol review / hentikan"]
        statusP["Status review dalam teks<br/>+ ringkasan cakupan"]
        list["Daftar temuan<br/>label kepastian & dampak dalam teks"]
        detail["Detail temuan<br/>bukti, saran, riwayat penilaian"]
        chat["Percakapan per temuan"]
        pet["Companion / pet<br/>opsional, bisa disembunyikan"]
    end

    bar["Indikator status bar<br/>status + jumlah temuan"]
    kbd(["Pengguna keyboard-only"])

    kbd --> form
    kbd --> problems
    kbd --> quick
    mark --> detail
    problems --> detail
    quick --> detail
    quick --> chat
    list --> detail --> chat
    bar --> statusP
    pet -. "dekorasi; tidak membawa<br/>informasi yang tidak ada di teks" .-> statusP

    classDef user fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef opt fill:#f3f4f6,stroke:#6b7280,color:#111,stroke-dasharray: 4 3
    class kbd user
    class pet opt
```

## Aturan interaksi

| Aturan | Requirement |
| --- | --- |
| Temuan, bukti, dan rujukan mudah dijangkau dari editor; fokus hanya pindah karena tindakan pengguna. | UR-46 |
| Pet/maskot bisa disembunyikan tanpa kehilangan fungsi; tidak menutupi kode penting. | UR-47, UA-21 |
| Bahasa jelas, spesifik, tidak menghakimi; pilihan disengaja diakui. | UR-48 |
| Semua fungsi inti bisa dengan keyboard; status punya arti dalam teks. | UR-49, UA-21 |
| Bisa membatasi gangguan, menghentikan review, melihat penggunaan/estimasi biaya (atau penjelasan bila tidak tersedia). | UR-50 |
| Gaya penjelasan ringkas/mendidik, bahasa penjelasan, saran gaya on/off; identifier kode tidak diterjemahkan. | UR-44, UA-22 |

## Alur keyboard-only (UA-21)

```mermaid
flowchart TD
    k1(["Shortcut review"]) --> k2["Status berjalan diumumkan dalam teks"]
    k2 --> k3(["Lompat ke temuan berikutnya<br/>daftar masalah / perintah"])
    k3 --> k4(["Buka detail & bukti"])
    k4 --> k5(["Pilih aksi: tanya · tanggapi · salin"])
    k5 --> k3
```

> **MVP saat ini:** penanda inline (annotation + hover), Problems panel, Quick Fix *Lihat bukti / Abaikan*, status bar `Saksi · n`, panel webview dengan burung hantu statis (CSS). Belum ada percakapan, opsi menyembunyikan pet, gaya penjelasan, atau info biaya.
