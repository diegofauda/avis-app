import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rangoMes, mesActual, mesCerrado } from "@/lib/data";
import AvisLogo from "@/components/AvisLogo";
import AdminOnly from "@/components/AdminOnly";
import ConsolidadoControls from "@/components/ConsolidadoControls";
import DetallePartes from "@/components/DetallePartes";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

export default async function Fernando({ searchParams }: { searchParams: Promise<{ mes?: string; vete?: string; q?: string }> }) {
  const sp = await searchParams;
  const mes = sp.mes || mesActual();
  // Fernando (admin) edita cualquier mes, salvo que esté cerrado.
  const cerrado = await mesCerrado(mes);
  const puedeEditar = !cerrado;
  const { desde, hasta } = rangoMes(mes);
  const partes = await prisma.parte.findMany({ where: { anulado: false, fecha: { gte: desde, lt: hasta } }, orderBy: [{ fecha: "asc" }, { remito: "asc" }] });
  const vets = await prisma.veterinario.findMany({ orderBy: { orden: "asc" } });
  const adminAbrevs = vets.filter((v) => v.esAdmin).map((v) => v.abreviado);
  const nombreVet = (ab: string) => { const v = vets.find((x) => x.abreviado === ab); return v ? `${v.nombre} ${v.apellido ?? ""}`.trim() : ab; };

  const totGasoil = partes.reduce((a, p) => a + (p.gasoil ?? 0), 0);
  const totLibre = partes.reduce((a, p) => a + (p.libre ?? 0), 0);

  const porVet = vets.map((v) => {
    const ps = partes.filter((p) => p.vete === v.abreviado);
    return { vet: v.abreviado, nombre: nombreVet(v.abreviado), n: ps.length,
      libre: ps.reduce((a, p) => a + (p.libre ?? 0), 0),
      gasoil: ps.reduce((a, p) => a + (p.gasoil ?? 0), 0) };
  }).filter((x) => x.n > 0);

  // ── Controles del mes (avisos antes de descargar) ──────────────────────────
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const [aa, mm] = mes.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(aa, mm, 0)).getUTCDate();
  const hoy = new Date();
  const diaTope = mes === mesActual() ? hoy.getUTCDate() : ultimoDia;
  const fechasConParte = new Set(partes.map((p) => ymd(p.fecha)));
  const diasSinCarga: string[] = [];
  for (let d = 1; d <= diaTope; d++) {
    const dt = new Date(Date.UTC(aa, mm - 1, d));
    if (dt.getUTCDay() === 0) continue; // domingo
    if (!fechasConParte.has(ymd(dt))) diasSinCarga.push(`${String(d).padStart(2, "0")}/${String(mm).padStart(2, "0")}`);
  }
  const diasPorVet = vets.map((v) => ({ vet: v.abreviado, nombre: nombreVet(v.abreviado), dias: new Set(partes.filter((p) => p.vete === v.abreviado).map((p) => ymd(p.fecha))).size }));
  const vetsSinCarga = diasPorVet.filter((x) => x.dias === 0 && x.vet !== "AVIS");
  const maxDias = Math.max(0, ...diasPorVet.map((x) => x.dias));
  const vetsPocosDias = diasPorVet.filter((x) => x.dias > 0 && maxDias >= 6 && x.dias < maxDias * 0.5);
  const esTrabajo = (p: typeof partes[number]) => p.libre == null;
  const sinDescripcion = partes.filter((p) => esTrabajo(p) && !(p.descripcion && p.descripcion.trim()));
  const clientesSinKm = [...new Set(partes.filter((p) => esTrabajo(p) && p.gasoil == null && p.cliente && p.cliente.trim().toUpperCase() !== "AVIS").map((p) => p.cliente as string))];

  type Aviso = { titulo: string; detalle: string };
  const avisos: Aviso[] = [];
  if (vetsSinCarga.length) avisos.push({ titulo: `${vetsSinCarga.length} veterinario(s) sin ningún parte`, detalle: vetsSinCarga.map((v) => v.nombre).join(", ") });
  if (vetsPocosDias.length) avisos.push({ titulo: `${vetsPocosDias.length} veterinario(s) con pocos días cargados`, detalle: vetsPocosDias.map((v) => `${v.nombre} (${v.dias} días)`).join(", ") });
  if (diasSinCarga.length) avisos.push({ titulo: `${diasSinCarga.length} día(s) hábiles sin ninguna carga`, detalle: diasSinCarga.slice(0, 12).join(" · ") + (diasSinCarga.length > 12 ? " …" : "") });
  if (clientesSinKm.length) avisos.push({ titulo: `${clientesSinKm.length} cliente(s) sin km → movilidad sin calcular`, detalle: clientesSinKm.slice(0, 10).join(", ") + (clientesSinKm.length > 10 ? " …" : "") + " — cargá los km en Movilidad" });
  if (sinDescripcion.length) avisos.push({ titulo: `${sinDescripcion.length} trabajo(s) sin descripción`, detalle: "Remitos: " + sinDescripcion.slice(0, 12).map((p) => p.remito).join(", ") + (sinDescripcion.length > 12 ? " …" : "") });

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-white border-b-2 border-blue-700 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AvisLogo size={48} />
            <div className="leading-tight">
              <div className="text-lg font-bold text-slate-900">AVIS · Agenda de Trabajos</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Consolidado — Fernando</div>
            </div>
          </div>
          <nav className="flex gap-3 text-sm font-medium">
            <Link href="/movilidad" className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">Movilidad</Link>
            <Link href="/config" className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">Configuración</Link>
            <Link href="/" className="rounded-md px-2.5 py-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">← Carga</Link>
          </nav>
        </div>
      </header>

      <AdminOnly admins={adminAbrevs}>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <ConsolidadoControls mes={mes} cerrado={cerrado} />

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Partes</div><div className="mt-1 text-2xl font-semibold text-slate-800">{partes.length}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Movilidad (lts)</div><div className="mt-1 text-2xl font-semibold text-slate-800">{totGasoil.toLocaleString("es-AR")}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Días libres</div><div className="mt-1 text-2xl font-semibold text-slate-800">{totLibre}</div></div>
        </div>

        {partes.length > 0 && (
          <div className={`mt-5 rounded-xl border px-4 py-3 shadow-sm ${avisos.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center gap-2">
              <span>{avisos.length ? "⚠️" : "✅"}</span>
              <h2 className={`text-sm font-semibold ${avisos.length ? "text-amber-900" : "text-emerald-900"}`}>
                {avisos.length ? `Controles del mes — ${avisos.length} aviso(s) para revisar antes de descargar` : "Controles del mes — todo en orden, listo para descargar"}
              </h2>
            </div>
            {avisos.length > 0 && (
              <ul className="mt-1.5 space-y-1 text-sm">
                {avisos.map((a, i) => (
                  <li key={i} className="flex gap-2 text-amber-900">
                    <span className="text-amber-500">•</span>
                    <span><span className="font-medium">{a.titulo}</span><span className="text-amber-800/80"> — {a.detalle}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {porVet.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-800">Resumen por veterinario</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-white [&_th]:font-semibold">
                    <th className="rounded-l-lg px-3 py-1.5 font-semibold">Veterinario</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Partes</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Movilidad</th>
                    <th className="rounded-r-lg px-3 py-1.5 text-right font-semibold">Días libres</th>
                  </tr>
                </thead>
                <tbody>
                  {porVet.map((g) => (
                    <tr key={g.vet} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-700">{g.nombre} <span className="text-slate-400">({g.vet})</span></td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{g.n}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{g.gasoil.toLocaleString("es-AR")} lts</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{g.libre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DetallePartes
          partes={partes.map((p) => ({ id: p.id, remito: p.remito, fecha: fmt(p.fecha), turno: p.turno, vete: p.vete, libre: p.libre, cliente: p.cliente, descripcion: p.descripcion, camioneta: p.camioneta, compartida: p.compartida, doble: p.doble }))}
          vets={vets.map((v) => ({ abreviado: v.abreviado, nombre: nombreVet(v.abreviado) }))}
          puedeEditar={puedeEditar}
          mes={mes}
          initialVete={sp.vete ?? ""}
          initialQ={sp.q ?? ""}
        />
        <p className="mt-3 text-xs text-slate-400">El Excel descargado trae GENERAL + una hoja por veterinario + la distribución de movilidad.</p>
      </div>
      </AdminOnly>
    </main>
  );
}
