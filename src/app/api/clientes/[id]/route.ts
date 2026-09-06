import { prisma } from "@/lib/prisma";

const num = (v: unknown) => (v != null && v !== "" ? Number(v) : null);

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(id) } });
  if (!cliente) return new Response("Cliente no encontrado", { status: 404 });

  const b = await req.json();
  const data: { nombre?: string; km?: number | null; activo?: boolean } = {};

  if (b.nombre != null) {
    const nombre = String(b.nombre).trim();
    if (!nombre) return new Response("El nombre no puede quedar vacío", { status: 400 });
    if (nombre !== cliente.nombre) {
      const dup = await prisma.cliente.findUnique({ where: { nombre } });
      if (dup) return new Response("Ya existe un cliente con ese nombre", { status: 409 });
    }
    data.nombre = nombre;
  }
  if (b.km !== undefined) data.km = num(b.km);
  if (b.activo != null) data.activo = Boolean(b.activo);

  const renombra = data.nombre != null && data.nombre !== cliente.nombre;
  const upd = await prisma.$transaction(async (tx) => {
    const c = await tx.cliente.update({ where: { id: Number(id) }, data });
    // Si se renombra, mantener los partes existentes apuntando al nombre nuevo.
    if (renombra) await tx.parte.updateMany({ where: { cliente: cliente.nombre }, data: { cliente: data.nombre } });
    return c;
  });
  return Response.json(upd);
}
