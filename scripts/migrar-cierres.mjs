// Migra los cierres viejos por mes (CierreMes) a cierres por rango de fechas (CierreRango).
// Cada mes "YYYY-MM" → rango [1° del mes, 1° del mes siguiente) (hasta EXCLUSIVO).
// Idempotente: no duplica si el rango ya existe. No borra CierreMes (queda como respaldo).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const meses = await prisma.cierreMes.findMany({ orderBy: { mes: "asc" } });
if (!meses.length) { console.log("No hay CierreMes para migrar."); await prisma.$disconnect(); process.exit(0); }

for (const { mes } of meses) {
  const [y, m] = mes.split("-").map(Number);
  const desde = new Date(Date.UTC(y, m - 1, 1));
  const hasta = new Date(Date.UTC(y, m, 1)); // exclusivo
  const yaHay = await prisma.cierreRango.findFirst({ where: { desde: { lte: desde }, hasta: { gte: hasta } } });
  if (yaHay) { console.log(` ${mes}: ya cubierto por un rango, se omite`); continue; }
  await prisma.cierreRango.create({ data: { desde, hasta } });
  console.log(` ${mes}: cerrado como rango ${desde.toISOString().slice(0, 10)} → ${hasta.toISOString().slice(0, 10)} (excl.)`);
}

const total = await prisma.cierreRango.findMany({ orderBy: { desde: "asc" } });
console.log(`\nCierreRango actuales (${total.length}):`);
total.forEach((r) => console.log(`  ${r.desde.toISOString().slice(0, 10)} → ${r.hasta.toISOString().slice(0, 10)} (excl.)`));
await prisma.$disconnect();
