import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/data";
import AvisLogo from "@/components/AvisLogo";
import AdminOnly from "@/components/AdminOnly";
import MovilidadTable from "@/components/MovilidadTable";

export const dynamic = "force-dynamic";

export default async function MovilidadPage() {
  const [clientes, cfg, vets] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nombre: "asc" } }),
    getConfig(),
    prisma.veterinario.findMany({ where: { esAdmin: true } }),
  ]);
  const adminAbrevs = vets.map((v) => v.abreviado);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-white border-b-2 border-blue-700 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AvisLogo size={48} />
            <div className="leading-tight">
              <div className="text-lg font-bold text-slate-900">AVIS · Agenda de Trabajos</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Tabla de movilidad — Fernando</div>
            </div>
          </div>
          <nav className="flex gap-3 text-sm font-medium">
            <Link href="/config" className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">Configuración</Link>
            <Link href="/fernando" className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">← Consolidado</Link>
          </nav>
        </div>
      </header>

      <AdminOnly admins={adminAbrevs}>
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-800">Tabla de movilidad</h1>
          <p className="mt-1 text-sm text-slate-500">Agregá clientes, corregí los kilómetros o dá de baja los que ya no atienden. Los km se usan para calcular el gasoil de cada parte.</p>
          <MovilidadTable clientes={clientes} litrosPorKm={cfg.litrosPorKm} />
        </div>
      </AdminOnly>
    </main>
  );
}
