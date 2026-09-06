import { prisma } from "@/lib/prisma";

const num = (v: unknown) => (v != null && v !== "" ? Number(v) : null);

export async function GET() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" } });
  return Response.json(clientes);
}

export async function POST(req: Request) {
  const b = await req.json();
  const nombre = b.nombre ? String(b.nombre).trim() : "";
  if (!nombre) return new Response("Falta el nombre del cliente", { status: 400 });

  const existe = await prisma.cliente.findUnique({ where: { nombre } });
  if (existe) return new Response("Ya existe un cliente con ese nombre", { status: 409 });

  const cliente = await prisma.cliente.create({
    data: { nombre, km: num(b.km), activo: b.activo != null ? Boolean(b.activo) : true },
  });
  return Response.json(cliente, { status: 201 });
}
