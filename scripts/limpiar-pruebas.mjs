// Borra los partes de PRUEBA (remito >= 18443, o sea después del último real de agosto)
// y deja proximoRemito en 18443. Reusable: correlo cuando quieras limpiar.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DESDE = 18443;
const del = await prisma.parte.deleteMany({ where: { remito: { gte: DESDE } } });
await prisma.config.update({ where: { id: 1 }, data: { proximoRemito: DESDE } });
console.log(`Partes de prueba borrados: ${del.count} | proximoRemito reseteado a ${DESDE}`);
await prisma.$disconnect();
