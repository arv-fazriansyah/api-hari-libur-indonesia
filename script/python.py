from hijri_converter import convert
import json

def predict_holidays(year):
    hijri_targets = [
        ("Awal Ramadan", 1, 9),
        ("Hari Raya Idul Fitri", 1, 10),
        ("Hari Raya Idul Fitri", 2, 10),
        ("Hari Raya Idul Adha", 10, 12),
        ("Tahun Baru Islam", 1, 1),
        ("Maulid Nabi Muhammad", 12, 3)
    ]

    hasil = []
    for nama, h, m in hijri_targets:
        hijri_year = year - 579 if "Idul" in nama else year - 578
        masehi = convert.Hijri(hijri_year, m, h).to_gregorian()
        tanggal = masehi.isoformat()
        hasil.append({
            "Keterangan": f"{nama} (belum pasti)",
            "Tanggal": tanggal
        })

    return hasil

if __name__ == "__main__":
    import sys
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    libur = predict_holidays(tahun)
    with open(f"data/{tahun}.json", "w") as f:
        json.dump(libur, f, indent=2)
