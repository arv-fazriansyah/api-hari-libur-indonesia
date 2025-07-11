# API Hari Libur Nasional Indonesia

**Repository**: [arv-fazriansyah/hari-libur-nasional](https://github.com/arv-fazriansyah/hari-libur-nasional)

## Deskripsi

API ini menyajikan data hari libur nasional dan cuti bersama di Indonesia dalam format JSON yang mudah digunakan oleh aplikasi. Data ini diperbarui otomatis setiap hari menggunakan GitHub Actions, dengan prioritas pengambilan dari Google Calendar resmi pemerintah Indonesia. Bila Google Calendar tidak menyediakan data untuk tahun tertentu, sistem akan otomatis menghasilkan data prediksi menggunakan skrip Python berbasis astronomi dan konversi kalender Hijriah, Saka, dan Kongzili untuk menjaga akurasi.

## Endpoints

* **Via GitHub Pages**

  * [https://arv-fazriansyah.github.io/hari-libur-nasional/data/2025.json](https://arv-fazriansyah.github.io/hari-libur-nasional/data/2025.json)
  * [https://arv-fazriansyah.github.io/hari-libur-nasional/data/2026.json](https://arv-fazriansyah.github.io/hari-libur-nasional/data/2026.json)

* **Via jsDelivr CDN**

  * [https://cdn.jsdelivr.net/gh/arv-fazriansyah/hari-libur-nasional@main/data/2025.json](https://cdn.jsdelivr.net/gh/arv-fazriansyah/hari-libur-nasional@main/data/2025.json)
  * [https://cdn.jsdelivr.net/gh/arv-fazriansyah/hari-libur-nasional@main/data/2026.json](https://cdn.jsdelivr.net/gh/arv-fazriansyah/hari-libur-nasional@main/data/2026.json)

## Contoh Respons

```json
[
  {
    "Keterangan": "Tahun Baru 2025 Masehi",
    "Tanggal": "2025-01-01"
  },
  {
    "Keterangan": "Hari Raya Idul Fitri 1446 Hijriyah",
    "Tanggal": "2025-03-31"
  }
]
```

## Penggunaan

```js
fetch('https://cdn.jsdelivr.net/gh/arv-fazriansyah/hari-libur-nasional@main/data/2025.json')
  .then(res => res.json())
  .then(data => console.log(data));
```

Atau dengan `curl`:

```bash
curl -s https://.../2025.json | jq
```

## Pembaruan Otomatis

* Data diperbarui setiap hari lewat GitHub Actions (workflow: `.github/workflows/libur.yml`).
* Sumber utama: Google Calendar resmi.
* Fallback: skrip Python (`script/python.py`).

## Hosting & Cache

* Gratis tanpa batasan kuota via jsDelivr CDN.
* Cache edge global, di-refresh otomatis setiap ±1 jam.

## Lisensi

Data ini dilisensikan di bawah MIT License. Bebas digunakan untuk aplikasi non-komersial maupun komersial.
