// Cruza el Excel real de Fernando (JULIO) contra lo que tiene la app, remito por remito.
// Prueba de que la app reproduce lo mismo.
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const XLSX = "C:/Users/diego/Dropbox/Z_TRABAJO ESTUDIO AVIS/TRABAJOS AVIS 2026/TRABAJOS AVIS JULIO 26.xlsx";
const prisma = new PrismaClient();
const COL = { remito: 1, fecha: 2, vete: 3, libre: 4, cliente: 5, desc: 6, gavet: 7, gasoil: 8, tactos: 9, movleche: 10, comentario: 11 };

const raw = (c) => (c.result !== undefined ? c.result : c.value);
const norm = (v) => (v == null ? "" : String(v).trim().replace(/\s+/g, " ").toUpperCase());
const nnum = (v) => { if (v == null || v === "") return null; const n = Number(v); return isNaN(n) ? null : n; };
const eqNum = (a, b, tol = 0.01) => { if (a == null && b == null) return true; if (a == null || b == null) return false; return Math.abs(a - b) <= tol; };
const fFecha = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${String(d.getUTCFullYear()).slice(2)}`;
const parseFecha = (v) => { if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())); if (typeof v === "string" && v.includes(".")) { const [d, m, y] = v.split(".").map((x) => parseInt(x, 10)); return new Date(Date.UTC(y < 100 ? 2000 + y : y, m - 1, d)); } return null; };

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const ws = wb.worksheets[0];

  const db = await prisma.parte.findMany({ where: { remito: { gte: 17036, lte: 17776 } } });
  const byRem = new Map(db.map((p) => [p.remito, p]));
  const cfg = await prisma.config.findUnique({ where: { id: 1 } });
  const factorMov = cfg.precioGasoil / cfg.precioLeche;

  let filas = 0, faltantes = 0;
  const difs = { fecha: 0, vete: 0, cliente: 0, descripcion: 0, gavet: 0, gasoil: 0, tactos: 0, comentario: 0, movleche: 0 };
  const ejemplos = [];

  for (let r = 3; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rem = nnum(raw(row.getCell(COL.remito)));
    if (rem == null) continue;
    filas++;
    const p = byRem.get(Math.trunc(rem));
    if (!p) { faltantes++; if (ejemplos.length < 15) ejemplos.push(`remito ${rem}: NO está en la app`); continue; }

    const xls = {
      fecha: (() => { const f = parseFecha(raw(row.getCell(COL.fecha))); return f ? fFecha(f) : "?"; })(),
      vete: norm(raw(row.getCell(COL.vete))),
      cliente: norm(raw(row.getCell(COL.cliente))),
      descripcion: norm(raw(row.getCell(COL.desc))),
      gavet: nnum(raw(row.getCell(COL.gavet))),
      gasoil: nnum(raw(row.getCell(COL.gasoil))),
      tactos: nnum(raw(row.getCell(COL.tactos))),
      comentario: norm(raw(row.getCell(COL.comentario))),
      movleche: nnum(raw(row.getCell(COL.movleche))),
    };
    const app = {
      fecha: fFecha(p.fecha), vete: norm(p.vete), cliente: norm(p.cliente), descripcion: norm(p.descripcion),
      gavet: p.gavet, gasoil: p.gasoil, tactos: p.tactos, comentario: norm(p.comentario),
      movleche: (p.gasoil ?? 0) * factorMov,
    };

    // Typo conocido en el Excel original: remito 17382 tenía año 2002; se corrigió a 2026 en la app.
    const TYPOS_FECHA = new Set([17382]);
    const problemas = [];
    if (xls.fecha !== app.fecha && !TYPOS_FECHA.has(Math.trunc(rem))) { difs.fecha++; problemas.push(`fecha ${xls.fecha}≠${app.fecha}`); }
    if (xls.vete !== app.vete) { difs.vete++; problemas.push(`vete ${xls.vete}≠${app.vete}`); }
    if (xls.cliente !== app.cliente) { difs.cliente++; problemas.push(`cliente "${xls.cliente}"≠"${app.cliente}"`); }
    if (xls.descripcion !== app.descripcion) { difs.descripcion++; problemas.push(`desc`); }
    if (!eqNum(xls.gavet, app.gavet)) { difs.gavet++; problemas.push(`gavet ${xls.gavet}≠${app.gavet}`); }
    if (!eqNum(xls.gasoil, app.gasoil)) { difs.gasoil++; problemas.push(`gasoil ${xls.gasoil}≠${app.gasoil}`); }
    if (!eqNum(xls.tactos, app.tactos)) { difs.tactos++; problemas.push(`tactos ${xls.tactos}≠${app.tactos}`); }
    if (xls.comentario !== app.comentario) { difs.comentario++; problemas.push(`coment`); }
    if (!eqNum(xls.movleche, app.movleche, 0.02)) { difs.movleche++; problemas.push(`movleche ${xls.movleche}≠${app.movleche?.toFixed(2)}`); }
    if (problemas.length && ejemplos.length < 15) ejemplos.push(`remito ${rem}: ${problemas.join(" | ")}`);
  }

  const totalDif = Object.values(difs).reduce((a, b) => a + b, 0);
  console.log(`\n=== COMPARACIÓN JULIO: Excel de Fernando vs App ===`);
  console.log(`Filas en el Excel: ${filas}`);
  console.log(`Remitos faltantes en la app: ${faltantes}`);
  console.log(`Diferencias por columna:`, JSON.stringify(difs));
  console.log(`Total de celdas con diferencia: ${totalDif}`);
  if (ejemplos.length) { console.log(`\nEjemplos:`); ejemplos.forEach((e) => console.log("  ", e)); }
  else console.log(`\n✓ Coincidencia perfecta: todos los remitos y columnas dan igual.`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
