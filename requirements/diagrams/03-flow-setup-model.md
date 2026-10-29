# 03 · Flow Setup Model

Cara pengguna menyiapkan layanan dan model AI pilihannya sendiri, lalu mengetahui apakah konfigurasi itu bisa diandalkan. Mencakup **UR-01–UR-05** dan skenario **UA-01**.

```mermaid
flowchart TD
    start(["Pengguna membuka pengaturan model<br/>atau review pertama kali tanpa konfigurasi"]) --> svc(["Mengisi tujuan layanan<br/>alamat endpoint / penyedia"])
    svc --> svcok{"Alamat valid &<br/>aman dipakai?"}
    svcok -- "tidak" --> svcerr["Jelaskan masalahnya<br/>mis. bukan HTTPS di luar localhost"]
    svcerr --> svc
    svcok -- "ya" --> pick(["Memilih model yang tersedia<br/>untuk layanan itu"])
    pick --> key(["Mengisi API key<br/>atau kosong untuk server lokal"])
    key --> store["Simpan key di penyimpanan rahasia<br/>tidak pernah ditampilkan ulang"]
    store --> summary["Tampilkan pilihan aktif:<br/>layanan, model, status key tersamar"]
    summary --> test{"Jalankan pemeriksaan<br/>konfigurasi?"}
    test -- "nanti" --> ready
    test -- "ya" --> paid{"Pemeriksaan mengirim<br/>permintaan berbayar?"}
    paid -- "ya" --> warn["Beri tahu dulu<br/>sebelum dijalankan"]
    warn --> confirm{"Pengguna setuju?"}
    confirm -- "tidak" --> ready
    confirm -- "ya" --> run
    paid -- "tidak" --> run["Kirim permintaan uji"]
    run --> result{"Hasil"}
    result -- "berhasil" --> ok["Konfigurasi dapat dipakai"]
    result -- "akses ditolak / model tidak ada /<br/>batas penggunaan / tak terhubung" --> fail["Jelaskan penyebab +<br/>langkah berikutnya"]
    fail --> svc
    ok --> ready
    ready["Siap review<br/>dukungan bahasa & batas pemeriksaan<br/>mudah ditemukan"]

    manage(["Kelola akses kapan saja"]) --> m1(["Ganti key"]) --> store
    manage --> m2(["Hapus key"]) --> del["Key dihapus dari Saksi"]
    manage --> m3(["Ganti layanan / model"]) --> svc

    classDef user fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef warn fill:#fef3c7,stroke:#b45309,color:#111
    classDef stop fill:#fee2e2,stroke:#b91c1c,color:#111
    classDef ok fill:#dcfce7,stroke:#15803d,color:#111
    class start,svc,pick,key,manage,m1,m2,m3 user
    class warn,svcerr warn
    class fail stop
    class ok,ready ok
```

## Aturan yang terlihat di flow

| Titik | Requirement |
| --- | --- |
| Pilih layanan & model, tahu kombinasi didukung | UR-01 |
| Pemeriksaan konfigurasi, peringatan bila berbayar | UR-02 |
| Key tidak tampil, bisa diganti/dihapus | UR-03 |
| Pilihan aktif terlihat, tidak pindah layanan diam-diam | UR-04 |
| Dukungan bahasa & batas pemeriksaan mudah ditemukan | UR-05 |

> **MVP saat ini:** perintah *Configure Model Endpoint* meminta URL lengkap, model ID, dan key. Endpoint/model hanya dibaca dari User Settings agar workspace tidak bisa mengalihkan tujuan request. Belum ada pemeriksaan konfigurasi terpisah.
