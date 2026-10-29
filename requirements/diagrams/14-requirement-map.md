# 14 · Peta Requirement

Pengelompokan 50 kebutuhan pengguna per area (bagian 7) dan prioritasnya (bagian 6), lalu urutan manfaat per tahap rilis (bagian 13).

## Mindmap area

```mermaid
mindmap
  root((Saksi))
    Model pilihan pengguna
      UR-01 layanan & model sendiri
      UR-02 cek konfigurasi
      UR-03 API key aman
      UR-04 pilihan aktif terlihat
      UR-05 dukungan bahasa jelas
    Memulai review
      UR-06 satu tindakan
      UR-07 shortcut bisa diubah
      UR-08 tujuan perubahan
      UR-09 aturan proyek
      UR-10 klarifikasi relevan saja
    Cakupan & konteks
      UR-11 cakupan dipahami
      UR-12 file belum disimpan
      UR-13 persempit / perluas
      UR-14 lintas file
      UR-15 batas konteks
    Temuan
      UR-16 lokasi tepat
      UR-17 bukti dapat dibuka
      UR-18 fakta vs asumsi
      UR-19 dampak vs kepastian
      UR-20 relevan & actionable
    Refinement
      UR-21 diperiksa ulang
      UR-22 bukti pro & kontra
      UR-23 boleh dibatalkan
      UR-24 klarifikasi dinilai ulang
      UR-25 kedalaman vs biaya
    Tindak lanjut
      UR-26 tanya dalam konteks
      UR-27 saran + konsekuensi
      UR-28 kode tak diubah diam-diam
      UR-29 preview saran
      UR-30 bisa dibatalkan
    Status & pemulihan
      UR-31 status jelas
      UR-32 arti tanpa temuan
      UR-33 temuan lama kedaluwarsa
      UR-34 hasil relevan tetap
      UR-35 pulih dari gagal
    Kontrol data
      UR-36 tahu kapan & ke mana
      UR-37 pengecualian
      UR-38 info sensitif
      UR-39 pratinjau konteks
      UR-40 riwayat & feedback
    Feedback & preferensi
      UR-41 tanggapan berlabel
      UR-42 alasan diingat
      UR-43 lanjutkan pembahasan
      UR-44 gaya bantuan
      UR-45 salin ringkasan
    Companion & aksesibilitas
      UR-46 paham dari editor
      UR-47 pet opsional
      UR-48 bahasa menghormati
      UR-49 keyboard & teks
      UR-50 fokus & biaya
```

## Prioritas per area

| Area | Wajib | Penting | Opsional |
| --- | --- | --- | --- |
| 7.1 Model pilihan pengguna | UR-01, 02, 03, 04, 05 | — | — |
| 7.2 Memulai review | UR-06, 07, 08, 10 | UR-09 | — |
| 7.3 Cakupan & konteks | UR-11, 12, 14, 15 | UR-13 | — |
| 7.4 Temuan | UR-16, 17, 18, 19, 20 | — | — |
| 7.5 Refinement | UR-21, 22, 23, 24 | UR-25 | — |
| 7.6 Tindak lanjut | UR-26, 27, 28 | UR-29, 30 | — |
| 7.7 Status & pemulihan | UR-31, 32, 33, 35 | UR-34 | — |
| 7.8 Kontrol data | UR-36, 37, 38, 40 | UR-39 | — |
| 7.9 Feedback & preferensi | UR-41 | UR-42, 43, 44 | UR-45 |
| 7.10 Companion & aksesibilitas | UR-46, 48, 49 | UR-47, 50 | — |
| **Total** | **37** | **12** | **1** |

```mermaid
pie showData
    title Jumlah requirement per prioritas
    "Wajib" : 37
    "Penting" : 12
    "Opsional" : 1
```

## Tahap rilis (bagian 13, usulan urutan manfaat)

```mermaid
flowchart LR
    t1["Pengalaman inti<br/>semua UR Wajib<br/>model sendiri · review Go · temuan & bukti ·<br/>ketidakpastian · refinement · kontrol data"]
    t2["Pemakaian harian<br/>UR Penting<br/>cakupan fleksibel · lanjutkan review ·<br/>ingat feedback · gaya · kedalaman · preview saran"]
    t3["Personalisasi tambahan<br/>UR Opsional + companion ekspresif<br/>salin ringkasan ke diskusi"]
    t1 --> t2 --> t3
```

Bukan estimasi jadwal. Setiap tahap tidak boleh mengurangi kejelasan bukti, kontrol pengguna, atau aksesibilitas.
