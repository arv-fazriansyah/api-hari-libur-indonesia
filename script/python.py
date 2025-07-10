import json
from datetime import date, timedelta, datetime
from hijri_converter import convert
import ephem

# Tanggal Tahun Baru Imlek (manual lookup)
IMLEK_TANGGAL = {
    2025: "2025-01-29",
    2026: "2026-02-17",
    2027: "2027-02-06",
    2028: "2028-01-26",
    2029: "2029-02-13",
    2030: "2030-02-03"
}

# Libur Hijriah: (nama, hari, bulan)
LIBUR_HIJRI = [
    ("Isra Mikraj Nabi Muhammad", 27, 7),
    ("Awal Ramadan", 1, 9),
    ("Hari Raya Idul Fitri", 1, 10),
    ("Hari Raya Idul Fitri", 2, 10),
    ("Hari Raya Idul Adha", 10, 12),
    ("Tahun Baru Islam", 1, 1),
    ("Maulid Nabi Muhammad", 12, 3)
]

def tanggal_tetap(tahun: int):
    return [
        {"Keterangan": f"Tahun Baru {tahun}", "Tanggal": f"{tahun}-01-01"},
        {"Keterangan": "Hari Buruh", "Tanggal": f"{tahun}-05-01"},
        {"Keterangan": "Hari Pancasila", "Tanggal": f"{tahun}-06-01"},
        {"Keterangan": f"Proklamasi Kemerdekaan Ke-{tahun - 1945}", "Tanggal": f"{tahun}-08-17"},
        {"Keterangan": "Natal", "Tanggal": f"{tahun}-12-25"}
    ]

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
            "Keterangan": f"Hari Raya Waisak {tahun_buddha} (prakiraan)",
            "Tanggal": tanggal_waisak
        }
    except Exception as e:
        print(f"❌ Gagal prediksi Waisak: {e}")
        return None

def prediksi_hijriyah(tahun: int):
    hasil = []
    for nama, hari, bulan in LIBUR_HIJRI:
        tahun_hijriyah = (tahun - 579) if bulan >= 7 else (tahun - 578)
        try:
            tgl = convert.Hijri(tahun_hijriyah, bulan, hari).to_gregorian()
            tgl_masehi = tgl.isoformat()

            if not tgl_masehi.startswith(str(tahun)):
                for delta in [-1, 1]:
                    try:
                        tgl_alt = convert.Hijri(tahun_hijriyah + delta, bulan, hari).to_gregorian()
                        if tgl_alt.year == tahun:
                            tgl_masehi = tgl_alt.isoformat()
                            break
                    except:
                        continue

            if tgl_masehi.startswith(str(tahun)):
                hasil.append({
                    "Keterangan": f"{nama} (prakiraan)",
                    "Tanggal": tgl_masehi
                })
        except Exception as e:
            print(f"❌ Gagal konversi {nama} {hari}/{bulan}/{tahun_hijriyah}: {e}")
    return hasil

def tambah_imlek(tahun: int):
    hasil = []
    if tahun in IMLEK_TANGGAL:
        imlek = datetime.fromisoformat(IMLEK_TANGGAL[tahun])
        hasil.append({
            "Keterangan": f"Tahun Baru Imlek {tahun + 551} Kongzili",
            "Tanggal": imlek.date().isoformat()
        })
        hasil.append({
            "Keterangan": "Cuti Imlek",
            "Tanggal": (imlek - timedelta(days=1)).date().isoformat()
        })
    return hasil

def prediksi_cuti_bersama(tahun: int, libur_list: list):
    hasil = []
    for libur in libur_list:
        keterangan = libur["Keterangan"]
        tgl = datetime.fromisoformat(libur["Tanggal"])

        if "Idul Fitri" in keterangan:
            if "1" in keterangan:
                hasil.append({
                    "Keterangan": "Cuti Bersama Idul Fitri (prakiraan)",
                    "Tanggal": (tgl - timedelta(days=1)).isoformat()
                })
            if "2" in keterangan:
                hasil.append({
                    "Keterangan": "Cuti Bersama Idul Fitri (prakiraan)",
                    "Tanggal": (tgl + timedelta(days=1)).isoformat()
                })
        elif "Natal" in keterangan:
            hasil.append({
                "Keterangan": "Cuti Bersama Natal (prakiraan)",
                "Tanggal": (tgl - timedelta(days=1)).isoformat()
            })
    return hasil

def prediksi_libur_tidak_tetap(tahun: int):
    hasil = []
    hasil += tanggal_tetap(tahun)
    hasil += tambah_imlek(tahun)
    hasil += prediksi_hijriyah(tahun)
    waisak = prediksi_waisak(tahun)
    if waisak: hasil.append(waisak)
    hasil += prediksi_cuti_bersama(tahun, hasil)
    hasil.sort(key=lambda x: datetime.fromisoformat(x["Tanggal"]))
    return hasil

if __name__ == "__main__":
    import sys
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else date.today().year + 1
    hasil = prediksi_libur_tidak_tetap(tahun)
    output_file = f"data/{tahun}.json"
    with open(output_file, "w") as f:
        json.dump(hasil, f, indent=2, ensure_ascii=False)
    print(f"✅ Data libur {tahun} disimpan di {output_file}")
