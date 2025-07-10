import json
import sys
from datetime import datetime
from hijri_converter import convert

def hijri_to_gregorian(hyear, hmonth, hday):
    try:
        g = convert.Hijri(hyear, hmonth, hday).to_gregorian()
        return g.isoformat()
    except:
        return None

def main(target_year):
    prediksi = []

    hijri_year = target_year - 579
    fitri = hijri_to_gregorian(hijri_year, 10, 1)
    if fitri:
        prediksi.append({
            "Keterangan": f"Hari Raya Idul Fitri {hijri_year} Hijriyah (belum pasti)",
            "Tanggal": fitri
        })

    adha = hijri_to_gregorian(hijri_year, 12, 10)
    if adha:
        prediksi.append({
            "Keterangan": f"Hari Raya Idul Adha {hijri_year} Hijriyah (belum pasti)",
            "Tanggal": adha
        })

    muharram = hijri_to_gregorian(hijri_year + 1, 1, 1)
    if muharram:
        prediksi.append({
            "Keterangan": f"Tahun Baru Islam {hijri_year + 1} Hijriyah (belum pasti)",
            "Tanggal": muharram
        })

    prediksi.sort(key=lambda x: x["Tanggal"])
    print(json.dumps(prediksi, indent=2))

if __name__ == "__main__":
    target_year = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.now().year + 1
    main(target_year)
