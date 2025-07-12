#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");
const { HijriDate } = require("hijri-date/lib/safe");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

const kongzili = (tahun) => tahun + 551;
const saka = (tahun) => tahun - 78;
const buddhist = (tahun) => tahun + 544;

function hijriyahYear(tanggalIso) {
  const hijri = new HijriDate(new Date(tanggalIso));
  return hijri.getFullYear();
}

function normalize(summary, tahun, tanggal) {
  const lower = summary.toLowerCase();
  let result = null;
  let isBelumPasti = /\(belum pasti\)/i.test(summary) || lower.includes("belum pasti");

  if (lower.includes("cuti")) {
    if (lower.includes("idul fitri")) result = `Cuti Bersama Hari Raya Idul Fitri ${hijriyahYear(tanggal)} Hijriyah`;
    else if (lower.includes("kenaikan")) result = "Cuti Bersama Kenaikan Yesus Kristus";
    else if (lower.includes("natal")) result = "Cuti Bersama Kelahiran Yesus Kristus (Natal)";
    else if (lower.includes("waisak")) result = `Cuti Bersama Waisak ${buddhist(tahun)} BE`;
    else result = `Cuti Bersama ${summary.replace(/cuti bersama/i, "").trim()}`;
  } else if (/hari tahun baru/i.test(summary)) result = `Tahun Baru ${tahun} Masehi`;
  else if (/imlek/i.test(summary)) result = `Tahun Baru Imlek ${kongzili(tahun)} Kongzili`;
  else if (/nyepi/i.test(summary)) result = `Hari Suci Nyepi (Tahun Baru Saka ${saka(tahun)})`;
  else if (/isra/i.test(summary)) result = "Isra Mikraj Nabi Muhammad S.A.W.";
  else if (/idul fitri/i.test(summary)) result = `Hari Raya Idul Fitri ${hijriyahYear(tanggal)} Hijriyah`;
  else if (/idul adha/i.test(summary)) result = `Hari Raya Idul Adha ${hijriyahYear(tanggal)} Hijriyah`;
  else if (/maulid/i.test(summary)) result = "Maulid Nabi Muhammad S.A.W.";
  else if (/muharam/.test(lower)) result = `1 Muharam Tahun Baru Islam ${hijriyahYear(tanggal)} Hijriyah`;
  else if (/waisak/i.test(summary)) result = `Hari Raya Waisak ${buddhist(tahun)} BE`;
  else if (/wafat/i.test(summary)) result = "Wafat Yesus Kristus";
  else if (/paskah/i.test(summary)) result = "Hari Paskah (Kebangkitan Yesus Kristus)";
  else if (/kenaikan/i.test(summary)) result = "Kenaikan Yesus Kristus";
  else if (/hari raya natal/i.test(summary) || /natal/.test(summary)) result = "Kelahiran Yesus Kristus (Natal)";
  else if (/buruh/i.test(summary)) result = "Hari Buruh Internasional";
  else if (/pancasila/i.test(summary)) result = "Hari Lahir Pancasila";
  else if (/kemerdekaan/i.test(summary)) result = `Proklamasi Kemerdekaan Ke-${tahun - 1945}`;

  // Komentar baris ini jika ingin tetap tampil "(belum pasti)" meskipun sudah lewat
   if (isBelumPasti) {
     const now = new Date();
     const liburDate = new Date(tanggal);
     if (liburDate <= now) isBelumPasti = false;
   }

  if (result && isBelumPasti && !result.includes("(belum pasti)")) {
    result += " (belum pasti)";
  }

  return result;
}

function fetchFromGoogleCalendar(tahun) {
  return new Promise((resolve, reject) => {
    const timeMin = `${tahun}-01-01T00:00:00Z`;
    const timeMax = `${tahun}-12-31T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`;

    console.log(`🌐 Fetching from: ${url}`);
    https.get(url, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(raw);
          resolve(json.items || []);
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

(async () => {
  const master = [];

  for (const tahun of TARGET_YEARS) {
    console.log(`📅 Memproses tahun ${tahun}...`);
    let items = [];
    let fromGoogle = false;

    try {
      items = await fetchFromGoogleCalendar(tahun);
      if (items.length > 0) {
        fromGoogle = true;
        console.log(`✅ Ditemukan ${items.length} libur dari Google Calendar`);
      } else {
        throw new Error("Kosong, fallback ke Python");
      }
    } catch (err) {
      console.warn(`⚠️ Tidak ada data dari Google Calendar: ${err.message}`);
      console.log(`🔁 Menjalankan script/python.py ${tahun}`);
      const res = spawnSync("python3", ["script/python.py", tahun], {
        stdio: "inherit"
      });
      if (res.status !== 0) {
        console.error(`❌ Gagal menjalankan fallback Python untuk ${tahun}`);
        process.exit(1);
      }

      const filepath = path.join("data", `${tahun}.json`);
      if (fs.existsSync(filepath)) {
        items = JSON.parse(fs.readFileSync(filepath, "utf-8")).map((x) => ({
          summary: x.Keterangan,
          start: { date: x.Tanggal }
        }));
      }
    }

    // Buat file per tahun (normalize)
    const normalized = items.map((item) => {
      const summary = item.summary?.trim();
      const tanggal = item.start?.date;
      const norm = normalize(summary, tahun, tanggal);
      if (!norm || !tanggal) return null;
      return { Keterangan: norm, Tanggal: tanggal };
    }).filter(Boolean);

    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync(path.join("data", `${tahun}.json`), JSON.stringify(normalized, null, 2));
    console.log(`💾 Disimpan: data/${tahun}.json`);

    // Tambahkan ke master.json HANYA jika dari Google Calendar
    if (fromGoogle) {
      const raw = items.map((item) => {
        const summary = item.summary?.trim();
        const tanggal = item.start?.date;
        if (!summary || !tanggal) return null;
        return { Keterangan: summary, Tanggal: tanggal };
      }).filter(Boolean);
      if (raw.length) master.push({ tahun, data: raw });
    }
  }

  // Simpan master.json jika ada hasil dari Google
  if (master.length > 0) {
    fs.writeFileSync(path.join("data", "master.json"), JSON.stringify(master, null, 2));
    console.log(`📦 File master.json berhasil disimpan (${master.length} tahun)`);
  } else {
    console.log("🚫 Tidak ada data dari Google Calendar untuk master.json");
  }
})();
