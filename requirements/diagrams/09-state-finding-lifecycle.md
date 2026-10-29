# 09 · Siklus Hidup Temuan

Satu temuan melewati beberapa keadaan: dari kandidat mentah, divalidasi, diperiksa ulang, diberi label, ditanggapi pengguna, sampai kedaluwarsa. **Label kepastian** dan **tingkat dampak** adalah dua sumbu terpisah. Mencakup **UR-16–UR-24, UR-33, UR-34, UR-41, UR-42**.

## Siklus

```mermaid
stateDiagram-v2
    [*] --> Kandidat : keluaran model

    state "Kandidat (belum final)" as Kandidat
    state "Dibuang - rujukan tidak valid" as Invalid
    state "Dalam refinement" as Refine
    state "Dibuang - dibantah bukti" as Ditarik
    state "Aktif" as Aktif {
        state "Masalah terkonfirmasi" as Konf
        state "Dugaan masalah" as Dugaan
        state "Pertanyaan" as Tanya
        state "Saran opsional" as Opsional
        Dugaan --> Konf : dasar konfirmasi dapat ditunjukkan
        Dugaan --> Tanya : butuh jawaban pengguna
        Tanya --> Dugaan : jawaban belum menghapus keraguan
        Konf --> Dugaan : bukti melemah
    }
    state "Ditanggapi pengguna" as Ditanggapi {
        state "Relevan" as Rel
        state "Keliru" as Kel
        state "Disengaja" as Sen
        state "Ditunda" as Tun
    }
    state "Kedaluwarsa" as Basi

    Kandidat --> Invalid : lokasi / kutipan tidak cocok snapshot
    Kandidat --> Refine : lolos validasi
    Refine --> Aktif : dipertahankan / dipersempit
    Refine --> Ditarik : bukti membantah
    Aktif --> Refine : klarifikasi pengguna / bukti baru
    Aktif --> Ditanggapi : pengguna memberi feedback
    Ditanggapi --> Aktif : pengguna mengubah pilihan
    Aktif --> Basi : kode terkait berubah
    Ditanggapi --> Basi : kode terkait berubah
    Basi --> Refine : review ulang, temuan masih relevan
    Basi --> [*] : review ulang, temuan tak muncul lagi
    Invalid --> [*]
    Ditarik --> [*]
```

## Dua sumbu: kepastian vs dampak

```mermaid
quadrantChart
    title Kepastian dan dampak dinilai terpisah
    x-axis Kepastian rendah --> Kepastian tinggi
    y-axis Dampak kecil --> Dampak besar
    quadrant-1 Terkonfirmasi, berdampak besar
    quadrant-2 Dugaan berdampak besar - tetap berlabel dugaan
    quadrant-3 Pertanyaan atau saran opsional
    quadrant-4 Terkonfirmasi, dampak kecil
```

Label dampak **tidak boleh** mengubah dugaan menjadi masalah terkonfirmasi (UR-19, UA-09). Persentase keyakinan tidak diperlukan; penjelasan bukti dan batasnya lebih penting (bagian 8.2).

## Isi temuan (bagian 8.1)

| Informasi | Tampil ringkas | Tampil detail |
| --- | --- | --- |
| Judul singkat | ✔ | ✔ |
| Lokasi tepat (simbol/ekspresi/baris) | ✔ | ✔ |
| Label kepastian | ✔ | ✔ |
| Tingkat dampak + alasan | ✔ | ✔ |
| Pengamatan (yang terlihat di kode) | | ✔ |
| Dampak & kondisi | | ✔ |
| Bukti yang dapat dibuka (termasuk file lain) | | ✔ |
| Konteks yang kurang / asumsi | | ✔ |
| Saran tindakan + konsekuensi | | ✔ |
| Tanggapan pengguna | ✔ (aksi) | ✔ |
| Riwayat perubahan penilaian (refinement) | | ✔ |

> **MVP saat ini:** `kind` hanya `concern` (Dugaan AI) atau `question` (Pertanyaan); model tidak bisa menyatakan terverifikasi. Belum ada sumbu dampak, refinement, atau feedback berlabel. Duplikat (lokasi + judul sama) digabung.
