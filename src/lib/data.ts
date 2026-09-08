import { prisma } from "./prisma";

export type Rango = { desde: string; hasta: string }; // ISO "YYYY-MM-DD"; hasta EXCLUSIVO

export async function getListas() {
  const [veterinarios, clientes, trabajos, cierres, config] = await Promise.all([
    prisma.veterinario.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.tipoTrabajo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    getCierres(),
    getConfig(),
  ]);
  return { veterinarios, clientes, trabajos, cierres, config };
}

// Rangos cerrados (para pintar/grisar en el cliente). hasta se devuelve EXCLUSIVO en ISO.
export async function getCierres(): Promise<Rango[]> {
  const rows = await prisma.cierreRango.findMany({ orderBy: { desde: "asc" } });
  return rows.map((r) => ({ desde: r.desde.toISOString().slice(0, 10), hasta: r.hasta.toISOString().slice(0, 10) }));
}

// ¿La fecha (día calendario) cae dentro de algún período cerrado?
export async function fechaCerrada(fecha: Date): Promise<boolean> {
  return !!(await prisma.cierreRango.findFirst({ where: { desde: { lte: fecha }, hasta: { gt: fecha } } }));
}

// ¿El rango [desdeISO, hastaISO] (ambos inclusivos) está TODO cubierto por un cierre?
// Se usa para el estado del botón Cerrar/Reabrir del consolidado.
export async function rangoCerrado(desdeISO: string, hastaISO: string): Promise<boolean> {
  const desde = new Date(desdeISO + "T00:00:00.000Z");
  const hastaExcl = new Date(hastaISO + "T00:00:00.000Z"); hastaExcl.setUTCDate(hastaExcl.getUTCDate() + 1);
  return !!(await prisma.cierreRango.findFirst({ where: { desde: { lte: desde }, hasta: { gte: hastaExcl } } }));
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
