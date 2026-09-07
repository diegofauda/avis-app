import { prisma } from "@/lib/prisma";

export async function GET() {
  const trabajos = await prisma.tipoTrabajo.findMany({ orderBy: { nombre: "asc" } });
  return Response.json(trabajos);
}

export async function POST(req: Request) {
  const b = await req.json();
  const nombre = b.nombre ? String(b.nombre).trim() : "";
  if (!nombre) return new Response("Falta el nombre del trabajo", { status: 400 });
  const existe = await prisma.tipoTrabajo.findUnique({ where: { nombre } });
  if (existe) return new Response("Ya existe ese trabajo", { status: 409 });
  const t = await prisma.tipoTrabajo.create({ data: { nombre, activo: b.activo != null ? Boolean(b.activo) : true } });
  return Response.json(t, { status: 201 });
}
