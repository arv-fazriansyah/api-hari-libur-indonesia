const fs = require("fs");
const path = require("path");
const https = require("https");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = "id.indonesian%23holiday@group.v.calendar.google.com";

// Tahun ini dan tahun depan
const TARGET_YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

// Fungsi normalisasi nama libur
function normalisasi(ket) {
  const pairs = [
    [/tahun baru.*?(\d{4})/i, (_, tahun) => `Tahun Baru ${tahun} Masehi`],
    [/isra.*?/i, () => "Isra Mikraj Nabi Muhammad S.A.W."],
    [/imlek.*?(\d{4})?/i, (_, t) => `Tahun Baru Imlek ${t || "xxxx"} Kongzili`],
    [/nyepi.*?(\d{4})?/i, (_, saka) => `Hari Suci Nyepi (Tahun Baru Saka ${saka || "xxxx"})`],
    [/idul fitri/i, () => "Hari Raya Idul Fitri 1446 Hijriyah"],
    [/idul adha/i, () => "Hari Raya Idul Adha 1446 Hijriyah"],
    [/maulid/i, () => "Maulid Nabi Muhammad S.A.W."],
    [/muharam.*?(\d{4})?/i, (_, h) => `1 Muharam Tahun Baru Islam ${h || "xxxx"} Hijriyah`],
    [/waisak.*?(\d{4})?/i, (_, be) => `Hari Raya Waisak ${be || "xxxx"} BE`],
    [/wafat/i, () => "Wafat Yesus Kristus"],
    [/paskah/i, () => "Hari Paskah (Kebangkitan Yesus Kristus)"],
    [/kenaikan/i, () => "Kenaikan Yesus Kristus"],
    [/natal/i, () => "Kelahiran Yesus Kristus (Natal)"],
    [/buruh/i, () => "Hari Buruh Internasional"],
    [/pancasila/i, () => "Hari Lahir Pancasila"],
    [/kemerdekaan.*?(\d{1,2})?/i, (_, ke) => `Proklamasi Kemerdekaan Ke-${ke || "xx"}`],
  ];

  ket = ket.trim();
  for (const [regex, replacer] of pairs) {
    if (regex.test(ket)) {
      return ket.replace(regex, replacer).trim();
    }
  }

  return null;
}

// Ambil data dari Google Calendar
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

            // Lewatkan cuti bersama atau belum pasti
            if (/cuti bersama|belum pasti/i.test(ket)) return null;

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

// Main function
(async () => {
  for (const tahun of TARGET_YEARS) {
    try {
      console.log(`📅 Memproses tahun ${tahun}...`);
      const data = await fetchLibur(tahun);
      const file = path.join("data", `${tahun}.json`);
      fs.mkdirSync("data", { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`✅ Disimpan ke ${file}`);
    } catch (err) {
      console.error(`❌ Gagal mengambil data tahun ${tahun}:`, err);
    }
  }
})();
