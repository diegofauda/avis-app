import { prisma } from "@/lib/prisma";
import { rangoMes } from "@/lib/data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vet = searchParams.get("vet");
  const mes = searchParams.get("mes");
  const desdeParam = searchParams.get("desde"); // "YYYY-MM-DD": trae fecha >= desde (para carga liviana)
  const where: Record<string, unknown> = { anulado: false };
  if (vet) where.vete = vet;
  if (mes) { const { desde, hasta } = rangoMes(mes); where.fecha = { gte: desde, lt: hasta }; }
  else if (desdeParam) where.fecha = { gte: new Date(desdeParam + "T00:00:00.000Z") };
  const partes = await prisma.parte.findMany({ where, orderBy: [{ fecha: "desc" }, { remito: "desc" }] });
  return Response.json(partes);
}

const num = (v: unknown) => (v != null && v !== "" ? Number(v) : null);

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.fecha || !b.vete) return new Response("Faltan fecha o veterinario", { status: 400 });
  const esLibre = b.libre != null && b.libre !== "" && Number(b.libre) > 0;
  if (!esLibre && !b.cliente) return new Response("Falta el cliente", { status: 400 });

  const parte = await prisma.$transaction(async (tx) => {
    const cfg = (await tx.config.findUnique({ where: { id: 1 } })) ?? (await tx.config.create({ data: { id: 1 } }));
    const remito = cfg.proximoRemito;

    let gasoil: number | null = num(b.gasoil);
    if (!esLibre && b.cliente) {
      const nombre = String(b.cliente).trim();
      let c = await tx.cliente.findUnique({ where: { nombre } });
      // Cliente nuevo (no está en la tabla de movilidad): lo damos de alta sin km.
      if (!c) c = await tx.cliente.create({ data: { nombre } });
      if (gasoil == null) gasoil = c.km != null ? c.km * 2 * cfg.litrosPorKm : null;
    }

    const created = await tx.parte.create({
      data: {
        remito,
        fecha: new Date(b.fecha),
        vete: String(b.vete),
        libre: esLibre ? Math.trunc(Number(b.libre)) : null,
        cliente: esLibre ? null : String(b.cliente).trim(),
        descripcion: b.descripcion ? String(b.descripcion) : null,
        gavet: esLibre ? null : num(b.gavet),
        gasoil: esLibre ? null : gasoil,
        tactos: esLibre ? null : (num(b.tactos) != null ? Math.trunc(num(b.tactos)!) : null),
        horas: esLibre ? null : num(b.horas),
        turno: (esLibre && Math.trunc(Number(b.libre)) === 2) ? null : (b.turno ? String(b.turno) : null),
        compartida: esLibre ? false : !!b.compartida,
        doble: esLibre ? false : !!b.doble,
        camioneta: b.camioneta ? String(b.camioneta) : null,
        comentario: b.comentario ? String(b.comentario) : null,
      },
    });
    await tx.config.update({ where: { id: 1 }, data: { proximoRemito: remito + 1 } });
    return created;
  });
  return Response.json(parte, { status: 201 });
}
