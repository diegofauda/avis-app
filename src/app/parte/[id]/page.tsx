import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getListas, rangoMes, mesActual, fechaCerrada } from "@/lib/data";
import ParteEdit from "@/components/ParteEdit";
import AvisLogo from "@/components/AvisLogo";

export const dynamic = "force-dynamic";

export default async function EditarParte({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; actor?: string; volver?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  // Volver al mismo mes/filtro desde donde se abrió (solo rutas internas, por seguridad).
  const volverParam = sp.volver ? decodeURIComponent(sp.volver) : "";
  const volver = volverParam.startsWith("/") ? volverParam : (sp.from === "fernando" ? "/fernando" : "/");
  const parte = await prisma.parte.findUnique({ where: { id: Number(id) } });
  const lists = await getListas();

  // Fernando (admin) edita cualquier mes; un vet solo su propio parte del mes en curso.
  const esAdmin = sp.from === "fernando" || !!lists.veterinarios.find((v) => v.abreviado === sp.actor)?.esAdmin;
  const { desde, hasta } = rangoMes(mesActual());
  const cerrado = parte ? await fechaCerrada(parte.fecha) : false;
  const editable = cerrado ? false : (esAdmin ? true : (parte ? parte.fecha >= desde && parte.fecha < hasta : false));
  const propio = !!parte && (esAdmin || sp.actor === parte.vete);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-white border-b-2 border-blue-700 shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AvisLogo size={44} />
            <div className="text-base font-bold text-slate-900">Editar evento</div>
          </div>
          <Link href={volver} className="text-sm font-medium rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">← Volver</Link>
        </div>
      </header>

      <div className="px-4 py-6">
        {!parte ? (
          <p className="mx-auto max-w-md text-slate-500">Evento no encontrado.</p>
        ) : !propio ? (
          <p className="mx-auto max-w-md rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Solo podés editar tus propios eventos. (Los demás los edita Fernando.)</p>
        ) : cerrado ? (
          <p className="mx-auto max-w-md rounded-xl bg-amber-50 p-4 text-sm text-amber-800">🔒 El período está cerrado. Reabrilo desde el consolidado para poder editar.</p>
        ) : !editable ? (
          <p className="mx-auto max-w-md rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Este evento no es del mes en curso, así que no se puede editar.</p>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="text-sm text-slate-500">Remito <span className="font-semibold text-slate-800">#{parte.remito}</span> · {parte.vete}</div>
            <ParteEdit parte={{ ...parte, fecha: parte.fecha.toISOString() }} lists={lists} volverHref={volver} actor={sp.actor} from={sp.from} />
          </div>
        )}
      </div>
    </main>
  );
}
