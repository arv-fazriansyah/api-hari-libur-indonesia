#!/usr/bin/env python3
import sys, json, os
from datetime import datetime, timedelta, date
from hijri_converter import convert
import ephem
import lunardate
import pytz

WIB = pytz.timezone("Asia/Jakarta")

def to_date(pydate):
    if isinstance(pydate, datetime):
        dt = WIB.localize(pydate)
        return dt.date().isoformat()
    return pydate.isoformat()

def libur_tetap(tahun):
    return [
        {"Keterangan": f"Tahun Baru {tahun} Masehi", "Tanggal": f"{tahun}-01-01"},
        {"Keterangan": "Hari Buruh Internasional", "Tanggal": f"{tahun}-05-01"},
        {"Keterangan": "Hari Lahir Pancasila", "Tanggal": f"{tahun}-06-01"},
        {"Keterangan": f"Proklamasi Kemerdekaan Ke-{tahun - 1945}", "Tanggal": f"{tahun}-08-17"},
        {"Keterangan": "Kelahiran Yesus Kristus (Natal)", "Tanggal": f"{tahun}-12-25"},
    ]

def hijri_fix(hijri, koreksi=1):
    g = hijri.to_gregorian()
    return to_date(datetime(g.year, g.month, g.day) + timedelta(days=koreksi))

def hitung_nyepi(tahun):
    obs = ephem.Observer()
    obs.lat, obs.lon = '-8.65', '115.21'
    nm = ephem.next_new_moon(f'{tahun}/3/1')
    d = nm.datetime().replace(tzinfo=pytz.utc).astimezone(WIB)
    return date(d.year, d.month, d.day)

def hitung_waisak(tahun):
    obs = ephem.Observer()
    obs.lat, obs.lon = '-6.2', '106.8'
    fm = ephem.next_full_moon(f'{tahun}/5/1')
    d = fm.datetime().replace(tzinfo=pytz.utc).astimezone(WIB)
    return date(d.year, d.month, d.day)

def hitung_paskah(tahun):
    a = tahun % 19
    b = tahun // 100
    c = tahun % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2*e + 2*i - h - k) % 7
    m = (a + 11*h + 22*l) // 451
    bulan = (h + l - 7*m + 114) // 31
    hari = ((h + l - 7*m + 114) % 31) + 1
    return datetime(tahun, bulan, hari)

def libur_tidaktetap(tahun):
    hasil = []

    hasil.append({
        "Keterangan": "Isra Mikraj Nabi Muhammad S.A.W.",
        "Tanggal": hijri_fix(convert.Hijri(tahun - 579, 7, 27), koreksi=0)
    })

    hasil.append({
        "Keterangan": f"1 Muharam Tahun Baru Islam {tahun - 578} Hijriyah",
        "Tanggal": hijri_fix(convert.Hijri(tahun - 578, 1, 1), koreksi=1)
    })

    hasil.append({
        "Keterangan": "Maulid Nabi Muhammad S.A.W.",
        "Tanggal": hijri_fix(convert.Hijri(tahun - 578, 3, 12), koreksi=1)
    })

    fitri1 = convert.Hijri(tahun - 579, 10, 1).to_gregorian()
    fitri1 = datetime(fitri1.year, fitri1.month, fitri1.day) + timedelta(days=1)
    hasil.append({
        "Keterangan": f"Hari Raya Idul Fitri {tahun - 579} Hijriyah",
        "Tanggal": to_date(fitri1)
    })
    hasil.append({
        "Keterangan": f"Hari Raya Idul Fitri {tahun - 579} Hijriyah",
        "Tanggal": to_date(fitri1 + timedelta(days=1))
    })

    hasil.append({
        "Keterangan": f"Hari Raya Idul Adha {tahun - 579} Hijriyah",
        "Tanggal": hijri_fix(convert.Hijri(tahun - 579, 12, 10), koreksi=0)
    })

    cny = lunardate.LunarDate(tahun, 1, 1).toSolarDate()
    hasil.append({
        "Keterangan": f"Tahun Baru Imlek {tahun + 551} Kongzili",
        "Tanggal": to_date(cny)
    })

    saka_year = tahun - 78
    hasil.append({
        "Keterangan": f"Hari Suci Nyepi (Tahun Baru Saka {saka_year})",
        "Tanggal": to_date(hitung_nyepi(tahun))
    })

    waisak_date = hitung_waisak(tahun)
    buddhist_year = waisak_date.year + 544
    hasil.append({
        "Keterangan": f"Hari Raya Waisak {buddhist_year} BE",
        "Tanggal": to_date(waisak_date)
    })

    paskah = hitung_paskah(tahun)
    hasil.append({
        "Keterangan": "Wafat Yesus Kristus",
        "Tanggal": to_date(paskah - timedelta(days=2))
    })
    hasil.append({
        "Keterangan": "Hari Paskah (Kebangkitan Yesus Kristus)",
        "Tanggal": to_date(paskah)
    })
    hasil.append({
        "Keterangan": "Kenaikan Yesus Kristus",
        "Tanggal": to_date(paskah + timedelta(days=39))
    })

    return hasil

def main():
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.now(WIB).year + 1
    semua_libur = libur_tetap(tahun) + libur_tidaktetap(tahun)
    semua_libur.sort(key=lambda x: x["Tanggal"])
    output = semua_libur

    # Path ke folder 'data' di luar folder script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.abspath(os.path.join(base_dir, "..", "data"))
    os.makedirs(data_dir, exist_ok=True)

    filepath = os.path.join(data_dir, f"{tahun}.json")

    if os.path.exists(filepath):
        print(f"Mengganti file: {filepath}")
    else:
        print(f"Membuat file baru: {filepath}")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # Cetak juga ke layar
    print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
