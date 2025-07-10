import json
from datetime import date, timedelta
from hijri_converter import convert
import ephem

# Daftar hari libur berbasis Hijriah
LIBUR_HIJRI = [
    ("Isra Mikraj Nabi Muhammad", 27, 7),         # 27 Rajab
    ("Awal Ramadan", 1, 9),                       # 1 Ramadan
    ("Hari Raya Idul Fitri", 1, 10),              # 1 Syawal
    ("Hari Raya Idul Fitri", 2, 10),              # 2 Syawal
    ("Hari Raya Idul Adha", 10, 12),              # 10 Dzulhijjah
    ("Tahun Baru Islam", 1, 1),                   # 1 Muharram
    ("Maulid Nabi Muhammad", 12, 3)               # 12 Rabiul Awal
]

def prediksi_hijriyah(tahun_masehi: int):
    hasil = []

    for nama, hari, bulan in LIBUR_HIJRI:
        # Tahun Hijriah diperkirakan berdasarkan bulan
        if bulan in [7, 9, 10, 12]:  # Rajab, Ramadan, Syawal, Dzulhijjah
            tahun_hijriyah = tahun_masehi - 579
        else:  # Muharram, Rabiul Awal
            tahun_hijriyah = tahun_masehi - 578

        try:
            tanggal_masehi = convert.Hijri(tahun_hijriyah, bulan, hari).to_gregorian()
            hasil.append({
                "Keterangan": f"{nama} (belum pasti)",
                "Tanggal": tanggal_masehi.isoformat()
            })
        except Exception as e:
            print(f"❌ Gagal konversi {nama}: {e}")

    return hasil

def prediksi_waisak(tahun_masehi: int):
    try:
        start = ephem.Date(f"{tahun_masehi}/3/21")
        full_moons = []
        while len(full_moons) < 2:
            next_full = ephem.next_full_moon(start)
            local_date = ephem.localtime(next_full).date()
            full_moons.append(local_date)
            start = ephem.Date(local_date + timedelta(days=1))

        tanggal_waisak = full_moons[1].isoformat()
        tahun_buddha = tahun_masehi + 544

        return {
            "Keterangan": f"Hari Raya Waisak {tahun_buddha} (belum pasti)",
            "Tanggal": tanggal_waisak
        }

    except Exception as e:
        print(f"❌ Gagal hitung Waisak: {e}")
        return None

def prediksi_libur_tidak_tetap(tahun_masehi: int):
    hasil = prediksi_hijriyah(tahun_masehi)
    waisak = prediksi_waisak(tahun_masehi)
    if waisak:
        hasil.append(waisak)
    return hasil

if __name__ == "__main__":
    import sys
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else date.today().year + 1
    hasil_prediksi = prediksi_libur_tidak_tetap(tahun)

    output_file = f"data/{tahun}.json"
    with open(output_file, "w") as f:
        json.dump(hasil_prediksi, f, indent=2)

    print(f"✅ Prediksi libur tidak tetap {tahun} disimpan di {output_file}")
