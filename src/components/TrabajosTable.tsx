"use client";

import { useMemo, useState } from "react";

type Trab = { id: number; nombre: string; activo: boolean };

export default function TrabajosTable({ trabajos }: { trabajos: Trab[] }) {
  const [rows, setRows] = useState<Trab[]>(trabajos);
  const [q, setQ] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [nuevo, setNuevo] = useState("");
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState<number | "nuevo" | null>(null);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (!soloActivos || r.activo) && (!t || r.nombre.toLowerCase().includes(t)));
  }, [rows, q, soloActivos]);

  function aviso(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function guardarFila(t: Trab, cambios: Partial<Trab>) {
    setGuardando(t.id);
    try {
      const r = await fetch(`/api/trabajos/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
      if (r.ok) { const upd = await r.json(); setRows((rs) => rs.map((x) => (x.id === t.id ? upd : x))); aviso("✓ Guardado"); }
      else aviso(await r.text() || "Error");
    } finally { setGuardando(null); }
  }

  async function agregar() {
    const nombre = nuevo.trim();
    if (!nombre) { aviso("Escribí el trabajo"); return; }
    setGuardando("nuevo");
    try {
      const r = await fetch("/api/trabajos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
      if (r.ok) { const t = await r.json(); setRows((rs) => [...rs, t].sort((a, b) => a.nombre.localeCompare(b.nombre))); setNuevo(""); aviso("✓ Trabajo agregado"); }
      else aviso(await r.text() || "Error");
    } finally { setGuardando(null); }
  }

  const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">Agregar trabajo</div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} className={`${inp} min-w-[220px] flex-1`} placeholder="Ej: TACTO VQ" />
          <button onClick={agregar} disabled={guardando === "nuevo"} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {guardando === "nuevo" ? "Agregando…" : "Agregar"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} className={`${inp} max-w-xs`} placeholder="Buscar trabajo…" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} className="h-4 w-4 accent-blue-700" />
          Solo activos
        </label>
        <span className="text-sm text-slate-400">{filtrados.length} de {rows.length}</span>
        {msg && <span className={`ml-auto text-sm font-medium ${msg.startsWith("✓") ? "text-emerald-600" : "text-rose-600"}`}>{msg}</span>}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-white [&_th]:font-semibold">
              <th className="px-4 py-3">Trabajo</th>
              <th className="px-4 py-3 text-center w-24">Activo</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Sin resultados.</td></tr>}
            {filtrados.map((t) => <Fila key={t.id} t={t} guardando={guardando === t.id} onGuardar={guardarFila} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Fila({ t, guardando, onGuardar }: { t: Trab; guardando: boolean; onGuardar: (t: Trab, cambios: Partial<Trab>) => void }) {
  const [nombre, setNombre] = useState(t.nombre);
  const sucio = nombre.trim() !== t.nombre;
  const inp = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <tr className={`border-t border-slate-100 ${!t.activo ? "opacity-50" : ""}`}>
      <td className="px-4 py-2"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inp} /></td>
      <td className="px-4 py-2 text-center">
        <input type="checkbox" checked={t.activo} onChange={(e) => onGuardar(t, { activo: e.target.checked })} className="h-4 w-4 accent-blue-700" />
      </td>
      <td className="px-4 py-2">
        <button onClick={() => onGuardar(t, { nombre: nombre.trim() })} disabled={!sucio || guardando}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 disabled:opacity-40">
          {guardando ? "…" : "Guardar"}
        </button>
      </td>
    </tr>
  );
}
