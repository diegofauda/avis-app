"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const masUnDia = (iso: string) => { const t = new Date(iso + "T00:00:00.000Z"); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };

export default function ConsolidadoControls({ desde, hasta, cerrado }: { desde: string; hasta: string; cerrado: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);
  const [gen, setGen] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const busy = pending || gen || cerrando;

  function ver(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => router.push(`/fernando?desde=${d}&hasta=${h}`));
  }

  async function toggleCierre() {
    const abrir = cerrado;
    // El cierre opera sobre el rango MOSTRADO (props), que es el que refleja `cerrado`.
    const rango = `${desde.split("-").reverse().join("/")} al ${hasta.split("-").reverse().join("/")}`;
    const msg = abrir
      ? `¿Reabrir el período ${rango}? Vas a poder volver a editar esos eventos.`
      : `¿Cerrar el período ${rango}? Nadie va a poder editar ni eliminar esos eventos (ni vos) hasta reabrirlo.`;
    if (!confirm(msg)) return;
    setCerrando(true);
    try {
      await fetch("/api/cierre", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ desde, hasta, cerrar: !abrir }) });
      router.refresh();
    } finally {
      setCerrando(false);
    }
  }

  async function descargar() {
    setGen(true);
    try {
      const r = await fetch(`/api/export?from=${d}&to=${masUnDia(h)}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TRABAJOS AVIS ${d} a ${h}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGen(false);
    }
  }

  const inp = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 [color-scheme:light]";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <form onSubmit={ver} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Desde</label>
            <input type="date" value={d} max={h} onChange={(e) => setD(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Hasta</label>
            <input type="date" value={h} min={d} onChange={(e) => setH(e.target.value)} className={inp} />
          </div>
          <button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-60">{pending ? "Procesando…" : "Ver"}</button>
        </form>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCierre}
            disabled={busy}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold disabled:opacity-60 ${cerrado ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
          >
            {cerrando ? "…" : cerrado ? "🔒 Reabrir período" : "Cerrar período"}
          </button>
          <button onClick={descargar} disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60">{gen ? "Generando Excel…" : "Descargar Excel completo"}</button>
        </div>
      </div>
      {cerrado && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          🔒 Período cerrado — los eventos de este rango no se pueden editar hasta reabrirlo.
        </div>
      )}
      {busy && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
          {gen ? "Generando el Excel completo…" : "Procesando datos…"}
        </div>
      )}
    </div>
  );
}
