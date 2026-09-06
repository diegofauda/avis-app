// Importa un Excel mensual de Fernando (Hoja1/GENERAL) a la base, tal cual.
// Uso: node scripts/import-mes.mjs "<ruta xlsx>" [anioEsperado=2026]
// Idempotente en el rango de remitos del propio archivo. Corrige typos de año.
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const XLSX = process.argv[2];
const ANIO = parseInt(process.argv[3] || "2026", 10);
if (!XLSX) { console.error("Falta la ruta del xlsx"); process.exit(1); }
const prisma = new PrismaClient();

const COL = { remito: 1, fecha: 2, vete: 3, libre: 4, cliente: 5, desc: 6, gavet: 7, gasoil: 8, tactos: 9, comentario: 11 };
const raw = (c) => (c.result !== undefined ? c.result : c.value);
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return isNaN(n) ? null : n; };
const str = (v) => { if (v == null) return null; const s = String(v).trim(); return s === "" ? null : s; };

function parseFecha(v) {
  let d, m, y;
  if (v instanceof Date) { y = v.getUTCFullYear(); m = v.getUTCMonth() + 1; d = v.getUTCDate(); }
  else if (typeof v === "string" && v.includes(".")) { [d, m, y] = v.split(".").map((x) => parseInt(x, 10)); if (y != null && y < 100) y += 2000; }
  else return { fecha: null };
  if (!d || !m || !y) return { fecha: null };
  let typo = null;
  if (y !== ANIO) { typo = `año ${y}→${ANIO}`; y = ANIO; } // typo de año en workbook del año esperado
  const dt = new Date(Date.UTC(y, m - 1, d));
  return isNaN(dt.getTime()) ? { fecha: null } : { fecha: dt, typo };
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const ws = wb.worksheets[0];

  const partes = [], saltadas = [], typos = [];
  for (let r = 3; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const remito = num(raw(row.getCell(COL.remito)));
    if (remito == null) continue;
    const { fecha, typo } = parseFecha(raw(row.getCell(COL.fecha)));
    if (!fecha) { saltadas.push({ r, remito, fecha: raw(row.getCell(COL.fecha)) }); continue; }
    if (typo) typos.push({ remito: Math.trunc(remito), typo });
    const libreNum = num(raw(row.getCell(COL.libre)));
    const tactos = num(raw(row.getCell(COL.tactos)));
    const coment = str(raw(row.getCell(COL.comentario)));
    partes.push({
      remito: Math.trunc(remito), fecha,
      vete: str(raw(row.getCell(COL.vete))) ?? "?",
      libre: libreNum && libreNum > 0 ? Math.trunc(libreNum) : null,
      cliente: str(raw(row.getCell(COL.cliente))),
      descripcion: str(raw(row.getCell(COL.desc))),
      gavet: num(raw(row.getCell(COL.gavet))),
      gasoil: num(raw(row.getCell(COL.gasoil))),
      tactos: tactos == null ? null : Math.trunc(tactos),
      horas: null, camioneta: null,
      compartida: /COMP|MEDIA|1\/2/i.test(coment ?? ""),
      comentario: coment,
    });
  }

  const remitos = partes.map((p) => p.remito);
  const min = Math.min(...remitos), max = Math.max(...remitos);
  const del = await prisma.parte.deleteMany({ where: { remito: { gte: min, lte: max } } });
  for (const p of partes) await prisma.parte.create({ data: p });

  // proximoRemito = después del máximo global en la base
  const top = await prisma.parte.findFirst({ orderBy: { remito: "desc" } });
  await prisma.config.update({ where: { id: 1 }, data: { proximoRemito: top.remito + 1 } });

  console.log(`Archivo: ${XLSX.split(/[\\/]/).pop()}`);
  console.log(`Borrados previos en rango ${min}–${max}: ${del.count}`);
  console.log(`Importados: ${partes.length} partes`);
  console.log(`proximoRemito global: ${top.remito + 1}`);
  if (typos.length) { console.log(`Typos de año corregidos (${typos.length}):`); typos.forEach((t) => console.log("  ", JSON.stringify(t))); }
  if (saltadas.length) { console.log(`Saltadas por fecha ilegible (${saltadas.length}):`); saltadas.forEach((s) => console.log("  ", JSON.stringify(s))); }
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
