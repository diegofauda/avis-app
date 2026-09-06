"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminOnly({ admins, children }: { admins: string[]; children: React.ReactNode }) {
  const [estado, setEstado] = useState<"loading" | "ok" | "deny">("loading");
  useEffect(() => {
    try { const v = localStorage.getItem("avis_vet"); setEstado(v && admins.includes(v) ? "ok" : "deny"); }
    catch { setEstado("deny"); }
  }, [admins]);

  if (estado === "loading") return null;
  if (estado === "deny") {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="text-lg font-semibold text-slate-800">Sección solo para Fernando</div>
        <p className="mt-1 text-sm text-slate-500">El consolidado y la edición de todos los partes son de acceso exclusivo del administrador.</p>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">← Ir a la carga</Link>
      </div>
    );
  }
  return <>{children}</>;
}
