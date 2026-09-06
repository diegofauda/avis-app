import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const b = await req.json();
  const mes = String(b.mes ?? "");
  if (!/^\d{4}-\d{2}$/.test(mes)) return new Response("Mes inválido", { status: 400 });

  if (b.cerrar) {
    await prisma.cierreMes.upsert({ where: { mes }, create: { mes }, update: {} });
    return Response.json({ mes, cerrado: true });
  } else {
    await prisma.cierreMes.deleteMany({ where: { mes } });
    return Response.json({ mes, cerrado: false });
  }
}
