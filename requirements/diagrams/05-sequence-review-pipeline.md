# 05 · Sequence Pipeline Review

Urutan interaksi dari review dimulai sampai temuan tampil. Diagram ini memperlihatkan **di mana kepercayaan dibangun**: snapshot dikunci, keluaran model diperiksa terhadap snapshot, lalu diperiksa ulang (refinement) sebelum menjadi hasil akhir. Mencakup **UR-14–UR-23, UR-31, UR-33**.

```mermaid
sequenceDiagram
    autonumber
    actor U as Pengguna
    participant E as Editor
    participant S as Saksi
    participant G as Repository Git
    participant L as Language provider
    participant M as Layanan model

    U->>S: Mulai review (tujuan, cakupan)
    S->>E: Cek file belum disimpan
    E-->>S: Daftar buffer kotor
    S->>G: Baca perubahan dalam cakupan
    G-->>S: File berubah, file baru, dihapus, rename
    S->>S: Kunci snapshot (isi + sidik jari per file)
    S-->>U: Status: membaca konteks
    S->>L: Simbol, referensi, diagnostics yang tersedia
    L-->>S: Hasil (mungkin tidak lengkap)
    S->>G: Cari file terkait dalam batas
    G-->>S: Calon pemanggil / penggunaan
    S->>S: Terapkan pengecualian & batas, catat yang dilewati

    S->>M: Pemeriksaan awal (snapshot + tujuan + aturan)
    M-->>S: Kandidat temuan
    S->>S: Validasi lokasi & kutipan terhadap snapshot
    Note over S: Kandidat tanpa dasar dibuang dan jumlahnya dicatat

    S-->>U: Status: memeriksa temuan
    loop Refinement sesuai kedalaman (lihat flow 06)
        S->>M: Cari bukti pendukung DAN pembantah
        M-->>S: Pertahankan / persempit / jadikan pertanyaan / buang
        S->>S: Validasi ulang rujukan
    end

    S->>G: Cek snapshot masih sama
    alt Kode berubah selama review
        S-->>U: Status: kedaluwarsa, tawarkan review ulang
    else Snapshot masih berlaku
        S->>E: Penanda dekat kode + daftar temuan
        S-->>U: Status akhir + ringkasan cakupan
    end

    opt Pengguna membatalkan kapan saja
        U->>S: Hentikan
        S-->>U: Status: dibatalkan + hasil sementara bila ada
    end
```

## Lapisan kepercayaan

| Lapisan | Tujuan | Requirement |
| --- | --- | --- |
| Snapshot dikunci | Bukti selalu menunjuk kode pada kondisi yang benar-benar direview. | UR-17, UR-33 |
| Konteks lintas file | Pemanggil/penggunaan dipertimbangkan; ketidaklengkapan dicatat, bukan disembunyikan. | UR-14, UR-15 |
| Validasi rujukan | Lokasi harus ada & relevan dengan perubahan; kutipan cocok dengan kode. Kutipan cocok **tidak** membuktikan kesimpulan. | UR-16, UR-17, bagian 8.3 |
| Refinement | Mencari bukti pembantah; temuan boleh dibatalkan. | UR-21–UR-23 |
| Cek akhir snapshot | Hasil tidak ditampilkan untuk kode yang sudah berubah. | UR-33 |
| Status jelas | Berjalan / selesai / sebagian / gagal / dibatalkan / kedaluwarsa dibedakan. | UR-31 |

> **MVP saat ini:** langkah 1–16 dan cek akhir snapshot sudah ada (snapshot di-hash, kutipan harus cocok dengan baris utuh, lokasi harus bersinggungan dengan hunk). Loop refinement belum ada. Konteks language provider dibatasi ±6,5 detik / 10 simbol; Go mendapat pencarian nama tekstual tambahan.
