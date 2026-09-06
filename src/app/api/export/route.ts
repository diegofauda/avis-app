import { prisma } from "@/lib/prisma";
import { rangoMes, mesActual, getConfigMes } from "@/lib/data";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ffmt = (d: Date) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${String(d.getUTCFullYear()).slice(2)}`;

// GASOIL es col 10, MOVILIDAD(lts leche) es col 12 (usados para pintar compartida/doble).
const COLS = [
  { h: "REMITO", w: 9 }, { h: "FECHA", w: 10 }, { h: "TURNO", w: 7 }, { h: "VETE", w: 7 }, { h: "LIBRE", w: 7 },
  { h: "CLIENTE", w: 26 }, { h: "DESCRIPCIÓN", w: 40 }, { h: "HORAS", w: 8 }, { h: "GAVET", w: 9 }, { h: "GASOIL", w: 9 },
  { h: "TACTOS", w: 9 }, { h: "MOVILIDAD (lts leche)", w: 18 }, { h: "COMENTARIO", w: 26 }, { h: "CAMIONETA", w: 18 },
];
const COL_GASOIL = 10, COL_MOVLECHE = 12;

type P = { remito: number; fecha: Date; turno: string | null; vete: string; libre: number | null; cliente: string | null; descripcion: string | null; horas: number | null; gavet: number | null; gasoil: number | null; tactos: number | null; comentario: string | null; camioneta: string | null; compartida: boolean; doble: boolean };

function hoja(wb: ExcelJS.Workbook, nombre: string, partes: P[], movLeche: (g: number | null) => number | null) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLS.map((c) => ({ header: c.h, width: c.w }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  head.height = 20;
  head.getCell(COL_GASOIL).note = "Amarillo = movilidad COMPARTIDA · Verde = DOBLE movilidad — revisar/ajustar a mano.";
  const amarillo: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE08A" } };
  const verde: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9BE7A0" } };
  for (const p of partes) {
    const row = ws.addRow([p.remito, ffmt(p.fecha), p.turno ?? "", p.vete, p.libre ?? "", p.cliente ?? "", p.descripcion ?? "",
      p.horas ?? "", p.gavet ?? "", p.gasoil ?? "", p.tactos ?? "", movLeche(p.gasoil) ?? "", p.comentario ?? "", p.camioneta ?? ""]);
    const fill = p.doble ? verde : p.compartida ? amarillo : null;
    if (fill) { row.getCell(COL_GASOIL).fill = fill; row.getCell(COL_MOVLECHE).fill = fill; }
  }
  return ws;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || mesActual();
  // Período por fechas opcional (from/to, YYYY-MM-DD) para reproducir un cierre real
  // que no coincide con el mes calendario. Si no viene, se usa el mes.
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const usaRango = !!(from && to);
  const desde = usaRango ? new Date(from + "T00:00:00.000Z") : rangoMes(mes).desde;
  const hasta = usaRango ? new Date(to + "T00:00:00.000Z") : rangoMes(mes).hasta;
  // Rango por REMITO: reproduce exactamente un cierre de Fernando (los meses se separan
  // por remito, no por fecha — las fechas se superponen entre cierres).
  const rdesde = Number(searchParams.get("rdesde")) || 0;
  const rhasta = Number(searchParams.get("rhasta")) || 0;
  const usaRemito = rdesde > 0 && rhasta > 0;

  const where = { anulado: false, ...(usaRemito ? { remito: { gte: rdesde, lte: rhasta } } : { fecha: { gte: desde, lt: hasta } }) };
  const partes = (await prisma.parte.findMany({ where, orderBy: [{ fecha: "asc" }, { remito: "asc" }] })) as P[];
  const vets = await prisma.veterinario.findMany({ where: { activo: true }, orderBy: { orden: "asc" } });

  // Constantes del mes correspondiente (histórico). Para rango por remito se deriva del
  // mes más frecuente entre los partes; si no, del mes pedido. Overridable por query.
  const mesCfg = usaRemito
    ? (() => { const c: Record<string, number> = {}; for (const p of partes) { const k = p.fecha.toISOString().slice(0, 7); c[k] = (c[k] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || mes; })()
    : mes;
  const cfg = await getConfigMes(mesCfg);
  const precioGasoil = Number(searchParams.get("precioGasoil")) || cfg.precioGasoil;
  const precioLeche = Number(searchParams.get("precioLeche")) || cfg.precioLeche;
  // Replica la fórmula de Fernando (=GASOIL*precioGasoil/precioLeche); gasoil en blanco = 0.
  const movLeche = (g: number | null) => ((g ?? 0) * precioGasoil) / precioLeche;

  const wb = new ExcelJS.Workbook();
  wb.creator = "AVIS";

  // GENERAL
  hoja(wb, "GENERAL", partes, movLeche);
  // Una hoja por veterinario
  for (const v of vets) hoja(wb, v.abreviado, partes.filter((p) => p.vete === v.abreviado), movLeche);

  // MOVILIDAD (distribución)
  const ws = wb.addWorksheet("MOVILIDAD");
  ws.columns = [
    { header: "VETE", width: 8 }, { header: "1/2 D LIBRE", width: 12 }, { header: "TRABAJO", width: 12 },
    { header: "MOVILIDAD", width: 12 }, { header: "Porcentaje", width: 12 }, { header: "VACAS TACTO", width: 13 },
    { header: "$ FACT EST", width: 14 }, { header: "HORAS MANEJ", width: 13 }, { header: "$ DISTRIB MOV", width: 15 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };

  const agg = vets.map((v) => {
    const ps = partes.filter((p) => p.vete === v.abreviado);
    const libre = ps.reduce((a, p) => a + (p.libre ?? 0), 0);
    const trabajo = ps.reduce((a, p) => a + (p.gavet ?? 0), 0);
    const movilidad = ps.reduce((a, p) => a + (p.gasoil ?? 0), 0);
    const tactos = ps.reduce((a, p) => a + (p.tactos ?? 0), 0);
    return { vete: v.abreviado, libre, trabajo, movilidad, tactos };
  });
  const totMov = agg.reduce((a, x) => a + x.movilidad, 0) || 1;
  for (const a of agg) {
    const pct = a.movilidad / totMov;
    ws.addRow([a.vete, a.libre, a.trabajo, a.movilidad, pct, a.tactos,
      a.trabajo * cfg.precioTrabajo + a.movilidad * cfg.precioMovilidad + a.tactos * cfg.precioTacto,
      (a.movilidad * 4) / 80 / 20, pct * cfg.pozoMovilidad]);
  }
  ws.getColumn(5).numFmt = "0.0%";
  ws.getColumn(7).numFmt = "$#,##0";
  ws.getColumn(9).numFmt = "$#,##0";
  const tot = ws.addRow(["TOTAL", agg.reduce((a, x) => a + x.libre, 0), agg.reduce((a, x) => a + x.trabajo, 0), totMov, 1, agg.reduce((a, x) => a + x.tactos, 0), "", "", cfg.pozoMovilidad]);
  tot.font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="TRABAJOS AVIS ${usaRemito ? `remitos ${rdesde}-${rhasta}` : usaRango ? `${from}_a_${to}` : mes}.xlsx"`,
    },
  });
}
