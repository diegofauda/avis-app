import { prisma } from "./prisma";

export async function getListas() {
  const [veterinarios, clientes, config] = await Promise.all([
    prisma.veterinario.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    getConfig(),
  ]);
  return { veterinarios, clientes, config };
}

export async function getConfig() {
  let c = await prisma.config.findUnique({ where: { id: 1 } });
  if (!c) c = await prisma.config.create({ data: { id: 1 } });
  return c;
}

// Constantes efectivas de un mes: las propias, o las del último mes anterior cargado
// (arrastre), o los valores globales por defecto. Reproduce un período con SUS valores.
export async function getConfigMes(mes: string) {
  const exacto = await prisma.configMes.findUnique({ where: { mes } });
  if (exacto) return { ...exacto, origen: "propio" as const };
  const previo = await prisma.configMes.findFirst({ where: { mes: { lte: mes } }, orderBy: { mes: "desc" } });
  if (previo) return { ...previo, origen: "arrastre" as const };
  const g = await getConfig();
  return {
    mes, precioGasoil: g.precioGasoil, precioLeche: g.precioLeche, litrosPorKm: g.litrosPorKm,
    pozoMovilidad: g.pozoMovilidad, precioTrabajo: g.precioTrabajo, precioMovilidad: g.precioMovilidad,
    precioTacto: g.precioTacto, actualizado: null as Date | null, origen: "default" as const,
  };
}

export async function mesCerrado(mes: string) {
  return !!(await prisma.cierreMes.findUnique({ where: { mes } }));
}

export function gasoilDeKm(km: number | null | undefined, litrosPorKm: number) {
  return km == null ? null : km * 2 * litrosPorKm;
}

export function rangoMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return { desde: new Date(Date.UTC(y, m - 1, 1)), hasta: new Date(Date.UTC(y, m, 1)) };
}

export function mesActual() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
