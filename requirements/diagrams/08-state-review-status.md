# 08 · State Status Review

Semua status yang harus bisa dibedakan pengguna **dalam teks yang jelas** (bukan hanya warna/ikon). Diturunkan dari bagian 10 dokumen requirement. Mencakup **UR-31–UR-35**, skenario **UA-15, UA-16, UA-17, UA-18**.

```mermaid
stateDiagram-v2
    [*] --> Siap

    state "Siap" as Siap
    state "Belum ada perubahan" as Kosong
    state "Menunggu keputusan file belum disimpan" as Dirty
    state "Menunggu keputusan info sensitif / pratinjau" as Konfirmasi
    state "Sedang berjalan" as Berjalan {
        state "Membaca konteks" as Baca
        state "Pemeriksaan awal" as Awal
        state "Memeriksa temuan (refinement)" as Refine
        [*] --> Baca
        Baca --> Awal
        Awal --> Refine
        Refine --> Refine : info baru & dalam batas
    }
    state "Selesai dengan temuan" as Temuan
    state "Selesai tanpa temuan" as Bersih
    state "Selesai sebagian / terbatas" as Sebagian
    state "Temuan tidak dapat divalidasi" as TakValid
    state "Gagal" as Gagal
    state "Dibatalkan" as Batal
    state "Kedaluwarsa" as Basi

    Siap --> Kosong : tidak ada perubahan dalam cakupan
    Kosong --> Siap : ubah cakupan / simpan
    Siap --> Dirty : ada file belum disimpan
    Dirty --> Siap : simpan / lewati / pakai isi editor
    Siap --> Konfirmasi : info sensitif atau pratinjau perlu
    Konfirmasi --> Berjalan : kirim
    Konfirmasi --> Batal : hentikan
    Siap --> Berjalan : mulai

    Berjalan --> Temuan : ada temuan valid
    Berjalan --> Bersih : tidak ada temuan, cakupan lengkap
    Berjalan --> Sebagian : file dilewati / batas tercapai
    Berjalan --> TakValid : keluaran tanpa dasar cukup
    Berjalan --> Gagal : akses model / konfigurasi / proyek / batas penggunaan
    Berjalan --> Batal : pengguna menghentikan
    Berjalan --> Basi : kode berubah selama review

    Temuan --> Basi : kode terkait berubah
    Bersih --> Basi : kode terkait berubah
    Sebagian --> Basi : kode terkait berubah

    Gagal --> Siap : perbaiki penyebab / coba ulang
    TakValid --> Siap : coba pemeriksaan ulang
    Batal --> Siap : review baru
    Basi --> Siap : review kondisi terbaru
    Sebagian --> Siap : perluas cakupan
    Temuan --> Siap : review ulang
    Bersih --> Siap : review ulang
```

## Arti tiap status bagi pengguna

| Status | Yang harus jelas | Tindakan tersedia | Jangan sampai |
| --- | --- | --- | --- |
| Belum ada perubahan | Tidak ada cakupan yang sesuai pilihan saat ini. | Ubah cakupan, simpan, lanjut menulis. | Terlihat seperti "review bersih". |
| Menunggu file belum disimpan | Isi editor bisa berbeda dari yang diperiksa. | Simpan / lewati / pakai isi editor. | Auto-save diam-diam. |
| Sedang berjalan | Belum ada kesimpulan akhir; sub-tahap terlihat. | Tetap bekerja, lihat progres, hentikan. | Temuan sementara tampak final. |
| Selesai dengan temuan | Ada hal untuk dinilai pada cakupan yang berhasil diperiksa. | Buka bukti, tanya, feedback, perbaiki. | — |
| Selesai tanpa temuan | Tidak ada temuan **dalam cakupan yang berhasil diperiksa**. | Lanjut kerja dengan paham batasnya. | Klaim "proyek bebas bug" (UR-32). |
| Sebagian / terbatas | Ada perubahan/konteks relevan yang tidak ikut. | Lihat yang dilewati, perluas cakupan. | Ditampilkan sama dengan selesai penuh (UA-18). |
| Tidak dapat divalidasi | Keluaran tidak punya dasar cukup. | Coba pemeriksaan ulang. | Dianggap "tidak ada masalah". |
| Gagal | Pemeriksaan tidak selesai; bukan hasil bersih. | Perbaiki penyebab, coba ulang. | Ganti layanan diam-diam (UR-35). |
| Dibatalkan | Proses dihentikan pengguna/kondisi. | Lihat hasil sementara, review baru. | Kehilangan kode atau tujuan. |
| Kedaluwarsa | Hasil mungkin tak berlaku untuk kode sekarang. | Buka konteks lama berlabel, review terbaru. | Lokasi lama dipakai sebagai bukti berlaku (UR-33). |

> Status *Proyek tanpa riwayat perubahan* (bagian 10) diperlakukan sebagai variasi cakupan di flow 04: perbandingan tidak tersedia, pengguna memilih pemeriksaan kode yang didukung atau menerima batasnya.

> **MVP saat ini:** fase `idle · loading · done · empty · error · stale`. Status "sebagian" dan "tidak dapat divalidasi" muncul sebagai catatan di panel, belum status tersendiri. Perubahan file apa pun dalam repo membuat **seluruh** hasil `stale`.
