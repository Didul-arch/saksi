# 07 · Flow Tindak Lanjut Temuan

Apa yang bisa dilakukan pengguna setelah melihat temuan: membuka bukti, bertanya, memberi klarifikasi, memberi feedback, dan (bila tersedia) menerapkan saran dengan preview serta pembatalan. Mencakup **UR-24–UR-30, UR-41–UR-43, UR-45**, skenario **UA-12, UA-13, UA-14, UA-19, UA-22**.

## Ringkasan pilihan

```mermaid
flowchart TD
    f["Temuan aktif<br/>judul · lokasi · label kepastian · dampak"] --> open(["Buka lokasi / bukti"])
    open --> valid{"Kode masih sama<br/>dengan snapshot?"}
    valid -- "tidak" --> stale["Tandai kedaluwarsa<br/>tawarkan review ulang"]
    valid -- "ya" --> jump["Pindah ke rentang kode<br/>fokus hanya karena tindakan pengguna"]

    f --> ask(["Bertanya<br/>kenapa? dampaknya? kalau sengaja?"])
    ask --> answer["Jawaban mengacu ke temuan,<br/>kode, dan bukti yang sama<br/>TANPA mengubah kode"]

    f --> clar(["Memberi klarifikasi<br/>mis. ini disengaja"])
    clar --> reassess["Penilaian ulang<br/>lihat flow 06"]
    reassess --> changed{"Kesimpulan berubah?"}
    changed -- "ya" --> upd["Temuan diperbarui / ditarik<br/>+ alasan"]
    changed -- "tidak" --> remain["Masalah tetap ada<br/>alasan mengacu bukti berbeda<br/>atau yang belum terjawab"]

    f --> fb(["Feedback"])
    fb --> fbk{"Jenis"}
    fbk -- "relevan" --> r1["Dicatat relevan"]
    fbk -- "keliru" --> r2["Dicatat keliru"]
    fbk -- "disengaja" --> r3["Dicatat disengaja"]
    fbk -- "ditunda" --> r4["Dicatat ditunda"]
    r1 & r2 & r3 & r4 --> mem{"Ingat alasan?<br/>pilih cakupan"}
    mem -- "ya" --> remember["Diingat untuk kondisi kode sama<br/>bisa diubah kapan saja"]
    mem -- "tidak" --> once["Hanya untuk review ini"]

    f --> sug(["Lihat saran perbaikan"])
    sug --> sugd["Perubahan yang diperlukan, alasan,<br/>dampak terkait, alternatif bila ada tradeoff"]
    sugd --> how{"Cara memperbaiki"}
    how -- "manual" --> manual(["Pengguna mengedit sendiri"])
    how -- "terapkan bila tersedia" --> apply["Lihat flow penerapan di bawah"]

    f --> copy(["Salin ringkasan<br/>opsional"])
    copy --> clip["Ringkasan + bukti + label kepastian<br/>tanpa pengiriman otomatis"]

    classDef user fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef warn fill:#fef3c7,stroke:#b45309,color:#111
    class open,ask,clar,fb,sug,manual,copy user
    class stale warn
```

## Penerapan saran (UR-29, UR-30)

```mermaid
sequenceDiagram
    actor U as Pengguna
    participant S as Saksi
    participant E as Editor

    U->>S: Pilih "terapkan saran"
    S->>E: Cek kode sejak saran dibuat
    alt Kode sudah berubah
        S-->>U: Minta periksa ulang kecocokan saran
    else Kode masih sama
        S-->>U: Preview semua bagian yang berubah, termasuk file terkait
        U->>S: Pilih saran / bagian yang diterapkan
        S->>E: Terapkan sebagai satu perubahan yang bisa dibatalkan
        Note over S,E: Tidak menyimpan file, tidak commit, tidak mengirim ke pihak lain
        S-->>U: Tandai temuan perlu direview ulang
        opt Hasil tidak sesuai
            U->>E: Batalkan
            E-->>U: Kode kembali seperti sebelum penerapan
        end
    end
```

| Aturan | Requirement |
| --- | --- |
| Pertanyaan dijawab dalam konteks temuan yang sama | UR-26, UA-13 |
| Saran menjelaskan tujuan, konsekuensi, alternatif | UR-27 |
| Review, penjelasan, refinement tidak mengubah/menyimpan/commit kode | UR-28 |
| Preview sebelum penerapan, termasuk file terkait | UR-29, UA-14 |
| Penerapan bisa dibatalkan; cek ulang bila kode berubah | UR-30 |
| Feedback tidak menyamakan "abaikan" dengan "AI salah"; bisa diubah | UR-41 |
| Alasan pengabaian diingat dalam cakupan pilihan | UR-42, UA-19 |
| Salin ringkasan tanpa pengiriman otomatis | UR-45, UA-22 |

> **MVP saat ini:** tersedia *Lihat bukti* dan *Abaikan temuan ini* (Quick Fix & panel). Abaikan hanya menyembunyikan untuk review itu. Belum ada percakapan, klarifikasi per temuan, feedback berlabel, atau penerapan saran.
