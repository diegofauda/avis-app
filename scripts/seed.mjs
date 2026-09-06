import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const VETS = Array.from({ length: 9 }, (_, i) => ({ nombre: `Veterinario ${i + 1}`, celular: "" }));
const PRODUCTORES = [
  { nombre: "Cravero M - Suardi", km: 45, costoMovilidad: 18000, zona: "Centro" },
  { nombre: "Don Mario", km: 60, costoMovilidad: 24000, zona: "Centro" },
  { nombre: "Magnano", km: 30, costoMovilidad: 12000, zona: "Centro" },
  { nombre: "Ifigenia-Palmares", km: 52, costoMovilidad: 20000, zona: "Centro" },
  { nombre: "Productor Ejemplo 5", km: 25, costoMovilidad: 10000, zona: "Centro" },
];
const TRABAJOS = ["Tacto", "Ecografía", "Diagnóstico de preñez", "IATF", "Sincronización", "Parto / Asistencia", "Cirugía", "Sanidad / Vacunación", "Consulta clínica", "Necropsia", "Asesoramiento", "Otros"];
const CAMIONETAS = ["Estudio AVIS", ...VETS.map((v) => v.nombre)];

async function main() {
  for (const v of VETS) await prisma.veterinario.upsert({ where: { nombre: v.nombre }, update: v, create: v });
  for (const p of PRODUCTORES) await prisma.productor.upsert({ where: { nombre: p.nombre }, update: p, create: p });
  for (let i = 0; i < TRABAJOS.length; i++) {
    const nombre = TRABAJOS[i];
    await prisma.tipoTrabajo.upsert({ where: { nombre }, update: { orden: i }, create: { nombre, orden: i } });
  }
  for (const nombre of CAMIONETAS) await prisma.camioneta.upsert({ where: { nombre }, update: {}, create: { nombre } });

  await prisma.parte.deleteMany({});
  await prisma.parte.createMany({
    data: [
      { fecha: new Date("2026-09-01"), veterinario: "Veterinario 1", productor: "Cravero M - Suardi", trabajo: "Tacto", horas: 2, camioneta: "Estudio AVIS", km: 45, costoMovilidad: 18000, comentario: "Ejemplo" },
      { fecha: new Date("2026-09-01"), veterinario: "Veterinario 2", productor: "Magnano", trabajo: "IATF", horas: 3.5, camioneta: "Veterinario 2", km: 30, costoMovilidad: 12000, comentario: "" },
      { fecha: new Date("2026-09-02"), veterinario: "Veterinario 1", productor: "Don Mario", trabajo: "Cirugía", horas: 1.5, camioneta: "Estudio AVIS", km: 60, costoMovilidad: 24000, comentario: "" },
    ],
  });
  console.log("Seed OK:", VETS.length, "vets,", PRODUCTORES.length, "productores,", TRABAJOS.length, "trabajos,", CAMIONETAS.length, "camionetas, 3 partes ejemplo");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
