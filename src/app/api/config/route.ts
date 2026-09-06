import { prisma } from "@/lib/prisma";
import { getConfig, getConfigMes } from "@/lib/data";

export async function GET() {
  return Response.json(await getConfig());
}

const CONSTANTES = ["precioGasoil", "precioLeche", "litrosPorKm", "pozoMovilidad", "precioTrabajo", "precioMovilidad", "precioTacto"] as const;

export async function POST(req: Request) {
  const b = await req.json();

  // Próximo remito: global (no es mensual).
  if (b.proximoRemito != null && b.proximoRemito !== "") {
    const pr = Math.trunc(Number(b.proximoRemito));
    if (Number.isFinite(pr)) await prisma.config.update({ where: { id: 1 }, data: { proximoRemito: pr } });
  }

  // Constantes del mes: se guardan en el histórico ConfigMes.
  const mes = String(b.mes ?? "");
  if (/^\d{4}-\d{2}$/.test(mes)) {
    const eff = await getConfigMes(mes); // base para completar campos no enviados
    const full: Record<string, number> = {
      precioGasoil: eff.precioGasoil, precioLeche: eff.precioLeche, litrosPorKm: eff.litrosPorKm,
      pozoMovilidad: eff.pozoMovilidad, precioTrabajo: eff.precioTrabajo, precioMovilidad: eff.precioMovilidad, precioTacto: eff.precioTacto,
    };
    for (const k of CONSTANTES) {
      if (b[k] != null && b[k] !== "") { const n = Number(b[k]); if (Number.isFinite(n)) full[k] = n; }
    }
    await prisma.configMes.upsert({ where: { mes }, create: { mes, ...full }, update: full });
  }

  return Response.json({ ok: true });
}
