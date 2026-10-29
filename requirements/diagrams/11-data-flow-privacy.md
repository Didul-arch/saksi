# 11 · Aliran Data & Privasi

Data apa yang keluar dari mesin pengguna, kapan, ke mana, dan titik kendali pengguna di sepanjang jalannya. Mencakup **UR-03, UR-36–UR-40**, skenario **UA-05, UA-23, UA-24**.

```mermaid
flowchart LR
    subgraph src["Sumber di mesin pengguna"]
        code[("Kode proyek")]
        dirty[("Isi editor<br/>belum disimpan")]
        diag[("Diagnostics<br/>language provider")]
        intent[("Tujuan & aturan proyek")]
        key[("API key")]
    end

    subgraph gate["Gerbang kendali pengguna"]
        g1{{"1 · Cakupan<br/>dipilih pengguna"}}
        g2{{"2 · Perlakuan file<br/>belum disimpan"}}
        g3{{"3 · Pengecualian<br/>proyek"}}
        g4{{"4 · Deteksi info<br/>sensitif"}}
        g5{{"5 · Pratinjau &<br/>tujuan pengiriman"}}
    end

    pkg["Paket konteks review<br/>kode terpilih, perubahan,<br/>tujuan, aturan, diagnostics"]
    model["Layanan model<br/>pilihan pengguna"]
    out["Temuan mentah"]
    local[("Riwayat & feedback lokal<br/>hanya bila diaktifkan")]

    code --> g1
    dirty --> g2
    g1 --> g2 --> g3 --> g4 --> g5 --> pkg
    diag --> g3
    intent --> pkg
    pkg == "saat review / refinement /<br/>percakapan dimulai pengguna" ==> model
    key -. "hanya sebagai header akses,<br/>tidak masuk konteks" .-> model
    model ==> out --> local

    nogo["Tidak pernah dikirim:<br/>file dikecualikan · key di dalam konteks ·<br/>data ke layanan lain diam-diam"]
    g3 -.-> nogo

    classDef gate fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef ext fill:#fef3c7,stroke:#b45309,color:#111
    classDef stop fill:#fee2e2,stroke:#b91c1c,color:#111
    class g1,g2,g3,g4,g5 gate
    class model ext
    class nogo stop
```

## Gerbang kendali

| Gerbang | Kendali pengguna | Requirement |
| --- | --- | --- |
| 1 · Cakupan | Memilih perubahan/file/seleksi yang direview. | UR-11, UR-13 |
| 2 · File belum disimpan | Simpan, lewati, atau pakai isi editor. | UR-12 |
| 3 · Pengecualian | Berlaku di pemeriksaan awal, refinement, percakapan, dan review ulang. | UR-37, UA-05 |
| 4 · Info sensitif | Bisa berhenti atau menyesuaikan; deteksi tidak dijanjikan sempurna. | UR-38, UA-23 |
| 5 · Pratinjau | Tujuan & isi pengiriman terlihat; tidak ditanyakan ulang tanpa perubahan relevan. | UR-36, UR-39 |

## Kapan data dikirim

```mermaid
flowchart TD
    a(["Pengguna menulis kode"]) --> n1["Tidak ada pengiriman"]
    b(["Pengguna memulai review"]) --> y1["Kirim paket konteks"]
    c(["Refinement otomatis dalam review<br/>yang sudah dimulai"]) --> y2["Kirim konteks tambahan<br/>dalam batas cakupan & pengecualian"]
    d(["Pengguna bertanya / klarifikasi"]) --> y3["Kirim pesan + konteks temuan terkait"]
    e(["Pemeriksaan konfigurasi"]) --> y4["Kirim permintaan uji<br/>diberi tahu dulu bila berbayar"]
    f(["Layanan gagal"]) --> n2["Tidak pindah ke layanan lain<br/>tanpa pilihan pengguna"]
    g(["Pengguna memberi feedback"]) --> n3["Tidak dianggap izin data tambahan<br/>atau pelatihan model"]

    classDef ok fill:#dcfce7,stroke:#15803d,color:#111
    classDef warn fill:#fef3c7,stroke:#b45309,color:#111
    class n1,n2,n3 ok
    class y1,y2,y3,y4 warn
```

## Riwayat & penghapusan (UR-40, UA-24)

| Data | Disimpan? | Bisa dihapus pengguna? | Catatan jujur |
| --- | --- | --- | --- |
| API key | Ya, di penyimpanan rahasia | Ya | Tidak pernah ditampilkan ulang. |
| Konfigurasi model & preferensi | Ya | Ya | — |
| Riwayat review & percakapan | Hanya bila diaktifkan | Ya | Menghapus di Saksi tidak menghapus data di layanan model. |
| Feedback & alasan pengabaian | Sesuai cakupan pilihan | Ya, dan bisa diubah | Bukan izin pelatihan model. |
| Data di layanan model | Bergantung kebijakan layanan | Di luar kendali Saksi | Harus dijelaskan, bukan dijanjikan. |

> **MVP saat ini:** yang dikirim: source + patch file terpilih, path relatif repo, diagnostics, tujuan perubahan. Gerbang 1 tetap (saved vs HEAD), gerbang 2 = selalu lewati, gerbang 3 = folder dependensi/build + nama file sensitif umum + `saksi.excludePaths`, gerbang 4 hanya filter nama file, gerbang 5 belum ada. Tidak ada telemetry; HTTP redirect tidak diikuti.
