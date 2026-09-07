"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Carga" },
  { href: "/fernando", label: "Consolidado" },
  { href: "/movilidad", label: "Movilidad" },
  { href: "/trabajos", label: "Trabajos" },
  { href: "/config", label: "Configuración" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5 text-sm font-medium">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={active
              ? "rounded-md bg-blue-700 px-2.5 py-1.5 text-white"
              : "rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
