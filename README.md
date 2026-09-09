# AVIS · Agenda de Trabajos

App interna del **Estudio Veterinario AVIS** (Suardi, Santa Fe) que reemplaza la agenda de papel de los veterinarios. Cada vet carga sus trabajos diarios desde el celular y todo se consolida en un solo lugar; a fin de período **Fernando descarga un único Excel** (GENERAL + una hoja por veterinario + la distribución de movilidad), listo para facturar.

En producción: **https://avis-app-beta.vercel.app**

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 16** (App Router + Turbopack) |
| UI | **React 19**, **TypeScript 5**, **Tailwind CSS 4** |
| API | Route Handlers de Next (`src/app/api/**`) — sin backend aparte |
| Auth | Login global por contraseña (cookie httpOnly) vía `src/proxy.ts` |
| Base de datos | **PostgreSQL** en **Neon** (serverless) |
| ORM | **Prisma 6** |
| Excel | **ExcelJS** (genera el workbook consolidado) |
| Hosting | **Vercel** (deploy automático en cada push a `main`) |
| App móvil | PWA instalable (`src/app/manifest.ts`) |

## Requisitos

- Node.js 20+
- Una base PostgreSQL (Neon). Se usan **dos ramas**: `production` (la que usa Vercel) y `dev` (para trabajar local sin tocar los datos reales).

## Puesta en marcha (local)

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear un archivo **`.env`** en la raíz (no se commitea) con la conexión a la rama **dev** de Neon:
   ```env
   DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"   # pooled
   DIRECT_URL="postgresql://.../neondb?sslmode=require"                # directo (sin -pooler)
   AVIS_PASSWORD="Avis*2026"                                           # contraseña del login (opcional; hay default)
   ```
3. Sincronizar el schema con la base:
   ```bash
   npx prisma db push
   ```
4. Levantar el server de desarrollo (queda en el puerto **3000**):
   ```bash
   npm run dev
   ```

> En Windows/PowerShell, si `npx` está bloqueado por la política de ejecución, usá `npx.cmd` en su lugar.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Server de desarrollo (`http://localhost:3000`) |
| `npm run build` | `prisma generate` + build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint |

### Scripts de datos (`scripts/*.mjs`, se corren con `node`)

| Script | Para qué |
|--------|----------|
| `import.mjs` | Importa clientes (movilidad) y veterinarios desde el Excel maestro |
| `import-mes.mjs "<xlsx>" [anio]` | Importa la hoja GENERAL de un mes (corrige typos de año) |
| `seed-trabajos.mjs` | Carga la lista de trabajos predefinidos |
| `seed-configmes.mjs` | Carga las constantes por mes (precio gasoil/leche, etc.) |
| `migrar-cierres.mjs` | Migra cierres viejos por mes (`CierreMes`) a rangos (`CierreRango`) |
| `limpiar-pruebas.mjs` | Borra partes de prueba (remito ≥ un umbral) |
| `comparar-julio.mjs` | Valida que la distribución generada dé igual a la de Fernando |

## Estructura

```
src/
  app/
    page.tsx           # Carga (form del veterinario)
    fernando/          # Consolidado (solo admin): filtro por fechas, controles, Excel
    parte/[id]/        # Editar / eliminar un evento
    movilidad/         # Tabla de clientes → km (solo admin)
    trabajos/          # Lista de trabajos predefinidos (solo admin)
    config/            # Constantes por mes (solo admin)
    login/             # Login global
    api/               # partes, export, cierre, clientes, trabajos, config, login
  components/          # ParteForm, MisPartes, DetallePartes, ConsolidadoControls, ...
  lib/                 # prisma, data (helpers de negocio), auth
  proxy.ts             # Middleware de auth (Next 16 renombró middleware→proxy)
prisma/schema.prisma   # Modelos
scripts/               # Importadores y utilidades (Node + Prisma + ExcelJS)
```

## Conceptos del dominio

- **Evento / Parte** (`Parte`): una fila del GENERAL. Puede ser un **trabajo** (cliente, descripción, turno AM/PM/TD, camioneta, movilidad) o un **día libre** (1 = medio, 2 = entero).
- **Remito**: número correlativo automático (`Config.proximoRemito`, dentro de una transacción).
- **Movilidad**: litros de gasoil calculados desde los km del cliente (`km × 2 × litrosPorKm`). En el Excel se convierte a litros de leche.
  - **Compartida** / **doble**: se marcan con un check. **No se calcula la mitad**: el Excel deja el monto completo y **pinta la celda** (amarillo = compartida, verde = doble) para que Fernando ajuste a mano.
- **Roles**: `Veterinario.esAdmin` (solo Fernando) ve el consolidado, movilidad, trabajos y configuración, y edita todo. Cada vet ve/edita solo lo suyo.
- **Cierre por rango** (`CierreRango`): Fernando cierra un **rango de fechas** (no necesariamente el mes calendario). Un evento dentro de un período cerrado queda bloqueado para editar/eliminar. **El cierre es el único candado**: mientras un período esté abierto, su dueño (o el admin) puede editarlo.
- **Constantes por mes** (`ConfigMes`): precios (gasoil, leche, etc.) históricos; al reproducir un período se usan los valores de ese mes (con arrastre del último cargado).
- **Zona horaria**: las fechas se guardan como día calendario (UTC-medianoche); los helpers usan `America/Argentina/Buenos_Aires`.

## Deploy

Push a `main` → **Vercel** buildea y despliega solo. Variables `DATABASE_URL` y `DIRECT_URL` (apuntando a la rama **production** de Neon) y `AVIS_PASSWORD` se configuran en Vercel → Settings → Environment Variables.

Cambios de **schema** en producción: aplicar `prisma db push` contra la rama `production` **antes** del push del código que lo usa.
