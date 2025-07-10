import json
from datetime import date, timedelta, datetime
from hijri_converter import convert
import ephem

# 📌 Daftar hari libur berbasis kalender Hijriah
LIBUR_HIJRI = [
    ("Isra Mikraj Nabi Muhammad", 27, 7),
    ("Awal Ramadan", 1, 9),
    ("Hari Raya Idul Fitri", 1, 10),
    ("Hari Raya Idul Fitri", 2, 10),
    ("Hari Raya Idul Adha", 10, 12),
    ("Tahun Baru Islam", 1, 1),
    ("Maulid Nabi Muhammad", 12, 3)
]

# 📌 Hari libur tetap nasional
def tanggal_tetap(tahun: int):
    return [
        {"Keterangan": f"Tahun Baru {tahun}", "Tanggal": f"{tahun}-01-01"},
        {"Keterangan": "Hari Buruh", "Tanggal": f"{tahun}-05-01"},
        {"Keterangan": "Hari Pancasila", "Tanggal": f"{tahun}-06-01"},
        {"Keterangan": f"Proklamasi Kemerdekaan Ke-{tahun - 1945}", "Tanggal": f"{tahun}-08-17"},
        {"Keterangan": "Natal", "Tanggal": f"{tahun}-12-25"}
    ]

# 📌 Prediksi Hari Raya Waisak (purnama kedua setelah 21 Maret)
def prediksi_waisak(tahun: int):
    try:
        start = ephem.Date(f"{tahun}/3/21")
        full_moons = []
        while len(full_moons) < 2:
            next_full = ephem.next_full_moon(start)
            local_date = ephem.localtime(next_full).date()
            full_moons.append(local_date)
            start = ephem.Date(local_date + timedelta(days=1))

        tanggal_waisak = full_moons[1].isoformat()
        tahun_buddha = tahun + 544

        return {
            "Keterangan": f"Hari Raya Waisak {tahun_buddha} (belum pasti)",
            "Tanggal": tanggal_waisak
        }
    except Exception as e:
        print(f"❌ Gagal hitung Waisak: {e}")
        return None

# 📌 Prediksi libur berdasarkan kalender Hijriah
def prediksi_hijriyah(tahun: int):
    hasil = []
    for nama, hari, bulan in LIBUR_HIJRI:
        if bulan in [7, 9, 10, 12]:
            tahun_hijriyah = tahun - 579
        else:
            tahun_hijriyah = tahun - 578

        try:
            tanggal_masehi = convert.Hijri(tahun_hijriyah, bulan, hari).to_gregorian()
            hasil.append({
                "Keterangan": f"{nama} (belum pasti)",
                "Tanggal": tanggal_masehi.isoformat()
            })
        except Exception as e:
            print(f"❌ Gagal konversi {nama}: {e}")
    return hasil

# 📌 Gabungkan semua, dan urutkan berdasarkan tanggal
def prediksi_libur_tidak_tetap(tahun: int):
    hasil = []
    hasil += tanggal_tetap(tahun)
    hasil += prediksi_hijriyah(tahun)

    waisak = prediksi_waisak(tahun)
    if waisak:
        hasil.append(waisak)

    # 🔽 Urutkan berdasarkan tanggal
    hasil.sort(key=lambda x: datetime.fromisoformat(x["Tanggal"]))
    return hasil

# 📌 Eksekusi utama
if __name__ == "__main__":
    import sys
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else date.today().year + 1
    hasil = prediksi_libur_tidak_tetap(tahun)

    output_file = f"data/{tahun}.json"
    with open(output_file, "w") as f:
        json.dump(hasil, f, indent=2, ensure_ascii=False)

    print(f"✅ Data libur {tahun} disimpan di {output_file}")
