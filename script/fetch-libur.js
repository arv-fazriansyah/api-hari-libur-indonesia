const fs = require('fs');
const path = require('path');
const https = require('https');

const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  console.error('Error: BASE_URL tidak ditemukan di environment variables / secrets');
  process.exit(1);
}

const START_YEAR = new Date().getFullYear();
const END_YEAR = START_YEAR + 5;
const TARGET_YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

const monthMap = {
  'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
  'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
  'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'
};

function fetchYear(year) {
  return new Promise((resolve) => {
    const url = `${baseUrl}/${year}`;

    https.get(url, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return resolve(null);

        const startIndex = html.indexOf(`Daftar Hari Libur Tahun ${year}`);
        if (startIndex === -1) return resolve(null);
        
        const content = html.substring(startIndex);
        const matches = content.match(/<span class=\"sr-only\">([^<]+)<\/span>/g);
        if (!matches) return resolve(null);

        const holidays = matches.map(item => {
          const text = item.replace(/<\/?span[^>]*>/g, '').trim();
          const parts = text.split(' - ');
          if (parts.length === 3) {
            const firstSpace = parts[0].indexOf(' ');
            const datePart = parts[0].substring(firstSpace + 1).trim();
            const [dayNum, monthName] = datePart.split(' ');
            const monthNum = monthMap[monthName];
            if (!monthNum) return null;
            const formattedDay = dayNum.padStart(2, '0');
            return {
              Keterangan: parts[1],
              Tanggal: `${year}-${monthNum}-${formattedDay}`
            };
          }
          return null;
        }).filter(Boolean);

        if (holidays.length > 0) {
          resolve({ tahun: year, data: holidays });
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const masterData = [];
  const dir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const year of TARGET_YEARS) {
    const result = await fetchYear(year);
    if (result) {
      fs.writeFileSync(path.join(dir, `${year}.json`), JSON.stringify(result.data, null, 2), 'utf-8');
      masterData.push(result);
    }
  }

  fs.writeFileSync(path.join(dir, 'master.json'), JSON.stringify(masterData, null, 2), 'utf-8');
  console.log('✅ Hari libur nasional berhasil diperbarui!');
})();
