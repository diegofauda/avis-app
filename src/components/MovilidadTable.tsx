"use client";

import { useMemo, useState } from "react";

type Cli = { id: number; nombre: string; km: number | null; activo: boolean };

export default function MovilidadTable({ clientes, litrosPorKm }: { clientes: Cli[]; litrosPorKm: number }) {
  const [rows, setRows] = useState<Cli[]>(clientes);
  const [q, setQ] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoKm, setNuevoKm] = useState("");
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState<number | "nuevo" | null>(null);

  const litros = (km: number | null) => (km == null ? null : km * 2 * litrosPorKm);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((c) => (!soloActivos || c.activo) && (!t || c.nombre.toLowerCase().includes(t)));
  }, [rows, q, soloActivos]);

  function aviso(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function guardarFila(c: Cli, cambios: Partial<Cli>) {
    setGuardando(c.id);
    try {
      const r = await fetch(`/api/clientes/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
      if (r.ok) { const upd = await r.json(); setRows((rs) => rs.map((x) => (x.id === c.id ? upd : x))); aviso("✓ Guardado"); }
      else aviso(await r.text() || "Error");
    } finally { setGuardando(null); }
  }

  async function agregar() {
    const nombre = nuevoNombre.trim();
    if (!nombre) { aviso("Escribí el nombre"); return; }
    setGuardando("nuevo");
    try {
      const r = await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre, km: nuevoKm }) });
      if (r.ok) { const c = await r.json(); setRows((rs) => [...rs, c].sort((a, b) => a.nombre.localeCompare(b.nombre))); setNuevoNombre(""); setNuevoKm(""); aviso("✓ Cliente agregado"); }
      else aviso(await r.text() || "Error");
    } finally { setGuardando(null); }
  }

  const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="mt-6">
      {/* Alta de cliente */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">Agregar cliente</div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-slate-500">Nombre</label>
            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className={inp} placeholder="Ej: TAMBO LA ESPERANZA" />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">Km</label>
            <input type="number" inputMode="decimal" step="0.1" value={nuevoKm} onChange={(e) => setNuevoKm(e.target.value)} className={inp} />
          </div>
          <button onClick={agregar} disabled={guardando === "nuevo"} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {guardando === "nuevo" ? "Agregando…" : "Agregar"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} className={`${inp} max-w-xs`} placeholder="Buscar cliente…" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} className="h-4 w-4 accent-blue-700" />
          Solo activos
        </label>
        <span className="text-sm text-slate-400">{filtrados.length} de {rows.length}</span>
        {msg && <span className={`ml-auto text-sm font-medium ${msg.startsWith("✓") ? "text-emerald-600" : "text-rose-600"}`}>{msg}</span>}
      </div>

      {/* Tabla */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-white">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 w-32 font-semibold">Km</th>
              <th className="px-4 py-3 text-right w-28 font-semibold">Gasoil (lts)</th>
              <th className="px-4 py-3 text-center w-24 font-semibold">Activo</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Sin resultados.</td></tr>}
            {filtrados.map((c) => <Fila key={c.id} c={c} litros={litros} guardando={guardando === c.id} onGuardar={guardarFila} />)}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">El gasoil (litros) se calcula solo: km × 2 × {litrosPorKm}. Cambiá el consumo por km en Configuración.</p>
    </div>
  );
}

function Fila({ c, litros, guardando, onGuardar }: { c: Cli; litros: (km: number | null) => number | null; guardando: boolean; onGuardar: (c: Cli, cambios: Partial<Cli>) => void }) {
  const [nombre, setNombre] = useState(c.nombre);
  const [km, setKm] = useState(c.km != null ? String(c.km) : "");
  const sucio = nombre.trim() !== c.nombre || (km === "" ? c.km != null : Number(km) !== c.km);
  const lts = litros(km === "" ? null : Number(km));

  const inp = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <tr className={`border-t border-slate-100 ${!c.activo ? "opacity-50" : ""}`}>
      <td className="px-4 py-2"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inp} /></td>
      <td className="px-4 py-2"><input type="number" inputMode="decimal" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} className={inp} /></td>
      <td className="px-4 py-2 text-right tabular-nums text-slate-500">{lts != null ? lts.toLocaleString("es-AR") : "—"}</td>
      <td className="px-4 py-2 text-center">
        <input type="checkbox" checked={c.activo} onChange={(e) => onGuardar(c, { activo: e.target.checked })} className="h-4 w-4 accent-blue-700" />
      </td>
      <td className="px-4 py-2">
        <button
          onClick={() => onGuardar(c, { nombre: nombre.trim(), km })}
          disabled={!sucio || guardando}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 disabled:opacity-40"
        >
          {guardando ? "…" : "Guardar"}
        </button>
      </td>
    </tr>
  );
}
