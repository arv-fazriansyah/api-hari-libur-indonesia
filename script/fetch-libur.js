#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

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
            if (!summary || !tanggal) return null;
            return { Keterangan: summary, Tanggal: tanggal };
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
    try {
      let data = await fetchFromGoogleCalendar(tahun);
      if (!data.length) throw new Error("Data kosong");

      fs.mkdirSync("data", { recursive: true });
      const file = path.join("data", `${tahun}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`✅ Disimpan ke ${file}`);

      // Tambahkan ke master hanya jika ada data valid (tidak kosong dan tidak "")
      const filtered = data.filter(h => h.Keterangan && h.Keterangan.trim() !== "");
      if (filtered.length > 0) {
        collected.push({ tahun, data: filtered });
      } else {
        console.warn(`⚠️ Tidak ada entri valid untuk tahun ${tahun}, dilewati dari master.json`);
      }

    } catch (err) {
      console.warn(`⚠️ Gagal ambil dari Google Calendar: ${err.message}`);
      console.log(`🔁 Fallback ke script/python.py ${tahun}`);
      const res = spawnSync("python3", ["script/python.py", tahun], {
        stdio: "inherit"
      });
      if (res.status !== 0) {
        console.error(`❌ Gagal fallback Python untuk tahun ${tahun}`);
        continue;
      }

      // Baca hasil fallback Python
      const fallbackFile = path.join("data", `${tahun}.json`);
      if (fs.existsSync(fallbackFile)) {
        const content = fs.readFileSync(fallbackFile, "utf8");
        const parsed = JSON.parse(content).filter(h => h.Keterangan && h.Keterangan.trim() !== "");
        if (parsed.length > 0) {
          collected.push({ tahun, data: parsed });
        } else {
          console.warn(`⚠️ Hasil fallback kosong untuk tahun ${tahun}, dilewati dari master.json`);
        }
      }
    }
  }

  // Simpan master.json jika ada data
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
    console.warn("⚠️ Tidak ada data libur valid untuk tahun-tahun yang diproses. master.json tidak dibuat.");
  }
})();
