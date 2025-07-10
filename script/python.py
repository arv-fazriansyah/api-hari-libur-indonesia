from hijri_converter import convert
import json
from datetime import date

# Hari libur Hijriah (dikonversi ke Masehi)
LIBUR_HIJRI = [
    ("Isra Mikraj Nabi Muhammad", 27, 7),         # 27 Rajab
    ("Awal Ramadan", 1, 9),                       # 1 Ramadan
    ("Hari Raya Idul Fitri", 1, 10),              # 1 Syawal
    ("Hari Raya Idul Fitri", 2, 10),              # 2 Syawal
    ("Hari Raya Idul Adha", 10, 12),              # 10 Dzulhijjah
    ("Tahun Baru Islam", 1, 1),                   # 1 Muharram
    ("Maulid Nabi Muhammad", 12, 3)               # 12 Rabiul Awal
]

def prediksi_libur_tidak_tetap(tahun_masehi: int):
    hasil = []

    for nama, hari, bulan in LIBUR_HIJRI:
        # Hijriyah ≈ Masehi - 579 (untuk bulan Ramadan–Dzulhijjah, Rajab)
        # Hijriyah ≈ Masehi - 578 (untuk bulan Muharram, Rabiul Awal)
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

    # Tambahkan prediksi Hari Raya Waisak (angka dan tanggal belum pasti)
    tahun_buddha = tahun_masehi + 544
    tanggal_waisak = f"{tahun_masehi}-05-15"  # Estimasi tanggal Waisak, rata-rata di bulan Mei

    hasil.append({
        "Keterangan": f"Hari Raya Waisak {tahun_buddha} (belum pasti)",
        "Tanggal": tanggal_waisak
    })

    return hasil

if __name__ == "__main__":
    import sys
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else date.today().year + 1
    prediksi = prediksi_libur_tidak_tetap(tahun)
    with open(f"data/{tahun}.json", "w") as f:
        json.dump(prediksi, f, indent=2)
