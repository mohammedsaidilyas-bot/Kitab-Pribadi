# Kitab-Pribadi

Aplikasi perpustakaan kitab turats pribadi, dengan pembaca PDF bergaya kitab, fihris, dan Hasyiah.

## Status prototipe
- Pembaca memakai halaman PDF asli.
- Dua halaman berhadapan dengan layout RTL.
- Membalik halaman dapat dilakukan dengan swipe/drag dari sisi halaman; halaman mengikuti gerakan jari dan dapat kembali jika tarikan belum cukup.
- Fihris dapat membuka halaman PDF yang sesuai.
- Data fihris pertama yang diverifikasi berasal dari **نهاية الزين في إرشاد المبتدئين**.
- PDF uji tersebut memiliki **403 halaman PDF**. Fihris cetaknya berada pada halaman PDF 399–401 dan memuat nomor halaman kitab 3–397.
- Untuk PDF uji tersebut, pemetaan nomor halaman kitab ke PDF saat ini menggunakan offset **+2** dan disimpan sebagai data terstruktur agar tidak perlu memasukkan fihris satu per satu di aplikasi.
- Hasyiah menjadi bagian berikutnya: catatan akan ditautkan ke kitab dan halaman.

## Catatan
Penyimpanan PDF saat ini masih prototipe berbasis browser. Untuk versi Android produksi, PDF perlu dipindahkan ke penyimpanan persisten perangkat (IndexedDB/Capacitor storage) agar tetap tersedia setelah aplikasi ditutup.
