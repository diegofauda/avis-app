import { prisma } from "@/lib/prisma";
import { rangoMes, mesActual } from "@/lib/data";

const num = (v: unknown) => (v != null && v !== "" ? Number(v) : null);
const esMesActual = (d: Date) => { const { desde, hasta } = rangoMes(mesActual()); return d >= desde && d < hasta; };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parte = await prisma.parte.findUnique({ where: { id: Number(id) } });
  if (!parte) return new Response("No encontrado", { status: 404 });
  return Response.json(parte);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parte = await prisma.parte.findUnique({ where: { id: Number(id) } });
  if (!parte) return new Response("No encontrado", { status: 404 });

  // Mes cerrado: bloquea a todos (Fernando incluido) hasta reabrir.
  const mesParte = parte.fecha.toISOString().slice(0, 7);
  if (await prisma.cierreMes.findUnique({ where: { mes: mesParte } })) {
    return new Response("El mes está cerrado. Reabrilo desde el consolidado para editar.", { status: 403 });
  }

  const b = await req.json();

  // Admin (Fernando) edita cualquier mes; un vet solo su propio parte del mes en curso.
  const actorVet = b.actor ? await prisma.veterinario.findUnique({ where: { abreviado: String(b.actor) } }) : null;
  const esAdmin = b.from === "fernando" || !!actorVet?.esAdmin;
  if (!esAdmin) {
    if (b.actor !== parte.vete) return new Response("No autorizado para editar este parte", { status: 403 });
    if (!esMesActual(parte.fecha)) return new Response("Solo se pueden editar partes del mes en curso", { status: 403 });
  }

  const nuevaFecha = b.fecha ? new Date(b.fecha) : parte.fecha;
  if (!esAdmin && !esMesActual(nuevaFecha)) return new Response("La fecha debe quedar en el mes en curso", { status: 403 });

  const esLibre = b.libre != null && b.libre !== "" && Number(b.libre) > 0;
  const cfg = (await prisma.config.findUnique({ where: { id: 1 } }))!;
  let gasoil: number | null = null;
  if (!esLibre && b.cliente) {
    const nombre = String(b.cliente).trim();
    let c = await prisma.cliente.findUnique({ where: { nombre } });
    if (!c) c = await prisma.cliente.create({ data: { nombre } });
    gasoil = c.km != null ? c.km * 2 * cfg.litrosPorKm : null;
  }

  const upd = await prisma.parte.update({
    where: { id: Number(id) },
    data: {
      fecha: nuevaFecha,
      libre: esLibre ? Math.trunc(Number(b.libre)) : null,
      cliente: esLibre ? null : (b.cliente ? String(b.cliente).trim() : parte.cliente),
      descripcion: b.descripcion != null ? String(b.descripcion) : parte.descripcion,
      gasoil: esLibre ? null : gasoil,
      tactos: esLibre ? null : (num(b.tactos) != null ? Math.trunc(num(b.tactos)!) : null),
      horas: esLibre ? null : num(b.horas),
      compartida: esLibre ? false : !!b.compartida,
      camioneta: b.camioneta != null ? (b.camioneta ? String(b.camioneta) : null) : parte.camioneta,
      comentario: b.comentario != null ? (b.comentario ? String(b.comentario) : null) : parte.comentario,
    },
  });
  return Response.json(upd);
}
