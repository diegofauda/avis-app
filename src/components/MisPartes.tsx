"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type P = { id: number; remito: number; fecha: string; cliente: string | null; descripcion: string | null; libre: number | null };
type Grupo = { key: string; label: string; orden: number; cerrado: boolean; editable: boolean; partes: P[] };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const p2 = (n: number) => String(n).padStart(2, "0");

// Día calendario del parte (guardado en UTC-midnight).
function ymdParte(iso: string) { const d = new Date(iso); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay() }; }
function ymdHoy() { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() }; }

export default function MisPartes({ partes, vet, cierres }: { partes: P[]; vet: string; cierres: string[] }) {
  const grupos = useMemo(() => buildGrupos(partes, cierres), [partes, cierres]);
  // Por defecto abiertos: Hoy y Ayer (los dos primeros grupos de día).
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(["hoy", "ayer"]));
  const toggle = (k: string) => setAbiertos((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  if (partes.length === 0) return <p className="text-sm text-slate-400">Todavía no cargaste eventos.</p>;

  return (
    <div className="grid gap-2">
      {grupos.map((g) => {
        const open = abiertos.has(g.key);
        return (
          <div key={g.key} className={`overflow-hidden rounded-xl border ${g.cerrado ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-white"} shadow-sm`}>
            <button type="button" onClick={() => toggle(g.key)} className="flex w-full items-center justify-between px-3 py-2.5 text-left">
              <span className={`text-sm font-semibold ${g.cerrado ? "text-slate-500" : "text-slate-700"}`}>
                {g.cerrado && "🔒 "}{g.label}
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                {g.partes.length}
                <svg width="14" height="14" viewBox="0 0 24 24" className={`transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </button>
            {open && (
              <div className="grid gap-2 px-3 pb-3">
                {g.partes.map((p) => {
                  const titulo = p.libre ? (p.libre === 1 ? "Medio día libre" : "Día libre") : (p.cliente || "—");
                  const fc = (() => { const d = new Date(p.fecha); return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}`; })();
                  const inner = (
                    <>
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${g.editable ? "text-slate-800" : "text-slate-500"}`}>{titulo}</span>
                        <span className="text-xs text-slate-400">#{p.remito} · {fc}{g.editable ? " · editar ›" : ""}</span>
                      </div>
                      {p.descripcion && <div className="mt-0.5 text-sm text-slate-500">{p.descripcion}</div>}
                    </>
                  );
                  return g.editable ? (
                    <Link key={p.id} href={`/parte/${p.id}?actor=${vet}`} className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 active:bg-blue-50">{inner}</Link>
                  ) : (
                    <div key={p.id} className="block rounded-xl border border-slate-200 bg-slate-50 p-3">{inner}</div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function buildGrupos(partes: P[], cierres: string[]): Grupo[] {
  const hoy = ymdHoy();
  const hoyUTC = Date.UTC(hoy.y, hoy.m, hoy.d);
  const mesActualNum = hoy.y * 12 + hoy.m;
  const map = new Map<string, Grupo>();

  for (const p of partes) {
    const t = ymdParte(p.fecha);
    const mesStr = `${t.y}-${p2(t.m + 1)}`;
    const cerrado = cierres.includes(mesStr);
    const mesNum = t.y * 12 + t.m;
    const diff = Math.round((hoyUTC - Date.UTC(t.y, t.m, t.d)) / 86400000);

    let key: string, label: string, orden: number;
    if (mesNum === mesActualNum && diff >= 0 && diff <= 6) {
      if (diff === 0) { key = "hoy"; label = "Hoy"; }
      else if (diff === 1) { key = "ayer"; label = "Ayer"; }
      else { key = `dia-${mesStr}-${p2(t.d)}`; label = `${DIAS[t.dow]} ${p2(t.d)}/${p2(t.m + 1)}`; }
      orden = Date.UTC(t.y, t.m, t.d);
    } else if (mesNum === mesActualNum) {
      // Semana (lunes) dentro del mes en curso.
      const offMon = (t.dow + 6) % 7;
      const lunes = new Date(Date.UTC(t.y, t.m, t.d - offMon));
      key = `sem-${lunes.toISOString().slice(0, 10)}`;
      label = `Semana del ${p2(lunes.getUTCDate())}/${p2(lunes.getUTCMonth() + 1)}`;
      orden = lunes.getTime();
    } else {
      key = `mes-${mesStr}`;
      label = `${MESES[t.m]} ${t.y}`;
      orden = Date.UTC(t.y, t.m, 1);
    }

    const editable = mesNum === mesActualNum && !cerrado;
    let g = map.get(key);
    if (!g) { g = { key, label, orden, cerrado, editable, partes: [] }; map.set(key, g); }
    g.partes.push(p);
  }

  return [...map.values()].sort((a, b) => b.orden - a.orden);
}
