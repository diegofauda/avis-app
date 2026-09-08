import { prisma } from "@/lib/prisma";

const isISO = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const d0 = (iso: string) => new Date(iso + "T00:00:00.000Z");
const masUnDia = (d: Date) => { const t = new Date(d); t.setUTCDate(t.getUTCDate() + 1); return t; };

// Contrato: { desde, hasta, cerrar }  (fechas ISO "YYYY-MM-DD", hasta INCLUSIVO).
// Internamente hasta se guarda EXCLUSIVO (día siguiente). Los rangos se mantienen sin solapar:
//   cerrar  → fusiona con todos los que tocan [desde, hastaExcl) en uno solo.
//   reabrir → borra los que tocan y recrea los sobrantes de izquierda/derecha (split).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!isISO(b.desde) || !isISO(b.hasta)) return new Response("Fechas inválidas", { status: 400 });

  const desde = d0(b.desde);
  const hasta = masUnDia(d0(b.hasta)); // exclusivo
  if (hasta <= desde) return new Response("Rango inválido", { status: 400 });

  if (b.cerrar) {
    // Al cerrar, absorbo también los rangos ADYACENTES (que se tocan en el borde) para fusionar todo.
    const tocan = await prisma.cierreRango.findMany({ where: { desde: { lte: hasta }, hasta: { gte: desde } } });
    const unionDesde = tocan.reduce((min, r) => (r.desde < min ? r.desde : min), desde);
    const unionHasta = tocan.reduce((max, r) => (r.hasta > max ? r.hasta : max), hasta);
    await prisma.$transaction([
      prisma.cierreRango.deleteMany({ where: { id: { in: tocan.map((r) => r.id) } } }),
      prisma.cierreRango.create({ data: { desde: unionDesde, hasta: unionHasta } }),
    ]);
    return Response.json({ cerrado: true });
  }

  // Reabrir: solo los rangos con solape REAL (no los que apenas tocan el borde); quito [desde, hasta)
  // y conservo los sobrantes de izquierda/derecha de cada uno.
  const tocan = await prisma.cierreRango.findMany({ where: { desde: { lt: hasta }, hasta: { gt: desde } } });
  const nuevos: { desde: Date; hasta: Date }[] = [];
  for (const r of tocan) {
    if (r.desde < desde) nuevos.push({ desde: r.desde, hasta: desde }); // sobrante izquierdo
    if (r.hasta > hasta) nuevos.push({ desde: hasta, hasta: r.hasta }); // sobrante derecho
  }
  await prisma.$transaction([
    prisma.cierreRango.deleteMany({ where: { id: { in: tocan.map((r) => r.id) } } }),
    ...nuevos.map((n) => prisma.cierreRango.create({ data: n })),
  ]);
  return Response.json({ cerrado: false });
}
