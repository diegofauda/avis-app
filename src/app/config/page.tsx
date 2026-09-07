import AdminNav from "@/components/AdminNav";
import { prisma } from "@/lib/prisma";
import { getConfig, getConfigMes, mesActual } from "@/lib/data";
import ConfigForm from "@/components/ConfigForm";
import AvisLogo from "@/components/AvisLogo";
import AdminOnly from "@/components/AdminOnly";

export const dynamic = "force-dynamic";

export default async function ConfigPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const mes = sp.mes || mesActual();
  const [config, cm, guardados, admins] = await Promise.all([
    getConfig(),
    getConfigMes(mes),
    prisma.configMes.findMany({ orderBy: { mes: "desc" }, select: { mes: true, precioGasoil: true, precioLeche: true } }),
    prisma.veterinario.findMany({ where: { esAdmin: true }, select: { abreviado: true } }),
  ]);
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-white border-b-2 border-blue-700 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AvisLogo size={48} />
            <div className="leading-tight">
              <div className="text-lg font-bold text-slate-900">AVIS · Agenda de Trabajos</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Configuración — Fernando</div>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <AdminOnly admins={admins.map((a) => a.abreviado)}>
        <div className="mx-auto max-w-3xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-800">Configuración mensual</h1>
          <p className="mt-1 text-sm text-slate-500">Cada mes guarda sus propios valores. Al reproducir un mes pasado, el Excel usa los valores de ese período (no los actuales).</p>
          <ConfigForm mes={mes} valores={cm} origen={cm.origen} proximoRemito={config.proximoRemito} guardados={guardados} />
        </div>
      </AdminOnly>
    </main>
  );
}
