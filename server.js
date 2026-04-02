const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const ExcelJS = require("exceljs");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

 console.log("PGHOST:", process.env.PGHOST);
 console.log("PGUSER:", process.env.PGUSER);
 console.log("PGDATABASE:", process.env.PGDATABASE);
 console.log("PGPORT:", process.env.PGPORT);

const pool = new Pool({
   host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

function notFound(res, entity) {
  return res.status(404).json({ error: `${entity} nu a fost găsit(ă).` });
}

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, message: "Backend conectat la PostgreSQL" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// SANTIERE
app.get("/api/santiere", async (_req, res) => {
  try {
    const result = await query("SELECT id_santier, nume, locatie, data_start, data_sfarsit, status, created_at FROM santiere ORDER BY id_santier DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/santiere", async (req, res) => {
  try {
    const { nume, locatie, data_start, data_sfarsit, status } = req.body;
    if (!nume || !locatie) return res.status(400).json({ error: "Câmpurile nume și locatie sunt obligatorii." });

    const result = await query(
      "INSERT INTO santiere (nume, locatie, data_start, data_sfarsit, status) VALUES ($1, $2, $3, $4, COALESCE($5, 'activ')) RETURNING *",
      [nume, locatie, data_start || null, data_sfarsit || null, status || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/santiere/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nume, locatie, data_start, data_sfarsit, status } = req.body;
    const result = await query(
      "UPDATE santiere SET nume=$1, locatie=$2, data_start=$3, data_sfarsit=$4, status=$5 WHERE id_santier=$6 RETURNING *",
      [nume, locatie, data_start || null, data_sfarsit || null, status, id]
    );
    if (!result.rows.length) return notFound(res, "Șantierul");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/santiere/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM santiere WHERE id_santier=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Șantierul");
    res.json({ ok: true, message: "Șantier șters." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ECHIPE
app.get("/api/echipe", async (_req, res) => {
  try {
    const result = await query("SELECT id_echipa, nume, sef_echipa, telefon, descriere, created_at FROM echipe ORDER BY id_echipa DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/echipe", async (req, res) => {
  try {
    const { nume, sef_echipa, telefon, descriere } = req.body;
    if (!nume) return res.status(400).json({ error: "Câmpul nume este obligatoriu." });
    const result = await query(
      "INSERT INTO echipe (nume, sef_echipa, telefon, descriere) VALUES ($1, $2, $3, $4) RETURNING *",
      [nume, sef_echipa || null, telefon || null, descriere || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/echipe/:id", async (req, res) => {
  try {
    const { nume, sef_echipa, telefon, descriere } = req.body;
    const result = await query(
      "UPDATE echipe SET nume=$1, sef_echipa=$2, telefon=$3, descriere=$4 WHERE id_echipa=$5 RETURNING *",
      [nume, sef_echipa || null, telefon || null, descriere || null, req.params.id]
    );
    if (!result.rows.length) return notFound(res, "Echipa");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/echipe/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM echipe WHERE id_echipa=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Echipa");
    res.json({ ok: true, message: "Echipă ștearsă." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FURNIZORI
app.get("/api/furnizori", async (_req, res) => {
  try {
    const result = await query("SELECT id_furnizor, nume, persoana_contact, telefon, email, adresa, created_at FROM furnizori ORDER BY id_furnizor DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/furnizori", async (req, res) => {
  try {
    const { nume, persoana_contact, telefon, email, adresa } = req.body;
    if (!nume) return res.status(400).json({ error: "Câmpul nume este obligatoriu." });
    const result = await query(
      "INSERT INTO furnizori (nume, persoana_contact, telefon, email, adresa) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nume, persoana_contact || null, telefon || null, email || null, adresa || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/furnizori/:id", async (req, res) => {
  try {
    const { nume, persoana_contact, telefon, email, adresa } = req.body;
    const result = await query(
      "UPDATE furnizori SET nume=$1, persoana_contact=$2, telefon=$3, email=$4, adresa=$5 WHERE id_furnizor=$6 RETURNING *",
      [nume, persoana_contact || null, telefon || null, email || null, adresa || null, req.params.id]
    );
    if (!result.rows.length) return notFound(res, "Furnizorul");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/furnizori/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM furnizori WHERE id_furnizor=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Furnizorul");
    res.json({ ok: true, message: "Furnizor șters." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MATERIALE
app.get("/api/materiale", async (_req, res) => {
  try {
    const result = await query("SELECT m.id_material, m.denumire, m.categorie, m.unitate_masura, m.pret_unitar, m.stoc_curent, m.id_furnizor, f.nume AS furnizor FROM materiale m LEFT JOIN furnizori f ON f.id_furnizor = m.id_furnizor ORDER BY m.id_material DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/materiale", async (req, res) => {
  try {
    const { id_furnizor, denumire, categorie, unitate_masura, pret_unitar, stoc_curent } = req.body;
    if (!id_furnizor || !denumire || !unitate_masura) return res.status(400).json({ error: "id_furnizor, denumire și unitate_masura sunt obligatorii." });
    const result = await query(
      "INSERT INTO materiale (id_furnizor, denumire, categorie, unitate_masura, pret_unitar, stoc_curent) VALUES ($1, $2, $3, $4, COALESCE($5,0), COALESCE($6,0)) RETURNING *",
      [id_furnizor, denumire, categorie || null, unitate_masura, pret_unitar || 0, stoc_curent || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/materiale/:id", async (req, res) => {
  try {
    const { id_furnizor, denumire, categorie, unitate_masura, pret_unitar, stoc_curent } = req.body;
    const result = await query(
      "UPDATE materiale SET id_furnizor=$1, denumire=$2, categorie=$3, unitate_masura=$4, pret_unitar=$5, stoc_curent=$6 WHERE id_material=$7 RETURNING *",
      [id_furnizor, denumire, categorie || null, unitate_masura, pret_unitar || 0, stoc_curent || 0, req.params.id]
    );
    if (!result.rows.length) return notFound(res, "Materialul");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/materiale/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM materiale WHERE id_material=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Materialul");
    res.json({ ok: true, message: "Material șters." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PROIECTE
app.get("/api/proiecte", async (_req, res) => {
  try {
    const result = await query("SELECT p.id_proiect, p.nume, p.descriere, p.data_start, p.data_sfarsit, p.buget, p.status, p.id_santier, s.nume AS santier, p.id_echipa, e.nume AS echipa FROM proiecte p JOIN santiere s ON s.id_santier = p.id_santier JOIN echipe e ON e.id_echipa = p.id_echipa ORDER BY p.id_proiect DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/proiecte", async (req, res) => {
  try {
    const { id_santier, id_echipa, nume, descriere, data_start, data_sfarsit, buget, status } = req.body;
    if (!id_santier || !id_echipa || !nume) return res.status(400).json({ error: "id_santier, id_echipa și nume sunt obligatorii." });
    const result = await query(
      "INSERT INTO proiecte (id_santier, id_echipa, nume, descriere, data_start, data_sfarsit, buget, status) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'planificat')) RETURNING *",
      [id_santier, id_echipa, nume, descriere || null, data_start || null, data_sfarsit || null, buget || null, status || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/proiecte/:id", async (req, res) => {
  try {
    const { id_santier, id_echipa, nume, descriere, data_start, data_sfarsit, buget, status } = req.body;
    const result = await query(
      "UPDATE proiecte SET id_santier=$1, id_echipa=$2, nume=$3, descriere=$4, data_start=$5, data_sfarsit=$6, buget=$7, status=$8 WHERE id_proiect=$9 RETURNING *",
      [id_santier, id_echipa, nume, descriere || null, data_start || null, data_sfarsit || null, buget || null, status, req.params.id]
    );
    if (!result.rows.length) return notFound(res, "Proiectul");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/proiecte/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM proiecte WHERE id_proiect=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Proiectul");
    res.json({ ok: true, message: "Proiect șters." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UTILAJE
app.get("/api/utilaje", async (_req, res) => {
  try {
    const result = await query("SELECT id_utilaj, denumire, tip, serie, stare, cost_ora, created_at FROM utilaje ORDER BY id_utilaj DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/utilaje", async (req, res) => {
  try {
    const { denumire, tip, serie, stare, cost_ora } = req.body;
    if (!denumire) return res.status(400).json({ error: "Câmpul denumire este obligatoriu." });
    const result = await query(
      "INSERT INTO utilaje (denumire, tip, serie, stare, cost_ora) VALUES ($1,$2,$3,COALESCE($4,'disponibil'),COALESCE($5,0)) RETURNING *",
      [denumire, tip || null, serie || null, stare || null, cost_ora || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/utilaje/:id", async (req, res) => {
  try {
    const { denumire, tip, serie, stare, cost_ora } = req.body;
    const result = await query(
      "UPDATE utilaje SET denumire=$1, tip=$2, serie=$3, stare=$4, cost_ora=$5 WHERE id_utilaj=$6 RETURNING *",
      [denumire, tip || null, serie || null, stare || null, cost_ora || 0, req.params.id]
    );
    if (!result.rows.length) return notFound(res, "Utilajul");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/utilaje/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM utilaje WHERE id_utilaj=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Utilajul");
    res.json({ ok: true, message: "Utilaj șters." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ALOCARI UTILAJE
app.get("/api/alocari-utilaje", async (_req, res) => {
  try {
    const result = await query("SELECT a.id_alocare, a.id_utilaj, u.denumire AS utilaj, a.id_proiect, p.nume AS proiect, a.data_start, a.data_sfarsit, a.ore_folosite, a.observatii FROM alocari_utilaje a JOIN utilaje u ON u.id_utilaj = a.id_utilaj JOIN proiecte p ON p.id_proiect = a.id_proiect ORDER BY a.id_alocare DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/alocari-utilaje", async (req, res) => {
  try {
    const { id_utilaj, id_proiect, data_start, data_sfarsit, ore_folosite, observatii } = req.body;
    if (!id_utilaj || !id_proiect || !data_start) return res.status(400).json({ error: "id_utilaj, id_proiect și data_start sunt obligatorii." });
    const result = await query(
      "INSERT INTO alocari_utilaje (id_utilaj, id_proiect, data_start, data_sfarsit, ore_folosite, observatii) VALUES ($1,$2,$3,$4,COALESCE($5,0),$6) RETURNING *",
      [id_utilaj, id_proiect, data_start, data_sfarsit || null, ore_folosite || 0, observatii || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/alocari-utilaje/:id", async (req, res) => {
  try {
    const { id_utilaj, id_proiect, data_start, data_sfarsit, ore_folosite, observatii } = req.body;
    const result = await query(
      "UPDATE alocari_utilaje SET id_utilaj=$1, id_proiect=$2, data_start=$3, data_sfarsit=$4, ore_folosite=$5, observatii=$6 WHERE id_alocare=$7 RETURNING *",
      [id_utilaj, id_proiect, data_start, data_sfarsit || null, ore_folosite || 0, observatii || null, req.params.id]
    );
    if (!result.rows.length) return notFound(res, "Alocarea");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/alocari-utilaje/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM alocari_utilaje WHERE id_alocare=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Alocarea");
    res.json({ ok: true, message: "Alocare ștearsă." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CONSUM STOC
app.get("/api/consum-stoc", async (_req, res) => {
  try {
    const result = await query("SELECT cs.id_consum_stoc, cs.id_material, m.denumire AS material, cs.id_proiect, p.nume AS proiect, cs.tip_miscare, cs.cantitate, cs.cantitate_ajustare, cs.data_miscare, cs.document_referinta, cs.observatii, cs.created_at FROM consum_stoc cs JOIN materiale m ON m.id_material = cs.id_material LEFT JOIN proiecte p ON p.id_proiect = cs.id_proiect ORDER BY cs.id_consum_stoc DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/consum-stoc", async (req, res) => {
  try {
    const { id_material, id_proiect, tip_miscare, cantitate, cantitate_ajustare, data_miscare, document_referinta, observatii } = req.body;
    if (!id_material || !tip_miscare || !cantitate) return res.status(400).json({ error: "id_material, tip_miscare și cantitate sunt obligatorii." });
    const result = await query(
      "INSERT INTO consum_stoc (id_material, id_proiect, tip_miscare, cantitate, cantitate_ajustare, data_miscare, document_referinta, observatii) VALUES ($1,$2,$3,$4,$5,COALESCE($6,CURRENT_DATE),$7,$8) RETURNING *",
      [id_material, id_proiect || null, tip_miscare, cantitate, cantitate_ajustare || null, data_miscare || null, document_referinta || null, observatii || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/consum-stoc/:id", async (req, res) => {
  try {
    const { id_material, id_proiect, tip_miscare, cantitate, cantitate_ajustare, data_miscare, document_referinta, observatii } = req.body;
    const result = await query(
      "UPDATE consum_stoc SET id_material=$1, id_proiect=$2, tip_miscare=$3, cantitate=$4, cantitate_ajustare=$5, data_miscare=$6, document_referinta=$7, observatii=$8 WHERE id_consum_stoc=$9 RETURNING *",
      [id_material, id_proiect || null, tip_miscare, cantitate, cantitate_ajustare || null, data_miscare || null, document_referinta || null, observatii || null, req.params.id]
    );
    if (!result.rows.length) return notFound(res, "Mișcarea de stoc");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/consum-stoc/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM consum_stoc WHERE id_consum_stoc=$1 RETURNING *", [req.params.id]);
    if (!result.rows.length) return notFound(res, "Mișcarea de stoc");
    res.json({ ok: true, message: "Mișcare de stoc ștearsă." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DASHBOARD
app.get("/api/dashboard", async (_req, res) => {
  try {
    const [santiere, proiecte, materiale, utilaje, consumuri] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM santiere"),
      query("SELECT COUNT(*)::int AS total FROM proiecte"),
      query("SELECT COUNT(*)::int AS total, COALESCE(SUM(stoc_curent),0)::numeric AS stoc_total FROM materiale"),
      query("SELECT COUNT(*)::int AS total FROM utilaje"),
      query("SELECT COUNT(*)::int AS total FROM consum_stoc WHERE tip_miscare = 'iesire'")
    ]);

    res.json({
      santiere: santiere.rows[0].total,
      proiecte: proiecte.rows[0].total,
      materiale: materiale.rows[0].total,
      stoc_total: materiale.rows[0].stoc_total,
      utilaje: utilaje.rows[0].total,
      consumuri: consumuri.rows[0].total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EXPORT EXCEL
async function sendWorkbook(res, sheetName, rows, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  if (rows.length > 0) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 22 }));
    rows.forEach((row) => sheet.addRow(row));
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  await workbook.xlsx.write(res);
  res.end();
}

app.get("/api/export/proiecte.xlsx", async (_req, res) => {
  try {
    const result = await query('SELECT p.id_proiect AS "ID", p.nume AS "Proiect", s.nume AS "Santier", e.nume AS "Echipa", p.status AS "Status", COALESCE(p.buget,0) AS "Buget", p.data_start AS "Data start", p.data_sfarsit AS "Data sfarsit" FROM proiecte p JOIN santiere s ON s.id_santier = p.id_santier JOIN echipe e ON e.id_echipa = p.id_echipa ORDER BY p.id_proiect DESC');
    await sendWorkbook(res, "Proiecte", result.rows, "proiecte.xlsx");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/materiale.xlsx", async (_req, res) => {
  try {
    const result = await query('SELECT m.id_material AS "ID", m.denumire AS "Material", m.categorie AS "Categorie", f.nume AS "Furnizor", m.unitate_masura AS "UM", m.pret_unitar AS "Pret unitar", m.stoc_curent AS "Stoc curent" FROM materiale m LEFT JOIN furnizori f ON f.id_furnizor = m.id_furnizor ORDER BY m.id_material DESC');
    await sendWorkbook(res, "Materiale", result.rows, "materiale.xlsx");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/consum.xlsx", async (_req, res) => {
  try {
    const result = await query('SELECT cs.id_consum_stoc AS "ID", m.denumire AS "Material", p.nume AS "Proiect", cs.tip_miscare AS "Tip", cs.cantitate AS "Cantitate", cs.data_miscare AS "Data", cs.document_referinta AS "Document", cs.observatii AS "Observatii" FROM consum_stoc cs JOIN materiale m ON m.id_material = cs.id_material LEFT JOIN proiecte p ON p.id_proiect = cs.id_proiect ORDER BY cs.id_consum_stoc DESC');
    await sendWorkbook(res, "Consum", result.rows, "consum.xlsx");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Eroare internă de server." });
});

app.listen(port, () => {
  console.log(`Serverul rulează pe http://localhost:${port}`);
});

/*
Instalare:
npm install express cors pg exceljs

Export Excel:
http://localhost:3001/api/export/proiecte.xlsx
http://localhost:3001/api/export/materiale.xlsx
http://localhost:3001/api/export/consum.xlsx

Backup automat - exemplu backup_santier.bat:
@echo off
set PGPASSWORD=HellScream101
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h localhost -p 5433 -U postgres -d Gestiune_Santier -F c -f "D:\backup\gestiune_santier_%date:~-4,4%-%date:~3,2%-%date:~0,2%.backup"
*/
