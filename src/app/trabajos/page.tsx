import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AvisLogo from "@/components/AvisLogo";
import AdminOnly from "@/components/AdminOnly";
import TrabajosTable from "@/components/TrabajosTable";

export const dynamic = "force-dynamic";

export default async function TrabajosPage() {
  const [trabajos, vets] = await Promise.all([
    prisma.tipoTrabajo.findMany({ orderBy: { nombre: "asc" } }),
    prisma.veterinario.findMany({ where: { esAdmin: true }, select: { abreviado: true } }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-white border-b-2 border-blue-700 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AvisLogo size={42} />
            <div className="leading-tight">
              <div className="text-lg font-bold text-slate-900">AVIS · Agenda de Trabajos</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Lista de trabajos — Fernando</div>
            </div>
          </div>
          <nav className="flex gap-3 text-sm font-medium">
            <Link href="/movilidad" className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">Movilidad</Link>
            <Link href="/fernando" className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">← Consolidado</Link>
          </nav>
        </div>
      </header>

      <AdminOnly admins={vets.map((v) => v.abreviado)}>
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-800">Lista de trabajos</h1>
          <p className="mt-1 text-sm text-slate-500">Los que aparecen para buscar en la carga. Agregá, renombrá o desactivá los que ya no usan.</p>
          <TrabajosTable trabajos={trabajos} />
        </div>
      </AdminOnly>
    </main>
  );
}
