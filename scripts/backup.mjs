// Backup de la base de AVIS: exporta todas las tablas a un JSON en Dropbox.
// Conexión: variable BACKUP_DATABASE_URL, o el archivo local C:\Claude\avis-backups\prod.url
// (fuera del repo y fuera de Dropbox, para no exponer la contraseña).
// Uso:  node scripts/backup.mjs      (o via la tarea programada backup-avis.bat)
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const URL_FILE = "C:/Claude/avis-backups/prod.url";
const OUT_DIR = "C:/Users/diego/Dropbox/avis-backups";
const KEEP = 30; // cuántas copias conservar (borra las más viejas)

const url = (process.env.BACKUP_DATABASE_URL || (fs.existsSync(URL_FILE) ? fs.readFileSync(URL_FILE, "utf8") : "")).trim();
if (!url) { console.error("❌ Falta la URL de la base: definí BACKUP_DATABASE_URL o creá " + URL_FILE); process.exit(1); }

// Tablas del schema (nombres de los delegates de Prisma).
const TABLAS = ["veterinario", "cliente", "tipoTrabajo", "config", "configMes", "cierreMes", "cierreRango", "parte"];

const p2 = (n) => String(n).padStart(2, "0");
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`; };

const prisma = new PrismaClient({ datasources: { db: { url } } });

const datos = {};
for (const t of TABLAS) datos[t] = await prisma[t].findMany();

fs.mkdirSync(OUT_DIR, { recursive: true });
const meta = {
  generadoEn: new Date().toISOString(),
  origen: url.replace(/:[^:@/]+@/, ":***@"), // enmascara la contraseña
  conteos: Object.fromEntries(TABLAS.map((t) => [t, datos[t].length])),
};
const file = path.join(OUT_DIR, `avis-${stamp()}.json`);
fs.writeFileSync(file, JSON.stringify({ meta, datos }, null, 2));

console.log("✅ Backup:", file);
console.log("   Registros:", JSON.stringify(meta.conteos));

// Rotación: conservar solo las últimas KEEP.
const previas = fs.readdirSync(OUT_DIR).filter((f) => /^avis-\d{8}-\d{4}\.json$/.test(f)).sort();
const sobran = previas.slice(0, Math.max(0, previas.length - KEEP));
for (const f of sobran) fs.unlinkSync(path.join(OUT_DIR, f));
if (sobran.length) console.log(`   Borradas ${sobran.length} copias viejas (se conservan ${KEEP}).`);

await prisma.$disconnect();
