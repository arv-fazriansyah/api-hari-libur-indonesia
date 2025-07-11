const fs = require("fs");
const path = require("path");
const https = require("https");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

const hijriyah = 1446;
const kongzili = (tahun) => tahun + 551;
const saka = (tahun) => tahun - 78;
const buddhist = (tahun) => tahun + 544;

const mapNormalisasi = [
  [/^tahun baru.*?(\d{4})/i, (_, y) => `Tahun Baru ${y} Masehi`],
  [/^isra/i, () => "Isra Mikraj Nabi Muhammad S.A.W."],
  [/^imlek/i, (_, __, tahun) => `Tahun Baru Imlek ${kongzili(tahun)} Kongzili`],
  [/.*nyepi/i, (_, __, tahun) => `Hari Suci Nyepi (Tahun Baru Saka ${saka(tahun)})`],
  [/idul fitri/i, () => `Hari Raya Idul Fitri ${hijriyah} Hijriyah`],
  [/idul adha/i, () => `Hari Raya Idul Adha ${hijriyah} Hijriyah`],
  [/maulid/i, () => "Maulid Nabi Muhammad S.A.W."],
  [/muharam/i, () => `1 Muharam Tahun Baru Islam ${hijriyah + 1} Hijriyah`],
  [/waisak/i, (_, __, tahun) => `Hari Raya Waisak ${buddhist(tahun)} BE`],
  [/wafat/i, () => "Wafat Yesus Kristus"],
  [/paskah/i, () => "Hari Paskah (Kebangkitan Yesus Kristus)"],
  [/kenaikan/i, () => "Kenaikan Yesus Kristus"],
  [/natal/i, () => "Kelahiran Yesus Kristus (Natal)"],
  [/buruh/i, () => "Hari Buruh Internasional"],
  [/pancasila/i, () => "Hari Lahir Pancasila"],
  [/kemerdekaan.*?(\d+)/i, (_, n) => `Proklamasi Kemerdekaan Ke-${n}`],
  [/cuti/i, (m) => `Cuti Bersama ${m}`]
];

function normalisasi(summary, tahun) {
  for (const [regex, replacer] of mapNormalisasi) {
    const match = summary.match(regex);
    if (match) return replacer(match[0], match[1], tahun);
  }
  return null;
}

function fetchLibur(tahun) {
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
          const hasil = [];

          for (const item of items) {
            const ketAsli = item.summary?.trim();
            const tanggal = item.start?.date;
            if (!ketAsli || !tanggal) continue;

            const ketNormal = normalisasi(ketAsli, new Date(tanggal).getFullYear());
            if (ketNormal) {
              hasil.push({ Keterangan: ketNormal, Tanggal: tanggal });
            }
          }

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
      const data = await fetchLibur(tahun);
      if (!data.length) throw new Error("Data dari Google Calendar kosong");

      fs.mkdirSync("data", { recursive: true });
      const file = path.join("data", `${tahun}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`✅ Disimpan ke ${file}`);
    } catch (err) {
      console.warn(`⚠️ Gagal Google Calendar: ${err.message}`);
      console.log(`🔁 Menjalankan fallback: script/python.py ${tahun}`);
      const { spawnSync } = require("child_process");
      const res = spawnSync("python3", ["script/python.py", tahun], {
        stdio: "inherit",
      });
      if (res.status !== 0) {
        console.error(`❌ Gagal fallback script Python untuk ${tahun}`);
        process.exit(1);
      }
    }
  }
})();
