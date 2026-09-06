import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const g = (await prisma.config.findUnique({ where: { id: 1 } })) ?? {};
const base = { litrosPorKm: g.litrosPorKm ?? 0.25, pozoMovilidad: g.pozoMovilidad ?? 5500000, precioTrabajo: g.precioTrabajo ?? 900, precioMovilidad: g.precioMovilidad ?? 900, precioTacto: g.precioTacto ?? 1600 };
const meses = [
  { mes: "2026-07", precioGasoil: 2476, precioLeche: 513.87, ...base },
  { mes: "2026-08", precioGasoil: 2476, precioLeche: 522.11, ...base },
];
for (const m of meses) await prisma.configMes.upsert({ where: { mes: m.mes }, create: m, update: m });
const all = await prisma.configMes.findMany({ orderBy: { mes: "asc" } });
console.log("ConfigMes cargados:"); all.forEach(c => console.log(` ${c.mes}: gasoil ${c.precioGasoil} · leche ${c.precioLeche}`));
await prisma.$disconnect();
