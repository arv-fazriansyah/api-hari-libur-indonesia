# API Hari Libur & Cuti Bersama Nasional Indonesia
**Repository**: [arv-fazriansyah/api-hari-libur-indonesia](https://github.com/arv-fazriansyah/api-hari-libur-indonesia)

## Deskripsi

API ini menyajikan data **hari libur nasional** dan **cuti bersama** di Indonesia dalam format JSON yang mudah digunakan oleh aplikasi.
Data diperbarui **otomatis setiap hari** menggunakan GitHub Actions, dengan sumber utama dari **Google Calendar resmi pemerintah**. Jika data dari Google Calendar tidak tersedia, sistem akan menghasilkan data **prediksi** berdasarkan perhitungan astronomi dan konversi kalender **Hijriah**, **Saka**, dan **Kongzili**.

---

## Endpoints

### 📦 Static JSON

* **Via GitHub Pages**

  * [https://arv-fazriansyah.github.io/api-hari-libur-indonesia/data/2025.json](https://arv-fazriansyah.github.io/api-hari-libur-indonesia/data/2025.json)
  * [https://arv-fazriansyah.github.io/api-hari-libur-indonesia/data/2026.json](https://arv-fazriansyah.github.io/api-hari-libur-indonesia/data/2026.json)

* **Via jsDelivr CDN**

  * [https://cdn.jsdelivr.net/gh/arv-fazriansyah/api-hari-libur-indonesia@main/data/2025.json](https://cdn.jsdelivr.net/gh/arv-fazriansyah/api-hari-libur-indonesia@main/data/2025.json)
  * [https://cdn.jsdelivr.net/gh/arv-fazriansyah/api-hari-libur-indonesia@main/data/2026.json](https://cdn.jsdelivr.net/gh/arv-fazriansyah/api-hari-libur-indonesia@main/data/2026.json)

### 🌐 Dynamic API Endpoint

* **Via Vercel Serverless API**
  Dapatkan data berdasarkan tahun tertentu secara fleksibel:

  ```
  https://arv-fazriansyah.vercel.app/api?tahun=2025
  ```

  **Parameter:**

  * `tahun` (opsional): Tahun yang diinginkan, default = tahun saat ini

  **Contoh:**

  ```bash
  curl -s 'https://arv-fazriansyah.vercel.app/api?tahun=2025' | jq
  ```

  **Respon JSON:**

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

---

## Penggunaan

### JavaScript (fetch)

```js
fetch('https://cdn.jsdelivr.net/gh/arv-fazriansyah/api-hari-libur-indonesia@main/data/2025.json')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Dengan `curl`

```bash
curl -s https://arv-fazriansyah.vercel.app/api?tahun=2025 | jq
```

---

## Pembaruan Otomatis

* Data diperbarui **setiap hari** lewat GitHub Actions (`.github/workflows/libur.yml`)
* Sumber utama: Google Calendar resmi pemerintah
* Fallback: Skrip Python prediksi (`script/python.py`)
* Semua hasil disimpan ke folder `/data/*.json`

---

## Hosting & Cache

* Gratis & cepat melalui **GitHub Pages** dan **jsDelivr CDN**
* Cache edge global jsDelivr disegarkan otomatis setiap ±1 jam
* Endpoint dinamis di-host di **Vercel Serverless Function**

---

## Lisensi

Data ini dirilis di bawah [MIT License](LICENSE).
Bebas digunakan untuk keperluan **pribadi, komersial, pendidikan**, atau integrasi ke dalam sistem lain.

---
