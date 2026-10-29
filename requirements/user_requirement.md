# Saksi — User Requirements

| Informasi | Keterangan |
| --- | --- |
| Nama produk | Saksi — nama kerja untuk companion reviewer kode di VS Code |
| Versi dokumen | 1.0 |
| Tanggal | 29 Oktober 2026 |
| Status | Draft kebutuhan pengguna untuk dibahas dan diprioritaskan |
| Fokus | Kebutuhan, pengalaman, kontrol, dan hasil yang diharapkan pengguna |

Dokumen ini menggambarkan pengalaman produk yang ingin dicapai. Isinya bukan daftar fitur yang sudah tersedia pada prototipe. Prioritas dan pilihan awal di dalamnya merupakan usulan berdasarkan pembahasan produk, bukan keputusan rilis yang sudah disepakati.

## Daftar isi

1. [Tujuan produk](#1-tujuan-produk)
2. [Pengguna dan situasi penggunaan](#2-pengguna-dan-situasi-penggunaan)
3. [Prinsip pengalaman pengguna](#3-prinsip-pengalaman-pengguna)
4. [Batas cakupan produk](#4-batas-cakupan-produk)
5. [Perjalanan utama pengguna](#5-perjalanan-utama-pengguna)
6. [Prioritas requirement](#6-prioritas-requirement)
7. [Kebutuhan pengguna](#7-kebutuhan-pengguna)
8. [Bentuk temuan yang dibutuhkan pengguna](#8-bentuk-temuan-yang-dibutuhkan-pengguna)
9. [Pengalaman refinement yang diharapkan](#9-pengalaman-refinement-yang-diharapkan)
10. [Status dan kondisi khusus yang harus jelas](#10-status-dan-kondisi-khusus-yang-harus-jelas)
11. [Skenario penerimaan dari sudut pandang pengguna](#11-skenario-penerimaan-dari-sudut-pandang-pengguna)
12. [Ukuran keberhasilan dari sisi pengguna](#12-ukuran-keberhasilan-dari-sisi-pengguna)
13. [Cakupan rilis dari sudut pandang pengguna](#13-cakupan-rilis-dari-sudut-pandang-pengguna)
14. [Keputusan produk yang masih terbuka](#14-keputusan-produk-yang-masih-terbuka)
15. [Panduan penggunaan dokumen](#15-panduan-penggunaan-dokumen)

## 1. Tujuan produk

Saksi membantu developer menemukan kesalahan dan keraguan yang relevan pada perubahan kode mereka, memahami alasannya, dan menentukan tindakan berikutnya tanpa harus meninggalkan pekerjaan utama di editor.

Pengguna menulis kode, memulai review melalui satu tindakan, lalu menerima temuan yang menunjuk bagian kode secara jelas. Setiap temuan menjelaskan apa yang diamati, kemungkinan dampaknya, bukti yang mendukungnya, dan bagian yang masih belum diketahui.

Pengguna memakai layanan dan model AI pilihannya sendiri. Pengguna tetap memegang keputusan tentang cakupan review, data yang dikirim, temuan yang diterima, dan perubahan kode yang diterapkan.

### Hasil yang ingin dicapai

- Pengguna menemukan masalah yang relevan sebelum perubahan diteruskan ke proses kerja berikutnya.
- Pengguna memahami alasan suatu bagian kode dipersoalkan, termasuk dampaknya pada bagian lain.
- Pengguna dapat memeriksa bukti dan menolak koreksi yang tidak sesuai.
- Pengguna mendapat bantuan belajar tanpa terus-menerus menerima teguran yang tidak perlu.
- Pengguna mengetahui batas pemeriksaan sehingga hasil kosong tidak menimbulkan rasa aman yang keliru.
- Pengguna dapat bekerja dengan tenang tanpa kehilangan kontrol terhadap kode, biaya penggunaan, dan informasi proyek.

## 2. Pengguna dan situasi penggunaan

| Pengguna | Kebutuhan utama | Situasi umum |
| --- | --- | --- |
| Developer yang sedang mengimplementasikan perubahan | Menemukan kesalahan dan dampak lintas file ketika konteks pekerjaan masih segar. | Selesai menulis fungsi atau mengubah beberapa file terkait. |
| Developer yang sedang mempelajari bahasa atau codebase | Memahami aturan dan alasan suatu pola menjadi masalah. | Ragu tentang akses fungsi, penanganan error, atau penggunaan komponen proyek. |
| Developer berpengalaman yang ingin pemeriksaan tambahan | Mendapat temuan yang bernilai dengan sedikit gangguan dan sedikit tuduhan keliru. | Memeriksa pekerjaan sebelum commit atau meminta review rekan kerja. |

Fokus awal yang diusulkan adalah developer Go di VS Code. Bahasa lain dapat ditambahkan bertahap. Pengguna harus mengetahui bahasa dan jenis pemeriksaan yang tersedia; dukungan terhadap semua bahasa tidak diasumsikan.

## 3. Prinsip pengalaman pengguna

1. **Koreksi harus dapat diperiksa.** Pengguna dapat membuka bagian kode dan bukti yang mendasari temuan.
2. **Keraguan dinyatakan secara jujur.** Dugaan, pertanyaan, dan masalah yang sudah terkonfirmasi mempunyai arti yang berbeda.
3. **Konteks menentukan penilaian.** Pilihan kode tidak dipersoalkan hanya karena berbeda dari preferensi reviewer.
4. **Refinement boleh membatalkan temuan.** Pemeriksaan ulang dianggap berguna ketika membantu menghapus tuduhan yang tidak didukung.
5. **Pengguna mengendalikan tindakan.** Menjalankan review atau meminta penjelasan tidak berarti mengizinkan perubahan kode.
6. **Gangguan harus sepadan dengan manfaat.** Produk mengutamakan temuan yang berdampak dan pertanyaan yang jawabannya memang memengaruhi review.
7. **Cakupan harus terlihat.** Pengguna dapat membedakan pemeriksaan lengkap dalam cakupan yang dipilih dari pemeriksaan yang terbatas, gagal, atau dibatalkan.
8. **Kepercayaan dibangun dari bukti.** Pengulangan review atau jumlah model yang menyetujui temuan tidak menjadi alasan tunggal untuk menganggapnya benar.

## 4. Batas cakupan produk

### Termasuk dalam kebutuhan produk

- Memulai review perubahan kode dari editor.
- Memilih model sendiri dan mengetahui tujuan pengiriman konteks.
- Menyampaikan tujuan perubahan dan aturan proyek yang relevan.
- Menentukan cakupan perubahan dan konteks yang boleh digunakan.
- Membaca temuan, membuka bukti, dan memahami dampaknya.
- Meminta penjelasan, memberikan klarifikasi, dan memperoleh review yang diperbaiki.
- Memeriksa ulang temuan melalui refinement sebelum atau setelah pengguna memberi informasi tambahan.
- Memberikan feedback, mengabaikan temuan, dan melakukan review ulang.
- Mendapat pengalaman companion atau percakapan yang tidak mengganggu kegiatan menulis kode.

### Di luar tujuan utama

- Menjamin bahwa seluruh kode bebas bug atau bahwa AI tidak pernah salah.
- Menggantikan pemahaman developer, pengujian proyek, atau review manusia sepenuhnya.
- Mengubah kode, menjalankan tindakan berdampak, atau meneruskan pekerjaan ke pihak lain tanpa pilihan pengguna.
- Membangun seluruh aplikasi secara otonom dari permintaan singkat.
- Menentukan arsitektur internal extension, format komunikasi, struktur penyimpanan, atau teknologi implementasi.
- Menjadikan pelatihan ulang atau fine-tuning model sebagai syarat agar pengguna dapat memakai produk.

## 5. Perjalanan utama pengguna

| Langkah | Yang dilakukan pengguna | Pengalaman yang diharapkan |
| --- | --- | --- |
| 1. Menyiapkan model | Memilih layanan, model, dan akses yang ingin dipakai. | Mengetahui apakah konfigurasi bisa digunakan dan ke mana konteks akan dikirim. |
| 2. Menulis perubahan | Mengubah kode seperti biasa. | Saksi tidak mengganggu atau mengubah kode tanpa permintaan. |
| 3. Menyampaikan tujuan | Bila perlu, menulis tujuan seperti “fungsi ini akan dipakai oleh package billing”. | Tujuan berlaku konsisten saat review dimulai melalui tombol maupun shortcut. |
| 4. Memulai review | Menjalankan satu tindakan dari editor. | Cakupan aktif jelas; kondisi file yang belum disimpan tidak disembunyikan. |
| 5. Menunggu pemeriksaan | Tetap bekerja atau melihat progres. | Mengetahui apakah review sedang membaca konteks, memeriksa temuan, atau sudah selesai. |
| 6. Menerima hasil | Melihat temuan yang telah diperiksa ulang sesuai kedalaman review. | Temuan menunjuk lokasi dan membedakan fakta, dugaan, serta pertanyaan. |
| 7. Memeriksa bukti | Membuka rujukan dan membaca penjelasan. | Dapat menilai relevansi temuan tanpa mencari-cari file sendiri. |
| 8. Menentukan tindakan | Meminta penjelasan, memberi klarifikasi, menerima saran, atau mengabaikan temuan. | Keputusan dan alasan pengguna dihormati sesuai cakupan yang dipilih. |
| 9. Melanjutkan pekerjaan | Mengubah kode dan melakukan review ulang. | Hasil lama tidak dianggap berlaku tanpa pemeriksaan terhadap perubahan terbaru. |

## 6. Prioritas requirement

| Prioritas | Arti |
| --- | --- |
| Wajib | Diperlukan untuk pengalaman inti yang dapat digunakan dengan kontrol dan batas kepercayaan yang jelas. |
| Penting | Sangat membantu pemakaian sehari-hari; dapat disusun bertahap setelah pengalaman inti terpenuhi. |
| Opsional | Menambah kenyamanan atau karakter produk tanpa menjadi syarat manfaat inti. |

Setiap requirement ditulis dari sudut pandang pengguna. Kriteria penerimaan menjelaskan perilaku yang dapat diamati pengguna, tanpa menetapkan cara implementasinya.

## 7. Kebutuhan pengguna

### 7.1 Model pilihan pengguna dan persiapan awal

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-01 | Wajib | Saya dapat memakai layanan dan model AI pilihan saya sendiri. | Saya dapat mengisi tujuan layanan, memilih model yang tersedia untuk layanan tersebut, dan mengetahui apakah kombinasi itu didukung. |
| UR-02 | Wajib | Saya dapat mengetahui apakah konfigurasi saya bisa digunakan sebelum mengandalkannya untuk review. | Tersedia pemeriksaan konfigurasi dengan hasil yang jelas; bila pemeriksaan mengirim permintaan berbayar, hal itu diketahui sebelum dijalankan. |
| UR-03 | Wajib | Saya dapat mengelola akses model tanpa mengekspos API key secara tidak sengaja. | Key tidak ditampilkan pada hasil review atau tampilan biasa; saya dapat mengganti dan menghapusnya. |
| UR-04 | Wajib | Saya dapat mengetahui model dan layanan yang sedang digunakan. | Pilihan aktif dapat dilihat dan tidak berpindah ke layanan lain secara diam-diam ketika terjadi kegagalan. |
| UR-05 | Wajib | Saya mengetahui jenis kode dan pemeriksaan yang dapat dibantu Saksi. | Dukungan bahasa dan batas pemeriksaan mudah ditemukan; bagian yang tidak didukung tidak ditampilkan seolah-olah sudah direview. |

### 7.2 Memulai review dan menyampaikan tujuan

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-06 | Wajib | Saya dapat memulai review melalui satu tindakan dari editor. | Saya dapat memakai perintah, tombol, atau shortcut tanpa berpindah aplikasi dan tanpa mengisi formulir berulang. |
| UR-07 | Wajib | Saya dapat memakai shortcut yang sesuai kebiasaan kerja saya, termasuk Ctrl+I jika saya memilihnya. | Shortcut dapat diubah; potensi benturan dengan tindakan lain dijelaskan dan tidak mengambil alih pilihan saya secara tersembunyi. |
| UR-08 | Wajib | Saya dapat menjelaskan tujuan perubahan tanpa diwajibkan menulisnya setiap kali review. | Tujuan dapat ditambahkan, diubah, dan dikosongkan; tujuan yang sedang aktif berlaku sama pada semua cara memulai review. |
| UR-09 | Penting | Saya dapat memberi aturan dan konteks proyek yang relevan. | Saya dapat melihat, mengubah, dan menonaktifkan aturan yang saya berikan; konflik antara aturan, tujuan, dan kode dijelaskan tanpa ditebak diam-diam. |
| UR-10 | Wajib | Saya hanya diminta klarifikasi yang memang berpengaruh pada penilaian. | Pertanyaan menyebut bagian kode dan keputusan yang bergantung pada jawabannya; saya dapat melewatinya dan melihat batas review yang tersisa. |

### 7.3 Cakupan perubahan dan konteks

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-11 | Wajib | Saya memahami perubahan mana yang direview tanpa harus mengetahui perintah Git. | Cakupan default menjelaskan perubahan lokal yang sudah disimpan sejak commit terakhir, termasuk file baru yang relevan; ringkasan cakupan tersedia. |
| UR-12 | Wajib | Saya mengetahui bagaimana file yang belum disimpan diperlakukan. | Saya diberi pilihan yang jelas untuk menyimpan, melewati, atau memasukkan kondisi editor bila didukung; tidak ada penyimpanan otomatis tanpa pilihan saya. |
| UR-13 | Penting | Saya dapat mempersempit atau memperluas cakupan sesuai pekerjaan. | Saya dapat memilih bagian kode, file, perubahan yang akan di-commit, atau perbandingan pekerjaan yang tersedia; cakupan terpilih terlihat sebelum hasil digunakan. |
| UR-14 | Wajib | Saya mendapat review yang mempertimbangkan konteks lintas file dan perubahan selain penambahan baris. | Pemanggil, penggunaan terkait, penghapusan, dan pergantian nama yang relevan dipertimbangkan; jika ada bagian yang belum dapat diperiksa, batas itu dijelaskan. |
| UR-15 | Wajib | Saya dapat mengetahui dan mengendalikan batas konteks review. | File yang disertakan atau dilewati serta alasannya dapat diperiksa; pada beberapa proyek terbuka, proyek yang sedang direview jelas. |

### 7.4 Temuan yang dapat dipahami dan diperiksa

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-16 | Wajib | Saya dapat langsung melihat bagian kode yang dipersoalkan. | Temuan menunjuk simbol, ekspresi, atau rentang baris yang relevan; memilih temuan membawa saya ke lokasi tersebut. |
| UR-17 | Wajib | Saya dapat membuka bukti yang mendasari temuan, termasuk bukti dari file lain. | Rujukan mengarah ke kode yang benar-benar tersedia pada kondisi yang direview; bukti yang tidak dapat diperiksa ditandai, bukan dibuat-buat. |
| UR-18 | Wajib | Saya dapat membedakan pengamatan, kesimpulan, asumsi, dan informasi yang belum diketahui. | Penjelasan menyebut apa yang terlihat pada kode, mengapa itu dipersoalkan, dan kondisi yang masih diperlukan untuk memastikan dampaknya. |
| UR-19 | Wajib | Saya memahami tingkat dampak dan tingkat kepastian sebagai dua hal berbeda. | Dugaan berdampak tinggi tetap diberi label dugaan; masalah hanya disebut terkonfirmasi bila dasar konfirmasinya dapat ditunjukkan beserta batasnya. |
| UR-20 | Wajib | Saya mendapat temuan yang relevan dan dapat ditindaklanjuti. | Temuan utama memprioritaskan perilaku dan tujuan perubahan; duplikasi digabung, saran selera tidak dipresentasikan sebagai kesalahan wajib. |

### 7.5 Refinement dan koreksi terhadap review

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-21 | Wajib | Saya menerima temuan yang telah diperiksa ulang sesuai kedalaman review yang dipilih. | Hasil membedakan pemeriksaan awal dan hasil akhir; bila pemeriksaan ulang tidak selesai, statusnya tidak disembunyikan. |
| UR-22 | Wajib | Saya mendapat pemeriksaan tambahan yang mencari bukti pendukung sekaligus bukti pembantah. | Temuan yang memerlukan informasi tambahan dapat diperiksa kembali menggunakan konteks relevan yang boleh diakses; kekurangan bukti tetap disebutkan bila belum terjawab. |
| UR-23 | Wajib | Saya dapat melihat temuan diperbaiki atau dibatalkan ketika bukti berubah. | Temuan dapat dipertahankan, dipersempit, diubah menjadi pertanyaan, atau dibuang; perubahan penting disertai ringkasan alasan dan rujukan yang relevan. |
| UR-24 | Wajib | Saya dapat memberi klarifikasi dan memperoleh penilaian ulang yang mempertimbangkannya. | Jawaban saya terkait dengan temuan yang dibahas; Saksi menjelaskan apakah klarifikasi mengubah kesimpulan atau masih menyisakan masalah. |
| UR-25 | Penting | Saya dapat menyeimbangkan kedalaman review dengan waktu dan biaya. | Tersedia pilihan kedalaman yang mudah dipahami; saya dapat menghentikan pemeriksaan, dan mengetahui saat batas tercapai atau tidak ada bukti baru. |

### 7.6 Menindaklanjuti temuan dan memperbaiki kode

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-26 | Wajib | Saya dapat bertanya tentang suatu temuan dengan konteks yang tetap terjaga. | Pertanyaan seperti “kenapa?”, “dampaknya apa?”, atau “bagaimana kalau sengaja begini?” dijawab terkait kode dan bukti temuan tersebut. |
| UR-27 | Wajib | Saya mendapat saran perbaikan yang menjelaskan tujuan dan konsekuensinya. | Saran menjelaskan perubahan yang diperlukan, alasan, dan dampak terkait yang diketahui; pilihan alternatif ditampilkan ketika ada tradeoff yang relevan. |
| UR-28 | Wajib | Saya tetap mengendalikan kapan kode atau pekerjaan saya diubah. | Review, penjelasan, dan refinement tidak mengubah atau menyimpan kode, membuat commit, atau meneruskan hasil ke pihak lain tanpa tindakan saya. |
| UR-29 | Penting | Saya dapat meninjau perubahan yang disarankan sebelum menerapkannya. | Jika penerapan saran tersedia, saya melihat bagian yang akan berubah, termasuk file terkait, lalu memilih saran yang ingin diterapkan. |
| UR-30 | Penting | Saya dapat memulihkan pekerjaan setelah menerapkan saran yang tidak sesuai. | Perubahan yang diterapkan dapat dibatalkan; bila kode telah berubah sejak saran dibuat, saya diminta memeriksa ulang kecocokannya sebelum penerapan. |

### 7.7 Status review, perubahan kode, dan pemulihan

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-31 | Wajib | Saya mengetahui apakah review berjalan, selesai, terbatas, gagal, dibatalkan, atau sudah kedaluwarsa. | Status dapat dibedakan dengan teks yang jelas; tidak ada status gagal atau parsial yang ditampilkan sebagai pemeriksaan berhasil tanpa temuan. |
| UR-32 | Wajib | Saya memahami arti hasil tanpa temuan. | Hasil menyatakan bahwa tidak ada temuan dalam cakupan yang berhasil diperiksa; tidak menjanjikan bahwa proyek bebas bug. |
| UR-33 | Wajib | Saya tidak diarahkan oleh temuan lama yang sudah tidak sesuai kode saat ini. | Perubahan yang memengaruhi temuan membuat statusnya diperiksa ulang atau ditandai kedaluwarsa; lokasi lama tidak dipertahankan sebagai bukti yang masih berlaku. |
| UR-34 | Penting | Saya dapat melanjutkan pekerjaan tanpa kehilangan review yang masih relevan. | Perubahan yang tidak berkaitan tidak semestinya menghapus seluruh hasil; tujuan dan pilihan saya tetap tersedia saat review ulang. |
| UR-35 | Wajib | Saya dapat pulih dari kegagalan tanpa menebak langkah berikutnya. | Gangguan akses model, konfigurasi, proyek, atau batas penggunaan dijelaskan dengan tindakan berikutnya; saya dapat mencoba ulang tanpa kehilangan kode. |

### 7.8 Kontrol data dan penggunaan model

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-36 | Wajib | Saya mengetahui kapan konteks proyek akan dikirim dan ke layanan mana. | Memulai review menjelaskan tujuan dan cakupan pengiriman; perpindahan layanan atau perluasan penggunaan data tidak terjadi secara tersembunyi. |
| UR-37 | Wajib | Saya dapat mengecualikan file atau bagian proyek yang tidak boleh dipakai untuk review. | Pengecualian dihormati pada pemeriksaan awal, refinement, percakapan lanjutan, dan review ulang; keterbatasan hasil akibat pengecualian dijelaskan. |
| UR-38 | Wajib | Saya mendapat kesempatan mencegah pengiriman informasi sensitif yang teridentifikasi. | Jika informasi sensitif terdeteksi, saya dapat menghentikan atau menyesuaikan cakupan; produk tidak mengklaim dapat menemukan seluruh rahasia secara sempurna. |
| UR-39 | Penting | Saya dapat memeriksa konteks yang akan digunakan tanpa wajib melakukannya pada setiap review. | Tersedia pratinjau konteks dan ringkasan cakupan; keputusan penggunaan yang sudah jelas tidak diminta berulang tanpa perubahan yang relevan. |
| UR-40 | Wajib | Saya memahami kendali atas riwayat dan feedback saya serta batas penggunaan layanan model. | Penyimpanan dan penggunaan data dijelaskan; jika riwayat disimpan, saya dapat menghapusnya; penghapusan di Saksi tidak diklaim otomatis menghapus data di layanan model. Feedback tidak dianggap sebagai izin otomatis untuk penggunaan data tambahan atau pelatihan model. |

### 7.9 Feedback, preferensi, dan keberlanjutan pekerjaan

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-41 | Wajib | Saya dapat menanggapi temuan sebagai relevan, keliru, disengaja, atau ditunda. | Pilihan feedback jelas dan tidak menyamakan semua pengabaian dengan bukti bahwa AI salah. Saya dapat mengubah pilihan yang keliru. |
| UR-42 | Penting | Saya tidak perlu menjelaskan alasan pengabaian yang sama berulang kali pada kondisi kode yang sama. | Alasan dapat diingat dalam cakupan yang saya pilih; perubahan kode atau bukti baru dapat membuat temuan ditinjau ulang secara jelas. |
| UR-43 | Penting | Saya dapat melanjutkan pembahasan review yang masih relevan. | Jika riwayat diaktifkan, saya dapat membuka hasil dan klarifikasi sebelumnya dengan status apakah masih sesuai kondisi kode saat ini. |
| UR-44 | Penting | Saya dapat mengatur gaya bantuan sesuai kebutuhan saya. | Saya dapat memilih penjelasan ringkas atau lebih mendidik, bahasa penjelasan, serta apakah saran gaya ditampilkan; identifier kode tidak diterjemahkan. |
| UR-45 | Opsional | Saya dapat membawa hasil review ke diskusi lain atas pilihan sendiri. | Saya dapat menyalin ringkasan dengan bukti dan label kepastian yang tetap jelas, tanpa pengiriman otomatis kepada orang lain. |

### 7.10 Companion, aksesibilitas, dan kenyamanan

| ID | Prioritas | Kebutuhan pengguna | Kriteria penerimaan |
| --- | --- | --- | --- |
| UR-46 | Wajib | Saya dapat memahami temuan dari dalam editor tanpa kehilangan konteks pekerjaan. | Penanda dekat kode, penjelasan, dan rujukan mudah dijangkau; perpindahan fokus hanya terjadi sesuai tindakan saya. |
| UR-47 | Penting | Saya dapat memilih tampilan companion yang nyaman bagi saya. | Pet atau maskot dapat disembunyikan tanpa menghilangkan fungsi review; ukuran, animasi, dan keberadaannya tidak menutupi kode penting. |
| UR-48 | Wajib | Saya mendapat penjelasan yang menghormati kemampuan dan keputusan saya. | Bahasa temuan jelas, spesifik, dan tidak menghakimi; pilihan yang disengaja atau informasi yang belum diketahui diakui secara terbuka. |
| UR-49 | Wajib | Saya dapat menggunakan fungsi inti tanpa hanya mengandalkan mouse, warna, atau animasi. | Temuan dan tindakan inti dapat dijangkau dengan keyboard; arti status tersedia dalam teks dan tetap dapat dipahami pada tampilan yang berbeda. |
| UR-50 | Penting | Saya dapat tetap fokus dan menjaga penggunaan model sesuai kebutuhan. | Saya dapat membatasi gangguan, menghentikan review, dan melihat penggunaan atau estimasi biaya jika tersedia; bila data biaya tidak tersedia, ketidakpastian itu dijelaskan. |

## 8. Bentuk temuan yang dibutuhkan pengguna

### 8.1 Informasi dalam sebuah temuan

Pengguna harus dapat memahami inti temuan dari tampilan ringkas, lalu membuka detail ketika memerlukannya. Semua informasi berikut tidak harus ditampilkan sekaligus.

| Informasi | Pertanyaan pengguna yang dijawab |
| --- | --- |
| Judul singkat | Apa yang perlu saya periksa? |
| Lokasi tepat | Bagian kode mana yang dipersoalkan? |
| Pengamatan | Apa yang benar-benar terlihat pada kode? |
| Dampak dan kondisi | Apa yang mungkin terjadi, dan pada keadaan apa? |
| Kepastian | Apakah ini terkonfirmasi, masih dugaan, atau membutuhkan klarifikasi? |
| Bukti yang dapat dibuka | Dari mana penjelasan ini berasal? |
| Konteks yang kurang | Apa yang belum diketahui reviewer? |
| Saran tindakan | Apa pilihan berikutnya dan apa konsekuensinya? |
| Tanggapan pengguna | Bagaimana saya meminta penjelasan, memberi koreksi, atau mengabaikannya? |

### 8.2 Arti label temuan

| Label | Arti bagi pengguna | Batas penggunaan |
| --- | --- | --- |
| Masalah terkonfirmasi | Ada dasar pemeriksaan yang dapat ditunjukkan untuk masalah tertentu pada kondisi yang diperiksa. | Kepastian hanya berlaku pada klaim dan kondisi tersebut; bukan jaminan tentang seluruh proyek. |
| Dugaan masalah | Ada bukti yang relevan, tetapi kesimpulan atau dampaknya masih bergantung pada kondisi yang belum sepenuhnya diperiksa. | Penjelasan menyebut asumsi yang belum terbukti. |
| Pertanyaan | Jawaban pengguna diperlukan untuk membedakan pilihan yang disengaja dari masalah. | Pertanyaan harus relevan dengan perubahan; tidak digunakan untuk memenuhi kuota temuan. |
| Saran opsional | Ada kemungkinan perbaikan tanpa bukti bahwa kode sekarang salah. | Ditampilkan sesuai preferensi pengguna dan tidak diperlakukan sebagai kewajiban. |

Tingkat dampak dapat dijelaskan secara terpisah, misalnya dampak besar, sedang, atau kecil dengan alasan yang konkret. Label dampak tidak boleh mengubah sebuah dugaan menjadi masalah terkonfirmasi. Angka persentase keyakinan tidak dibutuhkan untuk pengalaman inti; penjelasan tentang bukti dan batasnya lebih penting.

### 8.3 Batas kepercayaan

- Kutipan yang cocok dengan kode membuktikan keberadaan teks, bukan otomatis membuktikan kesimpulan reviewer.
- Tidak ditemukannya pemanggil dalam cakupan review tidak membuktikan bahwa fungsi tidak pernah dipanggil.
- Hasil pemeriksaan tambahan tidak boleh disebut berhasil bila pemeriksaan tersebut belum dilakukan atau tidak selesai.
- Model tidak boleh mengarang file, pemanggil, tujuan pengguna, atau hasil pemeriksaan.
- Keterbatasan akses atau konteks harus mengurangi kekuatan klaim, bukan ditutupi oleh bahasa yang lebih meyakinkan.
- Produk tidak perlu menghasilkan temuan pada setiap review.

## 9. Pengalaman refinement yang diharapkan

Dalam dokumen ini, refinement berarti memeriksa dan memperbaiki **hasil review** dengan mempertimbangkan bukti, konteks, atau klarifikasi. Pengguna tidak perlu memahami proses internal model atau melatih model untuk mendapatkan manfaatnya.

### 9.1 Apa yang harus dirasakan pengguna

1. Pengguna mengetahui bahwa temuan yang masih diperiksa belum merupakan hasil akhir.
2. Temuan yang meragukan diperiksa secara kritis, termasuk mencari alasan bahwa kode tersebut sebenarnya benar.
3. Jika konteks kurang, produk mencari informasi relevan yang diizinkan atau mengajukan pertanyaan yang spesifik.
4. Pengguna melihat hasil akhir yang lebih jelas: temuan dipertahankan, diperbaiki, dipersempit, diturunkan kepastiannya, atau dihapus.
5. Pengguna dapat mengetahui ringkasan alasan perubahan penilaian tanpa dibebani seluruh proses internal.
6. Pengguna dapat menghentikan pemeriksaan atau melanjutkan nanti tanpa kehilangan kode dan tujuan yang sudah diberikan.

### 9.2 Hasil refinement yang sah

| Keadaan setelah diperiksa ulang | Hasil yang diharapkan pengguna |
| --- | --- |
| Bukti tambahan mendukung masalah | Temuan menjelaskan dukungan baru dan batas kondisi yang diperiksa. |
| Bukti hanya mendukung sebagian klaim | Klaim dipersempit; bagian yang tidak didukung dihapus atau dijelaskan sebagai ketidakpastian. |
| Bukti membantah dugaan awal | Temuan tidak lagi ditampilkan sebagai masalah aktif. |
| Tujuan pengguna membuat kode masuk akal | Penilaian disesuaikan; tetap boleh ada temuan lain jika bukti menunjukkan dampak yang berbeda. |
| Bukti masih tidak cukup | Temuan menjadi pertanyaan yang relevan, tetap berlabel dugaan, atau tidak ditampilkan. |
| Pemeriksaan berhenti karena waktu, biaya, atau akses | Hasil menyebut batas yang tercapai dan bagian yang belum selesai. |
| Tidak ada informasi baru | Pemeriksaan tidak terus diulang hanya untuk menghasilkan kesan semakin yakin. |

### 9.3 Contoh utama: akses fungsi Go

Contoh berikut adalah ilustrasi pengalaman yang dituju, bukan hasil review langsung atas proyek pengguna.

Pengguna menulis:

```go
func setPaymentNumber() {
    // Implementasi pengguna.
}
```

| Konteks yang diketahui | Respons yang dibutuhkan pengguna |
| --- | --- |
| Pemanggil yang dipersoalkan berada dalam package yang sama. | Tidak ada tuduhan bahwa lowercase menghalangi pemanggil tersebut. Jika dugaan itu sempat muncul, refinement membatalkannya. |
| Ada penggunaan dari package lain yang mengharuskan fungsi dapat diakses dari luar package. | Temuan menunjukkan deklarasi dan penggunaan yang relevan, menjelaskan masalah akses, lalu menyarankan nama exported bila sesuai tujuan. |
| Pengguna menyatakan fungsi akan dipakai package lain, tetapi pemanggilnya belum ditulis. | Saran mengacu pada tujuan pengguna dan deklarasi yang ada; reviewer tidak berpura-pura menemukan pemanggil yang belum ada. |
| Tujuan belum diketahui dan tidak ada bukti pemakaian lintas package. | Reviewer tidak menganggap lowercase sendiri sebagai bug. Pertanyaan hanya diajukan bila memang relevan dengan perubahan yang sedang direview. |
| Pengguna menjelaskan bahwa fungsi sengaja hanya untuk penggunaan internal. | Penjelasan itu dipertimbangkan. Temuan tentang kebutuhan ekspor ditarik bila tidak ada bukti lain yang bertentangan. |

Contoh penjelasan ketika konteksnya belum cukup:

> “Fungsi ini masih unexported. Kamu menyebut bahwa fungsi akan dipakai oleh package billing. Apakah kamu ingin menjadikannya SetPaymentNumber? Aku belum menemukan pemanggil lintas package dalam bagian proyek yang diperiksa.”

Contoh tersebut memperlihatkan pengamatan, tujuan pengguna, pertanyaan, dan batas konteks secara terpisah.

## 10. Status dan kondisi khusus yang harus jelas

| Kondisi | Yang perlu diketahui pengguna | Tindakan yang tersedia |
| --- | --- | --- |
| Belum ada perubahan yang bisa direview | Tidak ada cakupan perubahan yang sesuai pilihan saat ini. | Mengubah cakupan, menyimpan perubahan, atau melanjutkan menulis kode. |
| Ada file belum disimpan | Isi editor mungkin berbeda dari kondisi yang akan diperiksa. | Memilih perlakuan terhadap file tersebut. |
| Review sedang berjalan | Pemeriksaan belum menghasilkan kesimpulan akhir. | Tetap bekerja, melihat progres, atau menghentikan review. |
| Review selesai dengan temuan | Ada hal yang perlu dinilai pada cakupan yang berhasil diperiksa. | Membuka bukti, bertanya, memberi feedback, atau memperbaiki kode. |
| Review selesai tanpa temuan | Tidak ada temuan pada cakupan yang berhasil diperiksa. | Melanjutkan pekerjaan dengan tetap memahami batas review. |
| Cakupan sebagian | Ada perubahan atau konteks relevan yang tidak ikut diperiksa. | Melihat bagian yang dilewati dan memilih apakah perlu memperluas review. |
| Temuan tidak dapat divalidasi | Sebagian keluaran tidak mempunyai dasar yang cukup untuk ditampilkan sebagai temuan. | Melihat bahwa review belum memberikan kesimpulan yang dapat diandalkan dan mencoba pemeriksaan ulang. |
| Review gagal | Pemeriksaan tidak selesai; ini bukan hasil bersih. | Memperbaiki penyebab yang dijelaskan atau mencoba ulang. |
| Review dibatalkan | Pengguna atau perubahan kondisi menghentikan proses. | Melihat apakah ada hasil sementara dan memulai review baru bila perlu. |
| Kode berubah setelah review | Sebagian atau seluruh hasil mungkin sudah tidak berlaku. | Membuka konteks lama dengan label yang jelas atau mereview kondisi terbaru. |
| Proyek tidak mempunyai riwayat perubahan | Perbandingan dengan pekerjaan sebelumnya tidak tersedia. | Memilih pemeriksaan kode yang tersedia bila didukung; menerima batas yang jelas bila belum didukung. |
| Akses model atau batas penggunaan bermasalah | Model yang dipilih belum dapat melanjutkan pemeriksaan. | Mengubah konfigurasi atau mencoba ulang; layanan tidak diganti diam-diam. |

## 11. Skenario penerimaan dari sudut pandang pengguna

Skenario berikut dipakai untuk menilai pengalaman pengguna secara menyeluruh. Skenario ini tidak menetapkan metode pengujian atau struktur implementasi.

| ID | Situasi dan tindakan pengguna | Hasil yang harus terlihat | Requirement terkait |
| --- | --- | --- | --- |
| UA-01 | Pengguna baru menyiapkan layanan dan model sendiri. | Pilihan aktif jelas, akses tidak terekspos, dan pengguna tahu apakah konfigurasi dapat digunakan. | UR-01, UR-02, UR-03, UR-04 |
| UA-02 | Pengguna menulis tujuan di panel lalu memulai review melalui shortcut. | Review memakai tujuan yang sama seperti ketika dimulai melalui tombol panel. | UR-06, UR-07, UR-08 |
| UA-03 | Pengguna memulai review ketika ada file belum disimpan. | Perbedaan antara isi editor dan cakupan review terlihat; tidak terjadi penyimpanan otomatis tanpa pilihan pengguna. | UR-11, UR-12, UR-15 |
| UA-04 | Perubahan pengguna menambah file baru, menghapus file, dan mengganti nama bagian kode. | Jenis perubahan yang diperiksa atau dilewati dijelaskan; cakupan tidak diam-diam dianggap hanya baris yang ditambahkan. | UR-11, UR-14, UR-15 |
| UA-05 | Pengguna mengecualikan sebagian proyek, kemudian meminta refinement. | Pengecualian tetap dihormati dan kekurangan konteks dijelaskan. | UR-22, UR-36, UR-37 |
| UA-06 | Fungsi lowercase digunakan oleh pemanggil yang berada dalam package yang sama. | Tidak muncul koreksi ekspor hanya karena nama fungsi dimulai dengan huruf kecil. | UR-14, UR-18, UR-20, UR-22, UR-23 |
| UA-07 | Tujuan perubahan secara eksplisit memerlukan pemakaian fungsi dari package lain, sementara pemanggil belum ditulis. | Saran mengacu pada tujuan tersebut dan deklarasi nyata; tidak mengarang penggunaan yang belum ada. | UR-08, UR-17, UR-18, UR-27 |
| UA-08 | Pengguna membuka temuan yang melibatkan file lain. | Lokasi utama dan bukti terkait dapat dibuka; hubungan yang diklaim dijelaskan beserta asumsi yang tersisa. | UR-16, UR-17, UR-18, UR-46 |
| UA-09 | Pengguna melihat dugaan berdampak besar yang belum terkonfirmasi. | Dampak dan kepastian tetap dibedakan; label dampak tidak membuat dugaan tampak pasti. | UR-18, UR-19 |
| UA-10 | Bukti tambahan menunjukkan dugaan awal tidak berlaku. | Refinement menarik atau memperbaiki temuan dan dapat menjelaskan alasan perubahan penilaian. | UR-21, UR-22, UR-23 |
| UA-11 | Reviewer tidak memiliki informasi yang cukup untuk menyimpulkan masalah. | Pengguna mendapat pertanyaan relevan, dugaan dengan batas yang jelas, atau tidak mendapat temuan; tidak ada kepastian palsu. | UR-10, UR-18, UR-19, UR-23 |
| UA-12 | Pengguna menjawab bahwa perilaku tertentu disengaja. | Klarifikasi dipertimbangkan dan penilaian diperbarui; bila masalah masih dianggap ada, alasannya mengacu pada bukti yang berbeda atau belum terjawab. | UR-24, UR-26, UR-41 |
| UA-13 | Pengguna bertanya “kenapa ini salah?” pada suatu temuan. | Jawaban tetap mengacu pada temuan, kode, dan bukti yang sama tanpa mengubah kode. | UR-26, UR-27, UR-28, UR-48 |
| UA-14 | Pengguna menerima saran yang akan memengaruhi beberapa file. | Jika penerapan saran tersedia, seluruh cakupan perubahan terlihat sebelum dipilih dan perubahan dapat dibatalkan. | UR-27, UR-29, UR-30 |
| UA-15 | Pengguna mengedit bagian kode yang mendasari temuan. | Temuan lama tidak terus ditampilkan sebagai pemeriksaan terbaru; pengguna dapat mereview kondisi terkini. | UR-31, UR-33, UR-34 |
| UA-16 | Pengguna menghentikan review yang terlalu lama atau lebih dalam dari yang diperlukan. | Proses berhenti tanpa kehilangan kode; status dan keterbatasan hasil yang tersisa jelas. | UR-25, UR-31, UR-50 |
| UA-17 | Layanan model gagal dihubungi atau batas penggunaan tercapai. | Kegagalan dibedakan dari hasil tanpa temuan dan pengguna mendapat langkah pemulihan. | UR-04, UR-31, UR-35, UR-50 |
| UA-18 | Review selesai tanpa temuan, tetapi sebagian file dilewati. | Hasil menonjolkan keterbatasan cakupan dan tidak menyatakan seluruh proyek aman. | UR-15, UR-31, UR-32 |
| UA-19 | Pengguna menandai temuan sebagai disengaja atau keliru, lalu mengulang review. | Jika penyimpanan feedback dipilih, alasan sebelumnya dihormati pada kondisi yang sama dan dapat diubah oleh pengguna. | UR-41, UR-42, UR-43 |
| UA-20 | Pengguna bekerja di beberapa proyek dan mengatur aturan atau pengecualian khusus salah satunya. | Proyek aktif dan cakupan aturan jelas; pengaturan khusus tidak diterapkan diam-diam ke proyek lain. | UR-09, UR-15, UR-37, UR-42 |
| UA-21 | Pengguna menyembunyikan pet dan memakai keyboard untuk menilai temuan. | Review, bukti, status, dan tindakan inti tetap dapat digunakan tanpa pet, mouse, atau ketergantungan pada warna. | UR-46, UR-47, UR-49 |
| UA-22 | Pengguna ingin memakai penjelasan ringkas dan menyalin hasil untuk diskusi. | Gaya penjelasan mengikuti pilihan pengguna; jika penyalinan tersedia, bukti dan ketidakpastian tetap terbawa tanpa pengiriman otomatis. | UR-28, UR-44, UR-45, UR-48 |
| UA-23 | Informasi sensitif teridentifikasi pada konteks yang akan dikirim. | Pengguna diberi kesempatan meninjau, mengubah, atau menghentikan pengiriman; keputusan tidak melewati pengecualian yang sudah ditetapkan. | UR-36, UR-37, UR-38, UR-39 |
| UA-24 | Pengguna menghapus riwayat atau meninjau izin penggunaan feedback. | Kendali yang tersedia dijelaskan dengan jujur, termasuk batas penghapusan pada layanan model yang dipilih. | UR-03, UR-40, UR-43 |

## 12. Ukuran keberhasilan dari sisi pengguna

Ukuran berikut adalah usulan evaluasi manfaat produk. Target angka ditetapkan setelah ada hasil penggunaan awal; dokumen ini tidak mengarang persentase akurasi atau batas waktu yang belum dibuktikan.

| Hasil yang ingin dinilai | Ukuran yang dapat digunakan | Catatan penilaian |
| --- | --- | --- |
| Temuan benar-benar berguna | Proporsi temuan yang dinilai relevan dan benar setelah diperiksa pengguna atau penilai yang memahami kasus. | Tombol “terima” saja tidak otomatis membuktikan kebenaran temuan. |
| Sedikit tuduhan keliru | Jumlah temuan yang terbukti mempersoalkan kode yang sebenarnya benar dalam kondisi yang dibahas. | Bedakan dugaan yang wajar dari klaim pasti yang salah. |
| Bug penting tidak banyak terlewat | Proporsi masalah yang diketahui pada contoh evaluasi tetapi tidak ditemukan dalam cakupan review. | Evaluasi tetap mencakup contoh tanpa bug agar reviewer tidak didorong selalu menuduh. |
| Refinement menambah manfaat | Perubahan jumlah temuan benar, temuan keliru, dan masalah yang terlewat sebelum serta sesudah refinement. | Mengurangi jumlah temuan saja tidak dianggap perbaikan bila masalah penting ikut terhapus. |
| Penjelasan mudah dipahami | Kemampuan pengguna menjelaskan kembali masalah, bukti, ketidakpastian, dan langkah berikutnya. | Dinilai dari pemahaman, bukan hanya panjang atau kelancaran jawaban AI. |
| Review membantu alur kerja | Waktu dan usaha pengguna untuk mencapai keputusan atas suatu temuan. | Pertimbangkan gangguan, waktu menunggu, serta kebutuhan mencari konteks secara manual. |
| Penggunaan model terkendali | Kesesuaian kedalaman, waktu, dan penggunaan layanan dengan pilihan pengguna. | Pengukuran mempertimbangkan variasi model dan layanan yang dipakai. |
| Pengguna memahami batas hasil | Kemampuan pengguna membedakan review tanpa temuan, review sebagian, gagal, dan kedaluwarsa. | Tidak cukup hanya menampilkan label jika pengguna tetap salah memahami artinya. |

## 13. Cakupan rilis dari sudut pandang pengguna

Pembagian berikut adalah usulan urutan manfaat, bukan estimasi jadwal atau pernyataan bahwa fitur sudah selesai.

| Tahap | Manfaat yang harus dirasakan pengguna | Batas tahap |
| --- | --- | --- |
| Pengalaman inti | Memakai model sendiri, mereview perubahan Go, membaca temuan dan bukti, melihat ketidakpastian, mendapatkan refinement, serta mengendalikan data dan tindakan. | Seluruh requirement berprioritas Wajib dalam dokumen ini menjadi acuan kesiapan pengalaman inti. |
| Pemakaian harian | Memilih cakupan lebih fleksibel, melanjutkan review, mengingat feedback, mengatur gaya, mengendalikan kedalaman, dan meninjau saran perubahan. | Requirement Penting dapat dibagi dalam beberapa rilis berdasarkan evaluasi pengguna. |
| Personalisasi tambahan | Companion lebih ekspresif dan kemudahan membawa hasil ke diskusi lain. | Penyempurnaan tidak boleh mengurangi kejelasan bukti, kontrol, atau aksesibilitas. |

### Tanda pengalaman inti sudah layak dinilai pengguna

- Pengguna dapat menyelesaikan alur dari menyiapkan model sampai mengambil keputusan atas temuan pada pekerjaan nyata.
- Pengguna dapat membuka bukti dan memahami alasan serta batas setiap temuan utama.
- Review tidak secara sistematis menuduh pola yang sah, termasuk contoh lowercase dalam package yang sama.
- Refinement dapat menarik temuan yang dibantah bukti dan mengakui kondisi yang belum diketahui.
- Hasil gagal, parsial, tanpa temuan, dan kedaluwarsa dapat dibedakan dengan benar.
- Tidak ada perubahan kode atau perluasan penggunaan data yang terjadi tanpa kendali pengguna.
- Bahasa, penanda, dan navigasi mendukung kegiatan menulis kode sehari-hari.
- Klaim manfaat didukung evaluasi pengguna dan contoh kasus, bukan hanya keberhasilan menjalankan prototipe.

## 14. Keputusan produk yang masih terbuka

Daftar ini memisahkan kebutuhan yang sudah jelas dari preferensi produk yang belum diputuskan. Pilihan awal di bawah adalah usulan dan tidak menghalangi penyelesaian dokumen requirement ini.

| Keputusan | Pilihan awal yang diusulkan | Yang perlu dipastikan lewat pembahasan atau penggunaan |
| --- | --- | --- |
| Nama dan karakter produk | Saksi sebagai nama kerja; companion sederhana yang dapat disembunyikan. | Apakah nama dan karakter sesuai citra produk yang diinginkan. |
| Bahasa kode pertama | Go sebagai fokus pertama. | Bahasa berikutnya berdasarkan kebutuhan nyata pengguna. |
| Bahasa penjelasan | Bahasa Indonesia sebagai pilihan awal, dengan identifier kode tetap asli. | Kebutuhan penjelasan bahasa Inggris atau pilihan per proyek. |
| Shortcut awal | Pengguna dapat memilih Ctrl+I; pemilihan default mempertimbangkan benturan shortcut. | Shortcut yang paling nyaman dan mudah ditemukan saat penggunaan pertama. |
| Cakupan default | Perubahan lokal yang sudah disimpan sejak commit terakhir. | Apakah mayoritas pengguna lebih sering membutuhkan per fungsi, per file, atau perubahan yang akan di-commit. |
| Isi editor yang belum disimpan | Selalu terlihat perlakuannya; pengguna menentukan tindakan. | Pilihan mana yang paling sesuai tanpa menambah dialog berulang. |
| Bentuk companion | Penanda dekat kode dengan ruang percakapan dan detail bukti yang mudah dibuka. | Seberapa besar peran pet dibanding panel dan percakapan dekat kode. |
| Kedalaman review | Pilihan yang mudah dipahami dengan batas waktu dan penggunaan yang terlihat. | Keseimbangan manfaat refinement, waktu menunggu, dan biaya yang dapat diterima. |
| Riwayat dan feedback | Penyimpanan mengikuti pilihan pengguna dan cakupan proyek yang jelas. | Preferensi lama penyimpanan, penghapusan, dan kapan temuan boleh ditinjau ulang. |
| Penerapan saran | Awalnya pengguna tetap dapat memperbaiki secara manual; penerapan berbantuan harus menyediakan preview dan pembatalan. | Kapan pengguna menginginkan bantuan perubahan langsung dan jenis perubahan yang dipercaya. |
| Target kualitas | Ditentukan dari contoh kasus dan evaluasi penggunaan awal. | Batas tuduhan keliru, masalah terlewat, waktu review, dan biaya yang dapat diterima. |

## 15. Panduan penggunaan dokumen

- Gunakan ID UR untuk membahas atau mengubah kebutuhan tanpa mengikatnya pada cara implementasi tertentu.
- Gunakan skenario UA untuk menilai apakah pengalaman pengguna benar-benar memenuhi kebutuhan yang dirujuk.
- Perubahan prioritas harus tetap menjaga kejelasan bukti, ketidakpastian, kontrol pengguna, dan batas penggunaan data.
- Keputusan implementasi dan rancangan internal dapat dibuat dalam dokumen terpisah setelah kebutuhan pengguna ini disepakati.
- Perubahan kebutuhan yang berasal dari penggunaan nyata harus membedakan masalah pengguna, solusi yang diusulkan, dan bukti bahwa solusi tersebut membantu.

