#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");
const { HijriDate } = require("hijri-date/lib/safe");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

// ... fungsi konversi dan normalize sama seperti sebelumnya ...

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
  const allData = [];
  for (const tahun of TARGET_YEARS) {
    console.log(`📅 Memproses tahun ${tahun}...`);
    try {
      const data = await fetchFromGoogleCalendar(tahun);
      if (!data.length) throw new Error("Data kosong");
      allData.push(...data);
    } catch (err) {
      console.warn(`⚠️ Gagal ambil dari Google Calendar: ${err.message}`);
      console.log(`🔁 Fallback ke script/python.py ${tahun}`);
      const res = spawnSync("python3", ["script/python.py", tahun], {
        stdio: "inherit"
      });
      if (res.status !== 0) {
        console.error(`❌ Gagal fallback Python untuk tahun ${tahun}`);
        process.exit(1);
      } else {
        // Kalau fallback berhasil, kamu bisa load file JSON fallback di sini
        try {
          const fallbackFile = path.join("data", `${tahun}.json`);
          const fallbackData = JSON.parse(fs.readFileSync(fallbackFile, "utf-8"));
          allData.push(...fallbackData);
        } catch (e) {
          console.error(`❌ Gagal baca file fallback untuk tahun ${tahun}: ${e.message}`);
          process.exit(1);
        }
      }
    }
  }
  // Sortir gabungan data dari dua tahun supaya urut
  allData.sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));

  // Simpan ke satu file master.json
  fs.mkdirSync("data", { recursive: true });
  const masterFile = path.join("data", "master.json");
  fs.writeFileSync(masterFile, JSON.stringify(allData, null, 2));
  console.log(`✅ Semua data tahun ${TARGET_YEARS.join(", ")} disimpan ke ${masterFile}`);
})();
