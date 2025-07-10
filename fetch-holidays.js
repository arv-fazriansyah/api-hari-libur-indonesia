const fs = require('fs');
const fetch = require('node-fetch');

const calendarId = 'id.indonesian%23holiday@group.v.calendar.google.com';
const apiKey = process.env.GOOGLE_API_KEY;

const thisYear = new Date().getFullYear();
const years = [thisYear, thisYear + 1];

(async () => {
  for (const year of years) {
    const timeMin = `${year}-01-01T00:00:00+07:00`;
    const timeMax = `${year}-12-31T23:59:59+07:00`;

    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`;

    console.log(`Fetching ${year} holidays...`);
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      console.warn(`No data found for ${year}`);
      continue;
    }

    const output = data.items
      .filter(e => e.start && e.start.date?.startsWith(`${year}`))
      .map(e => ({
        Keterangan: e.summary,
        Tanggal: e.start.date
      }));

    const dir = './data';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = `${dir}/${year}.json`;
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log(`Saved to ${filePath}`);
  }
})();
