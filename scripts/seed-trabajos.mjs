import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TRABAJOS = [
  "TACTO VQ", "TACTO VO+VS", "TACTO VO", "TACTO VS", "LEER TBC + TACTO", "LEER TBC", "TBC",
  "SANGRADO BPA", "SANGRADO ELISA", "NECROPSIA VACA", "NECROPSIA TORO", "NECROPSIA TRO",
  "PARTO", "FETOTOMIA", "CESÁREA", "DESVAZADO", "VER VACA", "VER TORO", "VOLVER A VER VACA",
  "VER TERNEROS", "VER VAQ", "CASTRAR", "CAT", "CIRUGÍA", "CHARLA", "UEL", "IATF", "SACAR DIB",
];

for (const nombre of TRABAJOS) {
  await prisma.tipoTrabajo.upsert({ where: { nombre }, update: {}, create: { nombre } });
}
const n = await prisma.tipoTrabajo.count();
console.log(`Trabajos en la base: ${n}`);
await prisma.$disconnect();
