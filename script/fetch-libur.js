#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

function hijriyah(tahunMasehi) {
  return Math.floor((tahunMasehi - 622) * 33 / 32);
}
const kongzili = (tahun) => tahun + 551;
const saka = (tahun) => tahun - 78;
const buddhist = (tahun) => tahun + 544;

function normalize(summary, tahun, tanggal) {
  const lower = summary.toLowerCase();
  let result = null;
  let isBelumPasti = /\(belum pasti\)/i.test(summary) || lower.includes("belum pasti");

  if (lower.includes("cuti")) {
    if (lower.includes("idul fitri")) result = `Cuti Bersama Hari Raya Idul Fitri`;
    else if (lower.includes("kenaikan")) result = "Cuti Bersama Kenaikan Yesus Kristus";
    else if (lower.includes("natal")) result = "Cuti Bersama Kelahiran Yesus Kristus (Natal)";
    else if (lower.includes("waisak")) result = `Cuti Bersama Hari Raya Waisak`;
    else if (lower.includes("imlek")) result = `Cuti Bersama Tahun Baru Imlek`;
    else if (lower.includes("nyepi")) result = `Cuti Bersama Hari Suci Nyepi`;
    else result = `Cuti Bersama ${summary.replace(/cuti bersama/i, "").trim()}`;
  } else if (/hari tahun baru/i.test(summary)) result = `Tahun Baru ${tahun} Masehi`;
  else if (/imlek/i.test(summary)) result = `Tahun Baru Imlek ${kongzili(tahun)} Kongzili`;
  else if (/nyepi/i.test(summary)) result = `Hari Suci Nyepi (Tahun Baru Saka ${saka(tahun)})`;
  else if (/isra/i.test(summary)) result = "Isra Mikraj Nabi Muhammad S.A.W.";
  else if (/idul fitri/i.test(summary)) result = `Hari Raya Idul Fitri ${hijriyah(tahun)} Hijriyah`;
  else if (/idul adha/i.test(summary)) result = `Hari Raya Idul Adha ${hijriyah(tahun)} Hijriyah`;
  else if (/maulid/i.test(summary)) result = "Maulid Nabi Muhammad S.A.W.";
  else if (/muharam/.test(lower)) result = `1 Muharam Tahun Baru Islam ${hijriyah(tahun) + 1} Hijriyah`;
  else if (/waisak/i.test(summary)) result = `Hari Raya Waisak ${buddhist(tahun)} BE`;
  else if (/wafat/i.test(summary)) result = "Wafat Yesus Kristus";
  else if (/paskah/i.test(summary)) result = "Hari Paskah (Kebangkitan Yesus Kristus)";
  else if (/kenaikan/i.test(summary)) result = "Kenaikan Yesus Kristus";
  else if (/hari raya natal/i.test(summary) || /natal/.test(summary)) result = "Kelahiran Yesus Kristus (Natal)";
  else if (/buruh/i.test(summary)) result = "Hari Buruh Internasional";
  else if (/pancasila/i.test(summary)) result = "Hari Lahir Pancasila";
  else if (/kemerdekaan/i.test(summary)) result = `Hari Proklamasi Kemerdekaan R.I. Ke-${tahun - 1945}`;

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

const masterRaw = [];

(async () => {
  for (const tahun of TARGET_YEARS) {
    console.log(`📅 Memproses tahun ${tahun}...`);
    try {
      const items = await fetchFromGoogleCalendar(tahun);

      // Simpan ke masterRaw walau kosong
      const rawData = items.map((item) => ({
        summary: item.summary?.trim(),
        date: item.start?.date,
      }));
      masterRaw.push({ tahun, data: rawData });

      if (!items.length) {
        console.warn(`⚠️ Tidak ada event dari Google Calendar untuk ${tahun}`);
        continue; // Jangan buat file {tahun}.json
      }

      // Data normalize
      const data = items.map((item) => {
        const summary = item.summary?.trim();
        const tanggal = item.start?.date;
        const norm = normalize(summary, tahun, tanggal);
        if (!norm || !tanggal) return null;
        return { Keterangan: norm, Tanggal: tanggal };
      }).filter(Boolean);

      data.sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));

      fs.mkdirSync("data", { recursive: true });
      const file = path.join("data", `${tahun}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`✅ Disimpan ke ${file}`);

    } catch (err) {
      console.warn(`⚠️ Gagal ambil dari Google Calendar: ${err.message}`);
      console.log(`🔁 Fallback ke script/python.py ${tahun}`);
      const res = spawnSync("python3", ["script/python.py", tahun], {
        stdio: "inherit"
      });
      if (res.status !== 0) {
        console.error(`❌ Gagal fallback Python untuk tahun ${tahun}`);
        process.exit(1);
      }
    }
  }

  // Simpan master.json meskipun tahun depan kosong
  const masterFile = path.join("data", "master.json");
  fs.writeFileSync(masterFile, JSON.stringify(masterRaw, null, 2));
  console.log(`✅ Disimpan ke ${masterFile}`);
})();
