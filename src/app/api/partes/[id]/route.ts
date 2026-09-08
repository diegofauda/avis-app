import { prisma } from "@/lib/prisma";
import { rangoMes, mesActual, fechaCerrada } from "@/lib/data";

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

  // Período cerrado: bloquea a todos (Fernando incluido) hasta reabrir.
  if (await fechaCerrada(parte.fecha)) {
    return new Response("El período está cerrado. Reabrilo desde el consolidado para editar.", { status: 403 });
  }

  const b = await req.json();

  // Admin (Fernando) edita cualquier mes; un vet solo su propio parte del mes en curso.
  const actorVet = b.actor ? await prisma.veterinario.findUnique({ where: { abreviado: String(b.actor) } }) : null;
  const esAdmin = b.from === "fernando" || !!actorVet?.esAdmin;
  if (!esAdmin) {
    if (b.actor !== parte.vete) return new Response("No autorizado para editar este evento", { status: 403 });
    if (!esMesActual(parte.fecha)) return new Response("Solo se pueden editar eventos del mes en curso", { status: 403 });
  }

  const nuevaFecha = b.fecha ? new Date(b.fecha) : parte.fecha;
  if (!esAdmin && !esMesActual(nuevaFecha)) return new Response("La fecha debe quedar en el mes en curso", { status: 403 });
  if (b.fecha && nuevaFecha.getTime() !== parte.fecha.getTime() && await fechaCerrada(nuevaFecha)) {
    return new Response("La nueva fecha cae en un período cerrado.", { status: 403 });
  }

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
      // horas/tactos NO se editan en la app (los carga Kunfi en el Excel) → se preservan.
      tactos: esLibre ? null : parte.tactos,
      horas: esLibre ? null : parte.horas,
      turno: (esLibre && Math.trunc(Number(b.libre)) === 2) ? null : (b.turno != null ? (b.turno ? String(b.turno) : null) : parte.turno),
      compartida: esLibre ? false : !!b.compartida,
      doble: esLibre ? false : !!b.doble,
      camioneta: b.camioneta != null ? (b.camioneta ? String(b.camioneta) : null) : parte.camioneta,
      comentario: b.comentario != null ? (b.comentario ? String(b.comentario) : null) : parte.comentario,
    },
  });
  return Response.json(upd);
}

// Borrado lógico (anular): mismas reglas que editar (mes en curso / admin, no cerrado).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parte = await prisma.parte.findUnique({ where: { id: Number(id) } });
  if (!parte) return new Response("No encontrado", { status: 404 });

  if (await fechaCerrada(parte.fecha)) {
    return new Response("El período está cerrado. Reabrilo para eliminar.", { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  const actorVet = b.actor ? await prisma.veterinario.findUnique({ where: { abreviado: String(b.actor) } }) : null;
  const esAdmin = b.from === "fernando" || !!actorVet?.esAdmin;
  if (!esAdmin) {
    if (b.actor !== parte.vete) return new Response("No autorizado para eliminar este evento", { status: 403 });
    if (!esMesActual(parte.fecha)) return new Response("Solo se pueden eliminar eventos del mes en curso", { status: 403 });
  }

  await prisma.parte.update({ where: { id: Number(id) }, data: { anulado: true } });
  return Response.json({ ok: true });
}
