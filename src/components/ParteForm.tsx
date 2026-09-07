"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ClientePicker from "./ClientePicker";
import Buscador from "./Buscador";
import MisPartes from "./MisPartes";

type Vet = { abreviado: string; nombre: string; apellido: string | null; esAdmin?: boolean };
type Cli = { id: number; nombre: string };
type Trab = { id: number; nombre: string };
type Parte = { id: number; remito: number; fecha: string; cliente: string | null; descripcion: string | null; libre: number | null };

const p2 = (n: number) => String(n).padStart(2, "0");
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };

export default function ParteForm({ lists }: { lists: { veterinarios: Vet[]; clientes: Cli[]; trabajos: Trab[]; cierres: string[] } }) {
  const [vet, setVet] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [tipo, setTipo] = useState<"trabajo" | "libre">("trabajo");
  const [libre, setLibre] = useState("2");
  const [cliente, setCliente] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [turno, setTurno] = useState<"AM" | "PM" | "TD" | "">("");
  const [camioneta, setCamioneta] = useState("");
  const [compartida, setCompartida] = useState(false);
  const [doble, setDoble] = useState(false);
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [mis, setMis] = useState<Parte[]>([]);

  useEffect(() => { try { const v = localStorage.getItem("avis_vet"); if (v) setVet(v); } catch {} }, []);

  const cargarMis = useCallback(async (v: string) => {
    try { const r = await fetch(`/api/partes?vet=${encodeURIComponent(v)}`); if (r.ok) setMis(await r.json()); } catch {}
  }, []);
  useEffect(() => { if (vet) cargarMis(vet); }, [vet, cargarMis]);

  const vetDisp = (ab: string) => { const v = lists.veterinarios.find((x) => x.abreviado === ab); return v ? `${v.nombre} ${v.apellido ?? ""}`.trim() : ab; };
  function elegirVet(v: string) { setVet(v); try { v ? localStorage.setItem("avis_vet", v) : localStorage.removeItem("avis_vet"); } catch {} }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (tipo === "trabajo" && !cliente) { setMsg("Elegí el cliente"); return; }
    if (tipo === "trabajo" && !turno) { setMsg("Elegí AM o PM"); return; }
    if (tipo === "trabajo" && !camioneta) { setMsg("Elegí la camioneta"); return; }
    if (tipo === "libre" && libre === "1" && !turno) { setMsg("Elegí mañana o tarde"); return; }
    setSaving(true); setMsg("");
    try {
      const body = tipo === "libre"
        ? { fecha, vete: vet, libre, turno: libre === "1" ? turno : "", comentario }
        : { fecha, vete: vet, cliente, descripcion, turno, camioneta, compartida, doble, comentario };
      const r = await fetch("/api/partes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) {
        const p = await r.json();
        setMsg(`✓ Guardado — Remito ${p.remito}`);
        setCliente(""); setDescripcion(""); setTurno(""); setCamioneta(""); setCompartida(false); setDoble(false); setComentario("");
        await cargarMis(vet);
        setTimeout(() => setMsg(""), 3500);
      } else setMsg("Error al guardar");
    } finally { setSaving(false); }
  }

  if (!vet) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold text-slate-800">¿Quién sos?</h1>
        <p className="mt-1 text-sm text-slate-500">Elegí tu nombre. Este celular lo va a recordar.</p>
        <div className="mt-4 grid gap-2">
          {lists.veterinarios.map((v) => (
            <button key={v.abreviado} onClick={() => elegirVet(v.abreviado)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-medium text-slate-700 shadow-sm active:bg-blue-50">
              {v.nombre} {v.apellido}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const soyAdmin = lists.veterinarios.find((v) => v.abreviado === vet)?.esAdmin ?? false;
  const label = "block text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1";
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-slate-500">Cargando como <span className="font-semibold text-slate-800">{vetDisp(vet)}</span></div>
        <button onClick={() => elegirVet("")} className="text-sm font-medium text-blue-700">cambiar</button>
      </div>
      {soyAdmin && (
        <Link href="/fernando" className="mb-3 hidden rounded-xl bg-neutral-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-neutral-800 md:block">Ver Consolidado</Link>
      )}

      <div className="mb-2.5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTipo("trabajo")}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${tipo === "trabajo" ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Trabajo</button>
        <button type="button" onClick={() => setTipo("libre")}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${tipo === "libre" ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Día libre</button>
      </div>

      <form onSubmit={guardar} className="grid gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div>
          <label className={label}>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} required />
        </div>

        {tipo === "libre" ? (
          <>
            <div>
              <label className={label}>Día libre</label>
              <select value={libre} onChange={(e) => setLibre(e.target.value)} className={input}>
                <option value="1">Medio día (1)</option>
                <option value="2">Día completo (2)</option>
              </select>
            </div>
            {libre === "1" && (
              <div>
                <label className={label}>¿Mañana o tarde?</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["AM", "PM"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTurno(t)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${turno === t ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{t}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className={label}>Cliente</label>
              <ClientePicker clientes={lists.clientes} value={cliente} onChange={setCliente} placeholder="Escribí para buscar o agregar…" required />
              {cliente.trim() && !lists.clientes.some((c) => c.nombre.toLowerCase() === cliente.trim().toLowerCase()) && (
                <p className="mt-1 text-xs font-medium text-blue-700">Cliente nuevo — se agrega a la lista (Fernando le carga los km después).</p>
              )}
            </div>
            <div>
              <label className={label}>Descripción del trabajo</label>
              <Buscador items={lists.trabajos} value={descripcion} onChange={setDescripcion} placeholder="Buscá el trabajo o escribilo…" nuevoTexto={(v) => `Usar "${v}" (texto libre)`} />
            </div>
            <div>
              <label className={label}>Turno</label>
              <div className="grid grid-cols-3 gap-2">
                {(["AM", "PM", "TD"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTurno(t)}
                    className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${turno === t ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Camioneta</label>
              <select value={camioneta} onChange={(e) => setCamioneta(e.target.value)} className={input}>
                <option value="">— Elegí —</option>
                <option value="Estudio AVIS">Estudio AVIS</option>
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

        <div>
          <label className={label}>Comentario</label>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} className={input} placeholder={tipo === "libre" ? "Motivo (ej: lluvia, feriado, personal…)" : "Ej: compartí movilidad con Carlos, ya cobrado…"} />
        </div>

        <button type="submit" disabled={saving} className="mt-1 rounded-xl bg-blue-700 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:bg-blue-800 disabled:opacity-60">
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {msg && <div className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${msg.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg}</div>}
      </form>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">Mis eventos ({mis.length})</h2>
        <MisPartes partes={mis} vet={vet} cierres={lists.cierres} />
      </div>
    </div>
  );
}
