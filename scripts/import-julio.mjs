// Importa el Excel real de Fernando (TRABAJOS AVIS JULIO 26) a la base, tal cual,
// para validar que la app reproduce lo mismo. Idempotente en el rango de remitos.
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const XLSX = "C:/Users/diego/Dropbox/Z_TRABAJO ESTUDIO AVIS/TRABAJOS AVIS 2026/TRABAJOS AVIS JULIO 26.xlsx";
const prisma = new PrismaClient();

// Mapeo por posición fija (los headers de la fila 2 están desalineados en col 10-12).
const COL = { remito: 1, fecha: 2, vete: 3, libre: 4, cliente: 5, desc: 6, gavet: 7, gasoil: 8, tactos: 9, comentario: 11 };

const raw = (cell) => (cell.result !== undefined ? cell.result : cell.value);
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return isNaN(n) ? null : n; };
const str = (v) => { if (v == null) return null; const s = String(v).trim(); return s === "" ? null : s; };

function parseFecha(v) {
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v === "string" && v.includes(".")) {
    const [d, m, y] = v.split(".").map((x) => parseInt(x, 10));
    if (!d || !m || !y) return null;
    const year = y < 100 ? 2000 + y : y;
    const dt = new Date(Date.UTC(year, m - 1, d));
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const ws = wb.worksheets[0];

  const partes = [];
  const saltadas = [];
  for (let r = 3; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const remito = num(raw(row.getCell(COL.remito)));
    if (remito == null) continue;
    const fecha = parseFecha(raw(row.getCell(COL.fecha)));
    if (!fecha) { saltadas.push({ r, remito, motivo: "fecha ilegible", fecha: raw(row.getCell(COL.fecha)) }); continue; }
    const libreNum = num(raw(row.getCell(COL.libre)));
    partes.push({
      remito: Math.trunc(remito),
      fecha,
      vete: str(raw(row.getCell(COL.vete))) ?? "?",
      libre: libreNum && libreNum > 0 ? Math.trunc(libreNum) : null,
      cliente: str(raw(row.getCell(COL.cliente))),
      descripcion: str(raw(row.getCell(COL.desc))),
      gavet: num(raw(row.getCell(COL.gavet))),
      gasoil: num(raw(row.getCell(COL.gasoil))),
      tactos: (() => { const t = num(raw(row.getCell(COL.tactos))); return t == null ? null : Math.trunc(t); })(),
      horas: null,
      camioneta: null,
      comentario: str(raw(row.getCell(COL.comentario))),
    });
  }

  const remitos = partes.map((p) => p.remito);
  const min = Math.min(...remitos), max = Math.max(...remitos);

  // Limpieza idempotente: borra todo en el rango de remitos de julio (incluye los 3 partes
  // de ejemplo de septiembre 17500-17502 que chocaban con remitos reales).
  const del = await prisma.parte.deleteMany({ where: { remito: { gte: min, lte: max } } });

  // Inserción
  let ok = 0;
  for (const p of partes) { await prisma.parte.create({ data: p }); ok++; }

  // Próximo remito real = después del último de julio
  await prisma.config.update({ where: { id: 1 }, data: { proximoRemito: max + 1 } });

  console.log(`Borrados previos en rango: ${del.count}`);
  console.log(`Importados: ${ok} partes (remitos ${min}–${max})`);
  console.log(`proximoRemito seteado en: ${max + 1}`);
  if (saltadas.length) { console.log(`Saltadas (${saltadas.length}):`); saltadas.forEach((s) => console.log("  ", JSON.stringify(s))); }
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
