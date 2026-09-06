import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();
const MOV_FILE = process.argv[2];

// 9 veterinarios reales con la abreviatura canónica (la que usan las hojas del Excel)
const VETS = [
  { nombre: "Fernando", apellido: "Martino", abreviado: "F", orden: 1, esAdmin: true },
  { nombre: "Carlos", apellido: "Martino", abreviado: "C", orden: 2 },
  { nombre: "Javier", apellido: "Rui", abreviado: "J", orden: 3 },
  { nombre: "Agusto", apellido: "Briggiler", abreviado: "AG", orden: 4 },
  { nombre: "Andres", apellido: "Baima", abreviado: "AN", orden: 5 },
  { nombre: "Pablo", apellido: "Costamagna", abreviado: "PC", orden: 6 },
  { nombre: "Pablo", apellido: "Buraschi", abreviado: "PB", orden: 7 },
  { nombre: "Tomas", apellido: "Martino", abreviado: "T", orden: 8 },
  { nombre: "Juan Ignacio", apellido: "Martino", abreviado: "JU", orden: 9 },
];

async function main() {
  for (const v of VETS) await prisma.veterinario.upsert({ where: { abreviado: v.abreviado }, update: v, create: v });
  console.log("Veterinarios:", VETS.length);

  // Clientes desde la hoja MOVILIDAD
  let nCli = 0;
  if (MOV_FILE) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(MOV_FILE);
    const ws = wb.getWorksheet("MOVILIDAD");
    for (let r = 3; r <= ws.rowCount; r++) {
      const nombre = String(ws.getRow(r).getCell(1).value ?? "").trim();
      const kmRaw = ws.getRow(r).getCell(2).value;
      const km = typeof kmRaw === "number" ? kmRaw : (kmRaw?.result ?? null);
      if (!nombre || nombre.toUpperCase().includes("MOVILIDAD")) continue;
      await prisma.cliente.upsert({ where: { nombre }, update: { km }, create: { nombre, km } });
      nCli++;
    }
  }
  console.log("Clientes:", nCli);

  // Config (constantes de julio como default)
  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, proximoRemito: 17500, precioGasoil: 2476, precioLeche: 513.87, litrosPorKm: 0.25, gavetBase: 1720, pozoMovilidad: 5500000 },
  });

  // Partes de ejemplo (con gasoil calculado de la tabla)
  await prisma.parte.deleteMany({});
  const gasoilDe = async (nombre) => { const c = await prisma.cliente.findUnique({ where: { nombre } }); return c?.km != null ? c.km * 2 * 0.25 : null; };
  const ejemplos = [
    { remito: 17500, fecha: "2026-09-01", vete: "J", cliente: "ABANJA GATTINO", descripcion: "IATF VAQ", gavet: 200, tactos: null },
    { remito: 17501, fecha: "2026-09-01", vete: "PB", cliente: "BOSCAROL MARIANO 1", descripcion: "CAT y TBC 20 terneros", gavet: 80, tactos: null },
    { remito: 17502, fecha: "2026-09-02", vete: "C", cliente: "AGROSER LA JOYA", descripcion: "Tacto T4", gavet: null, tactos: 150 },
  ];
  for (const e of ejemplos) {
    await prisma.parte.create({ data: { ...e, fecha: new Date(e.fecha), gasoil: await gasoilDe(e.cliente) } });
  }
  await prisma.config.update({ where: { id: 1 }, data: { proximoRemito: 17503 } });
  console.log("Partes ejemplo: 3 · Config lista");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
