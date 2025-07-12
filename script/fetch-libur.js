#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");
const { HijriDate } = require("hijri-date/lib/safe");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];
const DATA_DIR = "data";

// 🔧 Konversi tahun kalender
const kongzili = y => y + 551;
const saka = y => y - 78;
const buddhist = y => y + 544;
const hijriyahYear = iso => new HijriDate(new Date(iso)).getFullYear();

// 🔁 Normalisasi nama libur (jika perlu)
function normalize(summary, tahun, tanggal) {
  const s = summary.toLowerCase();
  const isBelumPasti = /\(belum pasti\)/i.test(summary) || s.includes("belum pasti");
  let result = null;

  if (s.includes("cuti")) {
    if (s.includes("fitri")) result = `Cuti Bersama Hari Raya Idul Fitri ${hijriyahYear(tanggal)} Hijriyah`;
    else if (s.includes("kenaikan")) result = "Cuti Bersama Kenaikan Yesus Kristus";
    else if (s.includes("natal")) result = "Cuti Bersama Kelahiran Yesus Kristus (Natal)";
    else if (s.includes("waisak")) result = `Cuti Bersama Waisak ${buddhist(tahun)} BE`;
    else result = `Cuti Bersama ${summary.replace(/cuti bersama/i, "").trim()}`;
  } else if (/tahun baru/i.test(s) && /masehi/.test(s)) result = `Tahun Baru ${tahun} Masehi`;
  else if (/imlek/.test(s)) result = `Tahun Baru Imlek ${kongzili(tahun)} Kongzili`;
  else if (/nyepi/.test(s)) result = `Hari Suci Nyepi (Tahun Baru Saka ${saka(tahun)})`;
  else if (/isra/.test(s)) result = "Isra Mikraj Nabi Muhammad S.A.W.";
  else if (/idul fitri/.test(s)) result = `Hari Raya Idul Fitri ${hijriyahYear(tanggal)} Hijriyah`;
  else if (/idul adha/.test(s)) result = `Hari Raya Idul Adha ${hijriyahYear(tanggal)} Hijriyah`;
  else if (/maulid/.test(s)) result = "Maulid Nabi Muhammad S.A.W.";
  else if (/muharam/.test(s)) result = `1 Muharam Tahun Baru Islam ${hijriyahYear(tanggal)} Hijriyah`;
  else if (/waisak/.test(s)) result = `Hari Raya Waisak ${buddhist(tahun)} BE`;
  else if (/wafat/.test(s)) result = "Wafat Yesus Kristus";
  else if (/paskah/.test(s)) result = "Hari Paskah (Kebangkitan Yesus Kristus)";
  else if (/kenaikan/.test(s)) result = "Kenaikan Yesus Kristus";
  else if (/natal/.test(s)) result = "Kelahiran Yesus Kristus (Natal)";
  else if (/buruh/.test(s)) result = "Hari Buruh Internasional";
  else if (/pancasila/.test(s)) result = "Hari Lahir Pancasila";
  else if (/kemerdekaan/.test(s)) result = `Proklamasi Kemerdekaan Ke-${tahun - 1945}`;

  if (result && isBelumPasti && !result.includes("belum pasti")) {
    result += " (belum pasti)";
  }

  return result;
}

// 🔎 Fetch dari Google Calendar
function fetchGoogleCalendar(tahun) {
  return new Promise((resolve, reject) => {
    const timeMin = `${tahun}-01-01T00:00:00Z`;
    const timeMax = `${tahun}-12-31T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`;

    https.get(url, res => {
      let raw = "";
      res.on("data", chunk => (raw += chunk));
      res.on("end", () => {
        try {
          const items = JSON.parse(raw).items || [];
          const hasil = items
            .map(item => {
              const summary = item.summary?.trim();
              const tanggal = item.start?.date;
              if (!summary || !tanggal) return null;
              const norm = normalize(summary, tahun, tanggal);
              return norm ? { Keterangan: norm, Tanggal: tanggal } : null;
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));
          resolve(hasil);
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

// 🔁 Ambil data: dari Google, fallback ke Python jika gagal
async function ambilData(tahun) {
  try {
    const data = await fetchGoogleCalendar(tahun);
    if (data.length) return { sumber: "Google", data };
    throw new Error("Kosong");
  } catch {
    console.warn(`⚠️ Fallback ke python.py untuk ${tahun}`);
    const res = spawnSync("python3", ["script/python.py", tahun], { stdio: "inherit" });
    if (res.status !== 0) return null;

    const file = path.join(DATA_DIR, `${tahun}.json`);
    if (!fs.existsSync(file)) return null;

    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const data = json.filter(h => h.Keterangan && h.Tanggal);
    return { sumber: "Python", data };
  }
}

// 🚀 Main
(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const master = [];

  for (const tahun of YEARS) {
    console.log(`📅 Tahun ${tahun}`);
    const hasil = await ambilData(tahun);

    if (!hasil || !hasil.data.length) {
      console.log(`❌ Tidak ada data valid untuk ${tahun}`);
      continue;
    }

    // Simpan file per tahun
    const filePath = path.join(DATA_DIR, `${tahun}.json`);
    fs.writeFileSync(filePath, JSON.stringify(hasil.data, null, 2));
    console.log(`✅ Disimpan: ${filePath}`);

    // Tambah ke master jika dari Google
    if (hasil.sumber === "Google") {
      master.push({ tahun, data: hasil.data });
    } else {
      console.log(`🔁 ${tahun} hanya fallback, tidak masuk master.json`);
    }
  }

  if (master.length) {
    const masterPath = path.join(DATA_DIR, "master.json");
    fs.writeFileSync(masterPath, JSON.stringify(master, null, 2));
    console.log(`📦 Disimpan: ${masterPath}`);
  } else {
    console.log("🚫 master.json tidak dibuat (tidak ada data resmi)");
  }
})();
