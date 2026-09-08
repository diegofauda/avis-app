"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: number; remito: number; fecha: string; fechaISO: string; turno: string | null; vete: string; libre: number | null; cliente: string | null; descripcion: string | null; camioneta: string | null; compartida: boolean; doble: boolean };
type Vet = { abreviado: string; nombre: string };
type Resumen = { vet: string; nombre: string; n: number; libre: number; gasoil: number };
type Col = "fecha" | "remito";

export default function DetallePartes({ partes, vets, resumen, puedeEditar, desde, hasta, initialVete = "", initialQ = "" }: { partes: Row[]; vets: Vet[]; resumen: Resumen[]; puedeEditar: boolean; desde: string; hasta: string; initialVete?: string; initialQ?: string }) {
  const router = useRouter();
  const [vete, setVete] = useState(initialVete);
  const [q, setQ] = useState(initialQ);
  const [orden, setOrden] = useState<{ col: Col; dir: "asc" | "desc" }>({ col: "fecha", dir: "desc" });

  function ordenarPor(col: Col) {
    setOrden((o) => (o.col === col ? { col, dir: o.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  }

  // URL para volver al mismo rango + filtro después de editar.
  const volver = `/fernando?desde=${desde}&hasta=${hasta}${vete ? `&vete=${encodeURIComponent(vete)}` : ""}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`;
  const abrirEdicion = (id: number) => router.push(`/parte/${id}?from=fernando&volver=${encodeURIComponent(volver)}`);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = partes.filter((p) =>
      (!vete || p.vete === vete) &&
      (!t || (p.cliente ?? "").toLowerCase().includes(t) || (p.descripcion ?? "").toLowerCase().includes(t))
    );
    const sign = orden.dir === "asc" ? 1 : -1;
    const cmp = (a: Row, b: Row) => {
      if (orden.col === "remito") return sign * (a.remito - b.remito);
      // fecha: desempata por remito en la misma dirección
      return sign * (a.fechaISO < b.fechaISO ? -1 : a.fechaISO > b.fechaISO ? 1 : a.remito - b.remito);
    };
    return [...base].sort(cmp);
  }, [partes, vete, q, orden]);

  const sel = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 [color-scheme:light] outline-none focus:border-blue-600";
  const flecha = (col: Col) => (orden.col === col ? (orden.dir === "asc" ? " ▲" : " ▼") : "");
  const thSort = "cursor-pointer select-none px-3 py-3 hover:text-blue-200";

  const toggleVete = (v: string) => setVete((cur) => (cur === v ? "" : v));

  return (
    <div className="mt-6">
      {resumen.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Resumen por veterinario</h2>
            <span className="text-xs text-slate-400">Tocá un veterinario para filtrar la grilla</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-white [&_th]:font-semibold">
                  <th className="rounded-l-lg px-3 py-1.5 font-semibold">Veterinario</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Eventos</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Movilidad</th>
                  <th className="rounded-r-lg px-3 py-1.5 text-right font-semibold">Días libres</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((g) => {
                  const activo = vete === g.vet;
                  return (
                    <tr
                      key={g.vet}
                      onClick={() => toggleVete(g.vet)}
                      className={`cursor-pointer border-t border-slate-100 ${activo ? "bg-blue-50" : "hover:bg-slate-50"}`}
                    >
                      <td className={`px-3 py-1.5 ${activo ? "font-semibold text-blue-800" : "text-slate-700"}`}>{g.nombre} <span className="text-slate-400">({g.vet})</span></td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{g.n}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{g.gasoil.toLocaleString("es-AR")} lts</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{g.libre}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {vete && <p className="mt-2 text-xs text-blue-700">Filtrando por <span className="font-semibold">{resumen.find((r) => r.vet === vete)?.nombre ?? vete}</span> — tocá de nuevo o elegí «Todos» para quitar el filtro.</p>}
        </div>
      )}

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
              <th className={thSort} onClick={() => ordenarPor("remito")} title="Ordenar por remito">Remito{flecha("remito")}</th>
              <th className={thSort} onClick={() => ordenarPor("fecha")} title="Ordenar por fecha">Fecha{flecha("fecha")}</th>
              <th className="px-3 py-3 text-center">Turno</th><th className="px-3 py-3">Vete</th><th className="px-3 py-3">Libre</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3 min-w-[280px]">Descripción</th><th className="px-3 py-3">Camioneta</th><th className="px-3 py-3 text-center">Mov.</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Sin registros.</td></tr>}
            {filtrados.map((p) => (
              <tr
                key={p.id}
                onClick={puedeEditar ? () => abrirEdicion(p.id) : undefined}
                className={`border-t border-slate-100 ${puedeEditar ? "cursor-pointer hover:bg-blue-50" : ""}`}
              >
                <td className="px-3 py-2 tabular-nums text-slate-500">{p.remito}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{p.fecha}</td>
                <td className="px-3 py-2 text-center text-slate-600">{p.turno ?? ""}</td>
                <td className="px-3 py-2 text-slate-700">{p.vete}</td>
                <td className="px-3 py-2 text-center text-slate-600">{p.libre ?? ""}</td>
                <td className="px-3 py-2 text-slate-700">{p.cliente ?? ""}</td>
                <td className="px-3 py-2 text-slate-600">{p.descripcion ?? ""}</td>
                <td className="px-3 py-2 text-slate-500">{p.camioneta ?? ""}</td>
                <td className="px-3 py-2 text-center">
                  {p.doble ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700" title="Doble movilidad — revisar en el Excel">doble</span>
                    : p.compartida ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700" title="Movilidad compartida — revisar en el Excel">comp.</span> : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
