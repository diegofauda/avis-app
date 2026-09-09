// Restaura un backup JSON (de scripts/backup.mjs) a una base destino.
// ⚠️ DESTRUCTIVO: borra el contenido de las tablas del destino y lo reemplaza.
// Por seguridad NO usa la conexión del proyecto: exige la base destino explícita.
//
// Uso (PowerShell):
//   $env:RESTORE_DATABASE_URL="postgresql://.../neondb?sslmode=require"
//   node scripts/restore.mjs "C:\Users\diego\Dropbox\avis-backups\avis-YYYYMMDD-HHmm.json" --yes
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const file = process.argv[2];
const confirm = process.argv.includes("--yes");
const url = (process.env.RESTORE_DATABASE_URL || "").trim();

if (!file || !fs.existsSync(file)) { console.error("❌ Pasá el archivo de backup: node scripts/restore.mjs <archivo.json> --yes"); process.exit(1); }
if (!url) { console.error("❌ Definí RESTORE_DATABASE_URL con la base DESTINO (no usa la del proyecto por seguridad)."); process.exit(1); }
if (!confirm) { console.error("❌ Falta --yes. Es destructivo: reemplaza los datos del destino."); process.exit(1); }

const { meta, datos } = JSON.parse(fs.readFileSync(file, "utf8"));
console.log("Backup del:", meta?.generadoEn, "| origen:", meta?.origen);
console.log("Destino:", url.replace(/:[^:@/]+@/, ":***@"));

// Orden y nombre de tabla real (sin @@map en el schema → PascalCase).
const TABLAS = [
  ["veterinario", "Veterinario", true], ["cliente", "Cliente", true], ["tipoTrabajo", "TipoTrabajo", true],
  ["config", "Config", false], ["configMes", "ConfigMes", false], ["cierreMes", "CierreMes", false],
  ["cierreRango", "CierreRango", true], ["parte", "Parte", true],
];

const prisma = new PrismaClient({ datasources: { db: { url } } });

for (const [delegate, , ] of [...TABLAS].reverse()) await prisma[delegate].deleteMany({});
for (const [delegate, tabla, seq] of TABLAS) {
  const rows = datos[delegate] || [];
  if (rows.length) await prisma[delegate].createMany({ data: rows });
  // Reacomoda la secuencia del id autoincremental para que los próximos inserts no choquen.
  if (seq && rows.length) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tabla}"), 1))`
    );
  }
  console.log(`  ${delegate}: ${rows.length} restaurados`);
}

console.log("✅ Restauración terminada.");
await prisma.$disconnect();
