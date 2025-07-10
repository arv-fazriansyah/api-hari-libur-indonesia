import json
from hijri_converter import convert
from datetime import datetime, timedelta

def hijri_to_masehi(hijri_year, hijri_month, hijri_day):
    try:
        return convert.Hijri(hijri_year, hijri_month, hijri_day).to_gregorian()
    except:
        return None

def main(year):
    events = []

    hijri_year = year - 579  # asumsi Hijriyah lebih kecil 579
    # Idul Fitri 1 Syawal
    fitri = hijri_to_masehi(hijri_year, 10, 1)
    if fitri:
        events.append({ "Keterangan": f"Hari Raya Idul Fitri {hijri_year} Hijriyah (belum pasti)", "Tanggal": str(fitri) })

    # Idul Adha 10 Dzulhijjah
    adha = hijri_to_masehi(hijri_year, 12, 10)
    if adha:
        events.append({ "Keterangan": f"Hari Raya Idul Adha {hijri_year} Hijriyah (belum pasti)", "Tanggal": str(adha) })

    # Tahun Baru Islam 1 Muharram
    muharram = hijri_to_masehi(hijri_year + 1, 1, 1)
    if muharram:
        events.append({ "Keterangan": f"Tahun Baru Islam {hijri_year + 1} Hijriyah (belum pasti)", "Tanggal": str(muharram) })

    print(json.dumps(events, indent=2))

if __name__ == "__main__":
    import sys
    year = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.now().year + 1
    main(year)
