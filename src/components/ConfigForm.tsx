"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Valores = {
  precioGasoil: number; precioLeche: number; litrosPorKm: number;
  pozoMovilidad: number; precioTrabajo: number; precioMovilidad: number; precioTacto: number;
};
type Guardado = { mes: string; precioGasoil: number; precioLeche: number };

const CAMPOS: { k: keyof Valores; label: string; help: string; step?: string }[] = [
  { k: "precioGasoil", label: "Precio gasoil ($/L)", help: "LG — litro de gasoil" },
  { k: "precioLeche", label: "Precio leche ($/L)", help: "LL — litro de leche", step: "0.01" },
  { k: "litrosPorKm", label: "Litros por km", help: "Consumo; gasoil = km × 2 × este valor", step: "0.01" },
  { k: "pozoMovilidad", label: "Pozo movilidad ($/mes)", help: "Total a distribuir por movilidad" },
  { k: "precioTrabajo", label: "$ por gavet", help: "Para el $ estimado" },
  { k: "precioMovilidad", label: "$ por litro movilidad", help: "Para el $ estimado" },
  { k: "precioTacto", label: "$ por tacto", help: "Para el $ estimado" },
];

const nombreMes = (m: string) => { const [y, mm] = m.split("-").map(Number); return new Date(y, mm - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" }); };

export default function ConfigForm({ mes, valores, origen, proximoRemito, guardados }: {
  mes: string; valores: Valores; origen: "propio" | "arrastre" | "default"; proximoRemito: number; guardados: Guardado[];
}) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(CAMPOS.map((c) => [c.k, String(valores[c.k])])));
  const [remito, setRemito] = useState(String(proximoRemito));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function cambiarMes(nuevo: string) { if (nuevo) router.push(`/config?mes=${nuevo}`); }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const r = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mes, ...v, proximoRemito: remito }) });
      if (r.ok) { setMsg("✓ Guardado"); router.refresh(); setTimeout(() => setMsg(""), 3000); }
      else setMsg("Error al guardar");
    } finally { setSaving(false); }
  }

  const nota = origen === "propio"
    ? { txt: `Estos valores son propios de ${nombreMes(mes)}.`, cls: "bg-emerald-50 text-emerald-800 border-emerald-200" }
    : origen === "arrastre"
    ? { txt: `Este mes todavía no tiene valores propios — se muestran los del último mes cargado. Al guardar quedan fijados para ${nombreMes(mes)}.`, cls: "bg-amber-50 text-amber-800 border-amber-200" }
    : { txt: `No hay históricos aún — se muestran los valores por defecto. Al guardar quedan como los de ${nombreMes(mes)}.`, cls: "bg-slate-50 text-slate-600 border-slate-200" };

  const inputCls = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 [color-scheme:light]";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Mes</label>
          <input type="month" value={mes} onChange={(e) => cambiarMes(e.target.value)} className={`${inputCls} mt-0`} />
        </div>
      </div>

      <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${nota.cls}`}>{nota.txt}</div>

      <form onSubmit={guardar} className="mt-4 grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</label>
            <input type="number" step={c.step ?? "0.01"} value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} className={inputCls} />
            <p className="mt-1 text-xs text-slate-400">{c.help}</p>
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Próximo remito <span className="text-slate-400">(global)</span></label>
          <input type="number" step="1" value={remito} onChange={(e) => setRemito(e.target.value)} className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">No es mensual — es el siguiente número a asignar.</p>
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Guardando…" : `Guardar valores de ${nombreMes(mes)}`}
          </button>
          {msg && <span className={`text-sm font-medium ${msg.startsWith("✓") ? "text-emerald-600" : "text-rose-600"}`}>{msg}</span>}
        </div>
      </form>

      {guardados.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Histórico cargado</h2>
          <div className="flex flex-wrap gap-2">
            {guardados.map((g) => (
              <button key={g.mes} onClick={() => cambiarMes(g.mes)} className={`rounded-lg border px-3 py-1.5 text-sm ${g.mes === mes ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>
                {nombreMes(g.mes)} · leche ${g.precioLeche}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
