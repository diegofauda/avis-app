"use client";

import { useState } from "react";

type Cli = { id: number; nombre: string };

export default function ClientePicker({
  clientes, value, onChange, placeholder, required,
}: {
  clientes: Cli[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = q ? clientes.filter((c) => c.nombre.toLowerCase().includes(q)) : clientes;
  const shown = filtered.slice(0, 50);
  const exact = clientes.some((c) => c.nombre.toLowerCase() === q);

  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  function elegir(nombre: string) { onChange(nombre); setOpen(false); }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={input}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {value.trim() && !exact && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); elegir(value.trim()); }}
              className="block w-full border-b border-slate-100 px-3 py-3 text-left text-sm font-medium text-blue-700 active:bg-blue-100"
            >
              ➕ Usar “{value.trim()}” · cliente nuevo
            </button>
          )}
          {shown.length === 0 && !value.trim() && (
            <div className="px-3 py-3 text-sm text-slate-400">Escribí para buscar…</div>
          )}
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); elegir(c.nombre); }}
              className="block w-full px-3 py-3 text-left text-sm text-slate-700 hover:bg-blue-50 active:bg-blue-100"
            >
              {c.nombre}
            </button>
          ))}
          {filtered.length > shown.length && (
            <div className="px-3 py-2 text-xs text-slate-400">…y {filtered.length - shown.length} más — seguí escribiendo</div>
          )}
        </div>
      )}
    </div>
  );
}
