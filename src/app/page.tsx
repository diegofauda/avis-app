import { getListas } from "@/lib/data";
import ParteForm from "@/components/ParteForm";
import AvisLogo from "@/components/AvisLogo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const lists = await getListas();
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-white border-b-2 border-blue-700 shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AvisLogo size={44} />
            <div className="leading-tight">
              <div className="text-base font-bold text-slate-900">AVIS</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Agenda de Trabajos</div>
            </div>
          </div>
        </div>
      </header>
      <div className="px-4 py-4">
        <ParteForm lists={lists} />
      </div>
    </main>
  );
}
