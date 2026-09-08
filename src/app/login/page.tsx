"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AvisLogo from "@/components/AvisLogo";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [msg, setMsg] = useState(sp.get("error") ? "Contraseña incorrecta" : "");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true); setMsg("");
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, recordar }) });
      if (r.ok) {
        const next = sp.get("next") || "/";
        router.push(next.startsWith("/") ? next : "/");
        router.refresh();
      } else setMsg("Contraseña incorrecta");
    } catch { setMsg("Error de conexión"); }
    finally { setEntrando(false); }
  }

  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <form onSubmit={entrar} action="/api/login" method="POST" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="next" value={sp.get("next") || "/"} />
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <AvisLogo size={56} />
        <div>
          <div className="text-lg font-bold text-slate-900">AVIS · Agenda de Trabajos</div>
          <div className="text-sm text-slate-500">Ingresá la contraseña para continuar</div>
        </div>
      </div>
      {/* Usuario fijo oculto: ayuda a que el navegador guarde/autocomplete la contraseña. */}
      <input type="text" name="username" value="AVIS" autoComplete="username" readOnly hidden />
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Contraseña</label>
      <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} autoComplete="current-password" autoFocus required />
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="recordar" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="h-4 w-4 accent-blue-700" />
        Recordar contraseña en este dispositivo
      </label>
      <button type="submit" disabled={entrando} className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 text-base font-semibold text-white active:bg-blue-800 disabled:opacity-60">
        {entrando ? "Entrando…" : "Entrar"}
      </button>
      {msg && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-sm font-medium text-rose-700">{msg}</div>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
