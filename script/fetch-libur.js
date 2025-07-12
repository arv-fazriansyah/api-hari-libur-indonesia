#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");
const { HijriDate } = require("hijri-date/lib/safe");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

// Konversi Tahun Kalender
const kongzili = (tahun) => tahun + 551;
const saka = (tahun) => tahun - 78;
const buddhist = (tahun) => tahun + 544;

// Konversi tahun Hijriyah berdasarkan tanggal ISO
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
          const items = json.items || [];

          const hasil = items.map((item) => {
            const summary = item.summary?.trim();
            const tanggal = item.start?.date;
            const norm = normalize(summary, tahun, tanggal);
            if (!norm || !tanggal) return null;
            return { Keterangan: norm, Tanggal: tanggal };
          }).filter(Boolean);

          hasil.sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));
          resolve(hasil);
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

(async () => {
  const masterData = [];

  for (const tahun of TARGET_YEARS) {
    console.log(`📅 Memproses tahun ${tahun}...`);
    let data = [];

    try {
      const fetched = await fetchFromGoogleCalendar(tahun);
      if (!fetched.length) throw new Error("Data kosong");

      data = fetched;
      fs.writeFileSync(path.join("data", `${tahun}.json`), JSON.stringify(data, null, 2));
      console.log(`✅ Google Calendar berhasil (${data.length} entri)`);
    } catch (err) {
      console.warn(`⚠️ Gagal fetch Google: ${err.message}`);
      console.log(`🔁 Fallback ke Python untuk tahun ${tahun}`);

      const fallback = spawnSync("python3", ["script/python.py", tahun], { encoding: "utf-8" });
      if (fallback.status !== 0) {
        console.error(`❌ Python fallback gagal untuk tahun ${tahun}`);
        continue;
      }

      try {
        const predPath = path.join("data", `${tahun}.json`);
        data = JSON.parse(fs.readFileSync(predPath, "utf-8"));
        if (!Array.isArray(data) || data.length === 0) {
          console.warn(`⚠️ Data fallback kosong untuk tahun ${tahun}`);
          continue;
        }
      } catch (err) {
        console.error(`❌ Gagal membaca hasil Python: ${err.message}`);
        continue;
      }
    }

    if (data.length > 0) {
      masterData.push({ tahun, data });
    }
  }

  if (masterData.length > 0) {
    fs.writeFileSync("data/master.json", JSON.stringify(masterData, null, 2));
    console.log(`📦 File master.json disimpan (${masterData.length} tahun)`);
  } else {
    console.log("🚫 Tidak ada data yang valid untuk disimpan ke master.json");
  }
})();
