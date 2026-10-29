# 12 · Contoh Go: Akses Fungsi `setPaymentNumber`

Contoh utama di bagian 9.3. Diagram ini adalah **pohon keputusan perilaku yang dituju** reviewer, dipakai sebagai kasus uji pengalaman (UA-06, UA-07) — bukan hasil review langsung.

```go
func setPaymentNumber() {
    // Implementasi pengguna.
}
```

Aturan bahasa yang mendasari: nama lowercase di Go berarti **unexported** (tidak dapat diakses dari package lain), **bukan** private per file. Pemanggil di package yang sama tetap sah walau beda file.

```mermaid
flowchart TD
    start["Deklarasi lowercase<br/>func setPaymentNumber"] --> sameOnly{"Ada bukti pemakaian<br/>dari package LAIN?<br/>pemanggil + import dikutip"}

    sameOnly -- "ya" --> cross["Temuan: masalah akses<br/>tunjukkan deklarasi + pemanggil + import<br/>sarankan SetPaymentNumber bila sesuai tujuan"]

    sameOnly -- "tidak" --> intent{"Tujuan pengguna menyebut<br/>dipakai package lain?"}
    intent -- "ya, pemanggil belum ditulis" --> fut["Pertanyaan / saran mengacu tujuan<br/>+ deklarasi nyata<br/>TIDAK mengarang pemanggil"]
    intent -- "pengguna bilang internal" --> internal["Tarik temuan ekspor<br/>bila tak ada bukti lain"]
    intent -- "tidak diketahui" --> relevant{"Pertanyaan relevan dengan<br/>perubahan yang direview?"}
    relevant -- "ya" --> narrowq["Satu pertanyaan sempit"]
    relevant -- "tidak" --> none["Tidak ada temuan<br/>lowercase sendiri bukan bug"]

    same["Pemanggil hanya di package sama"] --> none2["Tidak ada tuduhan<br/>jika sempat muncul, refinement membatalkannya"]

    classDef ok fill:#dcfce7,stroke:#15803d,color:#111
    classDef warn fill:#fef3c7,stroke:#b45309,color:#111
    classDef stop fill:#fee2e2,stroke:#b91c1c,color:#111
    class none,none2,internal ok
    class fut,narrowq warn
    class cross stop
```

## Pemetaan ke tabel bagian 9.3

| Konteks yang diketahui | Node | Label temuan |
| --- | --- | --- |
| Pemanggil di package yang sama | `same → none2` | Tidak ada (atau dibuang saat refinement) |
| Ada penggunaan dari package lain | `cross` | Masalah terkonfirmasi / dugaan, sesuai kekuatan bukti |
| Tujuan: dipakai package lain, pemanggil belum ada | `fut` | Pertanyaan atau saran |
| Tujuan & bukti lintas package tidak ada | `none` / `narrowq` | Tidak ada, atau pertanyaan bila relevan |
| Pengguna: sengaja internal | `internal` | Ditarik |

## Contoh penjelasan saat konteks belum cukup

> "Fungsi ini masih unexported. Kamu menyebut bahwa fungsi akan dipakai oleh package billing. Apakah kamu ingin menjadikannya SetPaymentNumber? Aku belum menemukan pemanggil lintas package dalam bagian proyek yang diperiksa."

Struktur kalimatnya memisahkan: **pengamatan** → **tujuan pengguna** → **pertanyaan** → **batas konteks**.

## Batas kepercayaan yang diuji contoh ini

- Kecocokan nama secara teks (`setPaymentNumber` vs `SetPaymentNumber`) adalah **petunjuk**, bukan bukti bahwa keduanya simbol yang sama.
- Tidak ditemukannya pemanggil **tidak** membuktikan fungsi tidak pernah dipanggil.
- Reviewer tidak bisa mengetahui pemanggil masa depan.

> **MVP saat ini:** aturan ini ditanam di system prompt; pencarian tekstual nama fungsi Go (lowercase & versi kapital) dipakai untuk menemukan calon file terkait.
