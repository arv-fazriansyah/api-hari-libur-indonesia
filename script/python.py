import ephem
import json
from datetime import date, timedelta

def find_second_full_moon(year: int):
    # Cari tanggal full moon kedua setelah 21 Maret
    start = ephem.Date(f"{year}/3/21")
    count = 0
    full_moons = []

    while True:
        next_full = ephem.localtime(ephem.next_full_moon(start))
        full_moons.append(next_full)
        count += 1
        if count >= 2:
            break
        start = ephem.Date(next_full + timedelta(days=1))

    return full_moons[1].date().isoformat()

def prediksi_waisak(year: int):
    tahun_buddha = year + 544
    tanggal_waisak = find_second_full_moon(year)
    return {
        "Keterangan": f"Hari Raya Waisak {tahun_buddha} (belum pasti)",
        "Tanggal": tanggal_waisak
    }

def prediksi_libur_tidak_tetap(tahun_masehi: int):
    from hijri_converter import convert
    LIBUR_HIJRI = [
        ("Isra Mikraj Nabi Muhammad", 27, 7),
        ("Awal Ramadan", 1, 9),
        ("Hari Raya Idul Fitri", 1, 10),
        ("Hari Raya Idul Fitri", 2, 10),
        ("Hari Raya Idul Adha", 10, 12),
        ("Tahun Baru Islam", 1, 1),
        ("Maulid Nabi Muhammad", 12, 3)
    ]

    hasil = []

    for nama, hari, bulan in LIBUR_HIJRI:
        if bulan in [7, 9, 10, 12]:
            tahun_hijriyah = tahun_masehi - 579
        else:
            tahun_hijriyah = tahun_masehi - 578
        try:
            tanggal_masehi = convert.Hijri(tahun_hijriyah, bulan, hari).to_gregorian()
            hasil.append({
                "Keterangan": f"{nama} (belum pasti)",
                "Tanggal": tanggal_masehi.isoformat()
            })
        except Exception as e:
            print(f"Gagal konversi {nama}: {e}")

    # Tambahkan Hari Raya Waisak lebih akurat
    hasil.append(prediksi_waisak(tahun_masehi))

    return hasil

if __name__ == "__main__":
    import sys
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else date.today().year + 1
    prediksi = prediksi_libur_tidak_tetap(tahun)
    with open(f"data/{tahun}.json", "w") as f:
        json.dump(prediksi, f, indent=2)
