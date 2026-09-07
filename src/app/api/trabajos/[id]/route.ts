import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.tipoTrabajo.findUnique({ where: { id: Number(id) } });
  if (!t) return new Response("Trabajo no encontrado", { status: 404 });

  const b = await req.json();
  const data: { nombre?: string; activo?: boolean } = {};
  if (b.nombre != null) {
    const nombre = String(b.nombre).trim();
    if (!nombre) return new Response("El nombre no puede quedar vacío", { status: 400 });
    if (nombre !== t.nombre) {
      const dup = await prisma.tipoTrabajo.findUnique({ where: { nombre } });
      if (dup) return new Response("Ya existe ese trabajo", { status: 409 });
    }
    data.nombre = nombre;
  }
  if (b.activo != null) data.activo = Boolean(b.activo);

  const upd = await prisma.tipoTrabajo.update({ where: { id: Number(id) }, data });
  return Response.json(upd);
}
