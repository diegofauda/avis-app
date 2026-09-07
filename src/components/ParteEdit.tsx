"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClientePicker from "./ClientePicker";
import Buscador from "./Buscador";

type Vet = { abreviado: string; nombre: string; apellido: string | null };
type Cli = { id: number; nombre: string };
type Trab = { id: number; nombre: string };
type Parte = { id: number; remito: number; fecha: string; vete: string; libre: number | null; cliente: string | null; descripcion: string | null; turno: string | null; camioneta: string | null; compartida: boolean; doble: boolean; comentario: string | null };

export default function ParteEdit({ parte, lists, volverHref, actor, from }: { parte: Parte; lists: { veterinarios: Vet[]; clientes: Cli[]; trabajos: Trab[] }; volverHref: string; actor?: string; from?: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"trabajo" | "libre">(parte.libre != null ? "libre" : "trabajo");
  const [fecha, setFecha] = useState(parte.fecha.slice(0, 10));
  const [libre, setLibre] = useState(String(parte.libre ?? 2));
  const [cliente, setCliente] = useState(parte.cliente ?? "");
  const [descripcion, setDescripcion] = useState(parte.descripcion ?? "");
  const [turno, setTurno] = useState<"AM" | "PM" | "TD" | "">((parte.turno as "AM" | "PM" | "TD") ?? "");
  const [camioneta, setCamioneta] = useState(parte.camioneta ?? "");
  const [compartida, setCompartida] = useState(!!parte.compartida);
  const [doble, setDoble] = useState(!!parte.doble);
  const [comentario, setComentario] = useState(parte.comentario ?? "");
  const [saving, setSaving] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [msg, setMsg] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (tipo === "trabajo" && !cliente) { setMsg("Elegí el cliente"); return; }
    if (tipo === "trabajo" && !turno) { setMsg("Elegí AM o PM"); return; }
    if (tipo === "trabajo" && !camioneta) { setMsg("Elegí la camioneta"); return; }
    if (tipo === "libre" && libre === "1" && !turno) { setMsg("Elegí mañana o tarde"); return; }
    setSaving(true); setMsg("");
    try {
      const base = { actor, from };
      const body = tipo === "libre"
        ? { ...base, fecha, libre, turno: libre === "1" ? turno : "", comentario }
        : { ...base, fecha, libre: "", cliente, descripcion, turno, camioneta, compartida, doble, comentario };
      const r = await fetch(`/api/partes/${parte.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { setMsg("✓ Guardado"); setTimeout(() => { router.push(volverHref); router.refresh(); }, 700); }
      else setMsg(await r.text() || "Error al guardar");
    } finally { setSaving(false); }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el parte #${parte.remito}? Se quita del consolidado y del Excel (mientras el mes esté abierto).`)) return;
    setBorrando(true); setMsg("");
    try {
      const r = await fetch(`/api/partes/${parte.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor, from }) });
      if (r.ok) { setMsg("✓ Eliminado"); setTimeout(() => { router.push(volverHref); router.refresh(); }, 700); }
      else setMsg(await r.text() || "Error al eliminar");
    } finally { setBorrando(false); }
  }

  const label = "block text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1";
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <form onSubmit={guardar} className="mx-auto mt-4 grid max-w-md gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTipo("trabajo")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${tipo === "trabajo" ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Trabajo</button>
        <button type="button" onClick={() => setTipo("libre")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${tipo === "libre" ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Día libre</button>
      </div>
      <div><label className={label}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} required /></div>

      {tipo === "libre" ? (
        <>
          <div><label className={label}>Día libre</label>
            <select value={libre} onChange={(e) => setLibre(e.target.value)} className={input}>
              <option value="1">Medio día (1)</option><option value="2">Día completo (2)</option>
            </select>
          </div>
          {libre === "1" && (
            <div><label className={label}>¿Mañana o tarde?</label>
              <div className="grid grid-cols-2 gap-2">
                {(["AM", "PM"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTurno(t)} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${turno === t ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{t}</button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div><label className={label}>Cliente</label>
            <ClientePicker clientes={lists.clientes} value={cliente} onChange={setCliente} required />
            {cliente.trim() && !lists.clientes.some((c) => c.nombre.toLowerCase() === cliente.trim().toLowerCase()) && (
              <p className="mt-1 text-xs font-medium text-blue-700">Cliente nuevo — se agrega a la lista.</p>
            )}
          </div>
          <div><label className={label}>Descripción del trabajo</label><Buscador items={lists.trabajos} value={descripcion} onChange={setDescripcion} placeholder="Buscá el trabajo o escribilo…" nuevoTexto={(v) => `Usar "${v}" (texto libre)`} /></div>
          <div><label className={label}>Turno</label>
            <div className="grid grid-cols-3 gap-2">
              {(["AM", "PM", "TD"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTurno(t)} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${turno === t ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div><label className={label}>Camioneta</label>
            <select value={camioneta} onChange={(e) => setCamioneta(e.target.value)} className={input}>
              <option value="">— Elegí —</option><option value="Estudio AVIS">Estudio AVIS</option>
              {lists.veterinarios.map((v) => <option key={v.abreviado} value={`${v.nombre} ${v.apellido ?? ""}`.trim()}>{v.nombre} {v.apellido}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={compartida} onChange={(e) => setCompartida(e.target.checked)} className="h-5 w-5 accent-blue-700" />
              Mov. compartida
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={doble} onChange={(e) => setDoble(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
              Doble movilidad
            </label>
          </div>
        </>
      )}
      <div><label className={label}>Comentario</label><textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} className={input} placeholder={tipo === "libre" ? "Motivo (ej: lluvia, feriado, personal…)" : "Ej: compartí movilidad con Carlos, ya cobrado…"} /></div>

      <div className="mt-1 flex gap-2">
        <button type="submit" disabled={saving || borrando} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-base font-semibold text-white active:bg-blue-800 disabled:opacity-60">{saving ? "Guardando…" : "Guardar cambios"}</button>
        <button type="button" onClick={() => router.push(volverHref)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-600">Cancelar</button>
      </div>
      <button type="button" onClick={eliminar} disabled={saving || borrando} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">{borrando ? "Eliminando…" : "Eliminar parte"}</button>
      {msg && <div className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${msg.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg}</div>}
    </form>
  );
}
