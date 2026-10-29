# 06 · Flow Refinement

Refinement = memeriksa dan memperbaiki **hasil review** berdasarkan bukti, konteks, atau klarifikasi (bagian 9). Pengguna tidak perlu memahami proses internal model. Mencakup **UR-21–UR-25**, skenario **UA-05, UA-06, UA-10, UA-11, UA-16**.

```mermaid
flowchart TD
    cand["Kandidat temuan<br/>dari pemeriksaan awal<br/>ditandai BELUM final"] --> crit["Periksa secara kritis:<br/>cari bukti pendukung<br/>DAN alasan kode sebenarnya benar"]
    crit --> need{"Konteks kurang?"}
    need -- "ya" --> allowed{"Informasi relevan ada &<br/>boleh diakses?<br/>pengecualian dihormati"}
    allowed -- "ya" --> fetch["Ambil konteks tambahan"] --> crit
    allowed -- "tidak" --> q["Siapkan pertanyaan spesifik<br/>atau turunkan kepastian"]
    need -- "tidak" --> judge{"Hasil penilaian"}
    q --> judge

    judge -- "bukti mendukung" --> keep["Pertahankan<br/>+ dukungan baru & batas kondisi"]
    judge -- "mendukung sebagian" --> narrow["Persempit klaim<br/>bagian tak didukung dihapus /<br/>disebut ketidakpastian"]
    judge -- "bukti membantah" --> drop["Buang<br/>tidak tampil sebagai masalah aktif"]
    judge -- "tujuan pengguna<br/>membuat kode masuk akal" --> adjust["Sesuaikan penilaian<br/>temuan lain tetap boleh ada"]
    judge -- "bukti tidak cukup" --> unsure["Jadikan pertanyaan · tetap dugaan ·<br/>atau tidak ditampilkan"]

    keep & narrow & adjust & unsure --> reason["Ringkasan alasan perubahan<br/>+ rujukan relevan"]
    drop --> reason

    reason --> limit{"Batas tercapai?<br/>kedalaman · waktu · biaya ·<br/>tidak ada info baru"}
    limit -- "masih ada info baru<br/>& dalam batas" --> crit
    limit -- "batas waktu/biaya/akses" --> partial["Hasil menyebut batas yang tercapai<br/>& bagian yang belum selesai"]
    limit -- "tidak ada info baru" --> final["Hasil akhir<br/>tidak diulang demi kesan lebih yakin"]
    partial --> final

    user(["Pengguna menghentikan"]) -.-> stopped["Berhenti tanpa kehilangan kode & tujuan<br/>status jelas"]
    clar(["Pengguna memberi klarifikasi"]) -.-> crit

    classDef user fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef warn fill:#fef3c7,stroke:#b45309,color:#111
    classDef stop fill:#fee2e2,stroke:#b91c1c,color:#111
    classDef ok fill:#dcfce7,stroke:#15803d,color:#111
    class user,clar user
    class partial,unsure,q warn
    class drop,stopped stop
    class keep,final ok
```

## Hasil refinement yang sah (bagian 9.2)

| Keadaan | Hasil | Node |
| --- | --- | --- |
| Bukti tambahan mendukung | Dukungan baru + batas kondisi | `keep` |
| Bukti mendukung sebagian | Klaim dipersempit | `narrow` |
| Bukti membantah | Tidak tampil sebagai masalah aktif | `drop` |
| Tujuan pengguna membuat kode masuk akal | Penilaian disesuaikan | `adjust` |
| Bukti tidak cukup | Pertanyaan / tetap dugaan / tidak ditampilkan | `unsure` |
| Berhenti karena waktu/biaya/akses | Batas & bagian belum selesai disebut | `partial` |
| Tidak ada info baru | Tidak diulang terus | `final` |

## Pilihan kedalaman (UR-25, usulan)

```mermaid
flowchart LR
    d1["Cepat<br/>pemeriksaan awal + validasi rujukan"] --> d2["Standar<br/>+ satu putaran refinement"] --> d3["Mendalam<br/>refinement berulang sampai<br/>tidak ada info baru / batas"]
```

Nama dan isi tingkat kedalaman masih keputusan terbuka (bagian 14). Yang wajib: pengguna paham pilihannya, bisa berhenti, dan tahu saat batas tercapai.

> **MVP saat ini:** belum ada refinement. Semua temuan AI berlabel *Dugaan AI* atau *Pertanyaan*, dan temuan dengan rujukan tidak valid dibuang.
