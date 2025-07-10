from hijri_converter import convert
import datetime
import os

# Tahun target
tahun_awal = 2025
tahun_akhir = 2030

# Hari besar Hijriyah
hari_besar = [
    ("Isra Mi'raj",        7, 27),
    ("Idul Fitri",        10, 1),
    ("Idul Adha",         12, 10),
    ("Tahun Baru Islam",   1, 1),
    ("Maulid Nabi",        3, 12),
]

output = ["Tahun Masehi\tHari Besar\tTanggal Masehi"]

for tahun in range(tahun_awal, tahun_akhir + 1):
    for nama, bulan_hijri, tanggal_hijri in hari_besar:
        for th_hijri in range(1446, 1453):  # Range sekitar tahun tersebut
            try:
                g = convert.Hijri(th_hijri, bulan_hijri, tanggal_hijri).to_gregorian()
                if g.year == tahun:
                    output.append(f"{tahun}\t{nama}\t{g.strftime('%Y-%m-%d')}")
                    break
            except Exception:
                continue

# Simpan ke TSV
os.makedirs("data", exist_ok=True)
with open("data/libur_islam.tsv", "w", encoding="utf-8") as f:
    f.write("\n".join(output))

print("✅ libur_islam.tsv berhasil dibuat.")
