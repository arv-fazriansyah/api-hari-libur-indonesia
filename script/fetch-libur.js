const fs = require("fs");
const path = require("path");
const https = require("https");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";

const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

// Regex dan pengganti untuk normalisasi
const liburMap = [
  [/tahun baru.*?(\d{4})/i, "Tahun Baru $1 Masehi"],
  [/isra.*?/i, "Isra Mikraj Nabi Muhammad S.A.W."],
  [/imlek.*?(\d{4})/i, "Tahun Baru Imlek $1 Kongzili"],
  [/nyepi.*?(\d{4})/i, "Hari Suci Nyepi (Tahun Baru Saka $1)"],
  [/idul fitri.*?(\d{4})?/i, "Hari Raya Idul Fitri 1446 Hijriyah"],
  [/idul adha.*?(\d{4})?/i, "Hari Raya Idul Adha 1446 Hijriyah"],
  [/maulid/i, "Maulid Nabi Muhammad S.A.W."],
  [/muharam.*?(\d{4})/i, "1 Muharam Tahun Baru Islam $1 Hijriyah"],
  [/waisak.*?(\d{4})/i, "Hari Raya Waisak $1 BE"],
  [/wafat/i, "Wafat Yesus Kristus"],
  [/paskah/i, "Hari Paskah (Kebangkitan Yesus Kristus)"],
  [/kenaikan/i, "Kenaikan Yesus Kristus"],
  [/natal/i, "Kelahiran Yesus Kristus (Natal)"],
  [/buruh/i, "Hari Buruh Internasional"],
  [/pancasila/i, "Hari Lahir Pancasila"],
  [/kemerdekaan.*?(\d{1,2})/i, "Proklamasi Kemerdekaan Ke-$1"]
];

function normalisasi(ket) {
  for (const [regex, pengganti] of liburMap) {
    if (regex.test(ket)) return ket.replace(regex, pengganti);
  }
  return null;
}

function fetchLibur(tahun) {
  return new Promise((resolve, reject) => {
    const timeMin = `${tahun}-01-01T00:00:00Z`;
    const timeMax = `${tahun}-12-31T23:59:59Z`;

    const url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`;

    https.get(url, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(raw);
          const hasil = (json.items || []).map((item) => {
            const ket = item.summary;
            const tgl = item.start?.date;
            const normal = normalisasi(ket);
            return normal ? { Keterangan: normal, Tanggal: tgl } : null;
          }).filter(Boolean);

          resolve(hasil);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

(async () => {
  for (const tahun of TARGET_YEARS) {
    console.log(`📅 Memproses tahun ${tahun}...`);
    const data = await fetchLibur(tahun);
    const file = path.join("data", `${tahun}.json`);
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`✅ Disimpan ke ${file}`);
  }
})();
