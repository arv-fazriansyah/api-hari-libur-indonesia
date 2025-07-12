#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

function normalize(summary, tahun, tanggal) {
  const lower = summary.toLowerCase();
  let result = null;
  let isBelumPasti = /\(belum pasti\)/i.test(summary) || lower.includes("belum pasti");

  if (lower.includes("cuti")) {
    if (lower.includes("idul fitri")) result = `Cuti Bersama Hari Raya Idul Fitri`;
    else if (lower.includes("kenaikan")) result = "Cuti Bersama Kenaikan Yesus Kristus";
    else if (lower.includes("natal")) result = "Cuti Bersama Kelahiran Yesus Kristus (Natal)";
    else if (lower.includes("waisak")) result = `Cuti Bersama Waisak`;
    else result = `Cuti Bersama ${summary.replace(/cuti bersama/i, "").trim()}`;
  } else if (/tahun baru/i.test(summary) && /masehi/i.test(summary)) result = `Tahun Baru ${tahun} Masehi`;
  else if (/imlek/i.test(summary)) result = `Tahun Baru Imlek`;
  else if (/nyepi/i.test(summary)) result = `Hari Suci Nyepi`;
  else if (/isra/i.test(summary)) result = "Isra Mikraj Nabi Muhammad S.A.W.";
  else if (/idul fitri/i.test(summary)) result = `Hari Raya Idul Fitri`;
  else if (/idul adha/i.test(summary)) result = `Hari Raya Idul Adha`;
  else if (/maulid/i.test(summary)) result = "Maulid Nabi Muhammad S.A.W.";
  else if (/muharam/.test(lower)) result = `1 Muharam Tahun Baru Islam`;
  else if (/waisak/i.test(summary)) result = `Hari Raya Waisak`;
  else if (/wafat/i.test(summary)) result = "Wafat Yesus Kristus";
  else if (/paskah/i.test(summary)) result = "Hari Paskah (Kebangkitan Yesus Kristus)";
  else if (/kenaikan/i.test(summary)) result = "Kenaikan Yesus Kristus";
  else if (/natal/.test(summary)) result = "Kelahiran Yesus Kristus (Natal)";
  else if (/buruh/i.test(summary)) result = "Hari Buruh Internasional";
  else if (/pancasila/i.test(summary)) result = "Hari Lahir Pancasila";
  else if (/kemerdekaan/i.test(summary)) result = `Proklamasi Kemerdekaan`;

  if (!result) return null;

  const now = new Date();
  const liburDate = new Date(tanggal);
  if (isBelumPasti && liburDate > now) result += " (belum pasti)";
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
  const collected = [];

  for (const tahun of TARGET_YEARS) {
    console.log(`📅 Memproses tahun ${tahun}...`);
    let data = [];
    let fromFallback = false;

    try {
      data = await fetchFromGoogleCalendar(tahun);
      if (!data.length) throw new Error("Data kosong dari Google Calendar");

      console.log(`✅ Ditemukan ${data.length} entri dari Google Calendar`);
    } catch (err) {
      console.warn(`⚠️ Gagal fetch Google: ${err.message}`);
      console.log(`🔁 Fallback ke script/python.py ${tahun}`);

      const res = spawnSync("python3", ["script/python.py", tahun], {
        stdio: "inherit"
      });

      if (res.status !== 0) {
        console.error(`❌ Gagal fallback Python untuk tahun ${tahun}`);
        continue;
      }

      const fallbackFile = path.join("data", `${tahun}.json`);
      if (fs.existsSync(fallbackFile)) {
        const content = fs.readFileSync(fallbackFile, "utf8");
        data = JSON.parse(content).filter(h => h.Keterangan && h.Tanggal);
        fromFallback = true;
      }
    }

    if (Array.isArray(data) && data.length > 0) {
      fs.mkdirSync("data", { recursive: true });
      const filePath = path.join("data", `${tahun}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`📁 Disimpan ke ${filePath}`);

      if (!fromFallback) {
        collected.push({ tahun, data });
      } else {
        console.log(`🚫 Tahun ${tahun} tidak masuk master.json (sumber fallback)`);
      }
    } else {
      console.log(`ℹ️ Tidak ada data valid untuk ${tahun}, dilewati`);
    }
  }

  if (collected.length > 0) {
    try {
      const outputPath = path.join("data", "master.json");
      fs.writeFileSync(outputPath, JSON.stringify(collected, null, 2));
      console.log(`📦 File master.json disimpan di ${outputPath}`);
    } catch (err) {
      console.error("❌ Gagal menyimpan master.json:", err.message);
      process.exit(1);
    }
  } else {
    console.log("🚫 Tidak ada data resmi dari Google Calendar, master.json tidak dibuat.");
  }
})();
