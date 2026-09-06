"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: number; remito: number; fecha: string; vete: string; libre: number | null; cliente: string | null; descripcion: string | null; horas: number | null; tactos: number | null; camioneta: string | null; compartida: boolean };
type Vet = { abreviado: string; nombre: string };

export default function DetallePartes({ partes, vets, puedeEditar, mes, initialVete = "", initialQ = "" }: { partes: Row[]; vets: Vet[]; puedeEditar: boolean; mes: string; initialVete?: string; initialQ?: string }) {
  const router = useRouter();
  const [vete, setVete] = useState(initialVete);
  const [q, setQ] = useState(initialQ);

  // URL para volver al mismo mes + filtro después de editar.
  const volver = `/fernando?mes=${mes}${vete ? `&vete=${encodeURIComponent(vete)}` : ""}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`;
  const abrirEdicion = (id: number) => router.push(`/parte/${id}?from=fernando&volver=${encodeURIComponent(volver)}`);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return partes.filter((p) =>
      (!vete || p.vete === vete) &&
      (!t || (p.cliente ?? "").toLowerCase().includes(t) || (p.descripcion ?? "").toLowerCase().includes(t))
    );
  }, [partes, vete, q]);

  const sel = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 [color-scheme:light] outline-none focus:border-blue-600";

  return (
    <div className="mt-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select value={vete} onChange={(e) => setVete(e.target.value)} className={sel}>
          <option value="">Todos los veterinarios</option>
          {vets.map((v) => <option key={v.abreviado} value={v.abreviado}>{v.nombre} ({v.abreviado})</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente o descripción…" className={`${sel} min-w-[220px] flex-1`} />
        <span className="text-sm text-slate-400">{filtrados.length} de {partes.length}</span>
        {puedeEditar && <span className="ml-auto text-xs text-slate-400">Tocá una fila para editar</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-white [&_th]:font-semibold">
              <th className="px-3 py-3">Remito</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Vete</th><th className="px-3 py-3">Libre</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3 min-w-[280px]">Descripción</th><th className="px-3 py-3 text-right">Horas</th><th className="px-3 py-3 text-right">Tactos</th><th className="px-3 py-3">Camioneta</th><th className="px-3 py-3 text-center">Mov.</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">Sin registros.</td></tr>}
            {filtrados.map((p) => (
              <tr
                key={p.id}
                onClick={puedeEditar ? () => abrirEdicion(p.id) : undefined}
                className={`border-t border-slate-100 ${puedeEditar ? "cursor-pointer hover:bg-blue-50" : ""}`}
              >
                <td className="px-3 py-2 tabular-nums text-slate-500">{p.remito}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{p.fecha}</td>
                <td className="px-3 py-2 text-slate-700">{p.vete}</td>
                <td className="px-3 py-2 text-center text-slate-600">{p.libre ?? ""}</td>
                <td className="px-3 py-2 text-slate-700">{p.cliente ?? ""}</td>
                <td className="px-3 py-2 text-slate-600">{p.descripcion ?? ""}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{p.horas ?? ""}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{p.tactos ?? ""}</td>
                <td className="px-3 py-2 text-slate-500">{p.camioneta ?? ""}</td>
                <td className="px-3 py-2 text-center">{p.compartida && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700" title="Movilidad compartida — revisar en el Excel">comp.</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
