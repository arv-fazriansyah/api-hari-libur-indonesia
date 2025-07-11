import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const { tahun } = req.query;

  if (!tahun || isNaN(tahun)) {
    return res.status(400).json({ error: "Query 'tahun' harus diberikan." });
  }

  const filePath = path.join(process.cwd(), "data", `${tahun}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Data untuk tahun ${tahun} tidak ditemukan.` });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.setHeader("Cache-Control", "s-maxage=86400"); // cache 1 hari
  return res.status(200).json(data);
}
