const fs = require("fs");
const path = require("path");
const https = require("https");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

const hijriyah = {
  2025: 1446,
  2026: 1447,
};
const kongzili = (tahun) => tahun + 551;
const saka = (tahun) => tahun - 78;
const buddhist = (tahun) => tahun + 544;

function normalize(summary, tahun) {
  const lower = summary.toLowerCase();

  if (lower.includes("cuti")) {
    // Tambah deskripsi cutinya
    if (lower.includes("idul fitri")) return `Cuti Bersama Hari Raya Idul Fitri ${hijriyah[tahun]} Hijriyah`;
    if (lower.includes("kenaikan")) return "Cuti Bersama Kenaikan Yesus Kristus";
    if (lower.includes("natal")) return "Cuti Bersama Kelahiran Yesus Kristus (Natal)";
    if (lower.includes("waisak")) return `Cuti Bersama Waisak`;
    return `Cuti Bersama ${summary.replace(/cuti bersama/i, "").trim()}`;
  }

  if (/hari tahun baru/i.test(summary)) return `Tahun Baru ${tahun} Masehi`;
  if (/imlek/i.test(summary)) return `Tahun Baru Imlek ${kongzili(tahun)} Kongzili`;
  if (/nyepi/i.test(summary)) return `Hari Suci Nyepi (Tahun Baru Saka ${saka(tahun)})`;
  if (/isra/i.test(summary)) return "Isra Mikraj Nabi Muhammad S.A.W.";
  if (/idul fitri/i.test(summary)) return `Hari Raya Idul Fitri ${hijriyah[tahun]} Hijriyah`;
  if (/idul adha/i.test(summary)) return `Hari Raya Idul Adha ${hijriyah[tahun]} Hijriyah`;
  if (/maulid/i.test(summary)) return "Maulid Nabi Muhammad S.A.W.";
  if (/muharam/i.test(summary)) return `1 Muharam Tahun Baru Islam ${hijriyah[tahun] + 1} Hijriyah`;
  if (/waisak/i.test(summary)) return `Hari Raya Waisak ${buddhist(tahun)} BE`;
  if (/wafat/i.test(summary)) return "Wafat Yesus Kristus";
  if (/paskah/i.test(summary)) return "Hari Paskah (Kebangkitan Yesus Kristus)";
  if (/kenaikan/i.test(summary)) return "Kenaikan Yesus Kristus";
  if (/hari raya natal/i.test(summary)) return "Kelahiran Yesus Kristus (Natal)";
  if (/buruh/i.test(summary)) return "Hari Buruh Internasional";
  if (/pancasila/i.test(summary)) return "Hari Lahir Pancasila";
  if (/kemerdekaan/i.test(summary)) return `Proklamasi Kemerdekaan Ke-${tahun - 1945}`;

  return null;
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
            const norm = normalize(summary, tahun);
            if (!norm || !tanggal) return null;
            return { Keterangan: norm, Tanggal: tanggal };
          }).filter(Boolean);

          // Urutkan hasil
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
  for (const tahun of TARGET_YEARS) {
    console.log(`📅 Memproses tahun ${tahun}...`);
    try {
      const data = await fetchFromGoogleCalendar(tahun);
      if (!data.length) throw new Error("Data kosong");

      fs.mkdirSync("data", { recursive: true });
      const file = path.join("data", `${tahun}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`✅ Disimpan ke ${file}`);
    } catch (err) {
      console.warn(`⚠️ Gagal ambil dari Google Calendar: ${err.message}`);
      console.log(`🔁 Fallback ke script/python.py ${tahun}`);
      const { spawnSync } = require("child_process");
      const res = spawnSync("python3", ["script/python.py", tahun], {
        stdio: "inherit"
      });
      if (res.status !== 0) {
        console.error(`❌ Gagal fallback Python untuk tahun ${tahun}`);
        process.exit(1);
      }
    }
  }
})();
