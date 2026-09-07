import { prisma } from "./prisma";

export async function getListas() {
  const [veterinarios, clientes, trabajos, cierresRaw, config] = await Promise.all([
    prisma.veterinario.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.tipoTrabajo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.cierreMes.findMany({ select: { mes: true } }),
    getConfig(),
  ]);
  return { veterinarios, clientes, trabajos, cierres: cierresRaw.map((c) => c.mes), config };
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

// Fecha de hoy en zona horaria de Argentina ("YYYY-MM-DD"). El server corre en UTC,
// así que sin esto a la noche AR "hoy" salta al día siguiente.
export function hoyISOArg() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

export function mesActual() {
  return hoyISOArg().slice(0, 7);
}
