import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const { tahun } = req.query;

  if (!tahun || isNaN(tahun)) {
    return res.status(400).json({ error: "Query ?tahun=2025 diperlukan dan harus berupa angka." });
  }

  const filePath = path.join(process.cwd(), "data", `${tahun}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Data tahun ${tahun} tidak ditemukan.` });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=86400");

  // Pretty print JSON
  res.status(200).end(JSON.stringify(data, null, 2));
}
