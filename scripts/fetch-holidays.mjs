// scripts/fetch-holidays.mjs
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = 'id.indonesian%23holiday@group.v.calendar.google.com';

const keywordFilter = [

];

function isRelevant(summary) {
  return keywordFilter.some(keyword =>
    summary.toLowerCase().includes(keyword.toLowerCase())
  );
}

function getYearRange() {
  const now = new Date();
  return [now.getFullYear(), now.getFullYear() + 1];
}

async function fetchHolidays(year) {
  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch data for ${year}: ${res.status}`);
  }

  const data = await res.json();
  const holidays = (data.items || []).map(item => {
    return {
      Keterangan: item.summary,
      Tanggal: item.start?.date
    };
  });

  return holidays.filter(h => isRelevant(h.Keterangan));
}

async function saveToFile(year, holidays) {
  const outDir = './data';
  await fs.mkdir(outDir, { recursive: true });
  const filepath = path.join(outDir, `${year}.json`);
  await fs.writeFile(filepath, JSON.stringify(holidays, null, 2), 'utf-8');
}

async function main() {
  const years = getYearRange();
  for (const year of years) {
    try {
      const holidays = await fetchHolidays(year);
      await saveToFile(year, holidays);
      console.log(`✔ Saved ${holidays.length} holidays for ${year}`);
    } catch (err) {
      console.error(`❌ Error for ${year}:`, err.message);
    }
  }
}

main();
