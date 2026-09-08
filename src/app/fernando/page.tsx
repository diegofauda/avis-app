import { prisma } from "@/lib/prisma";
import { mesActual, rangoCerrado, hoyISOArg } from "@/lib/data";
import AvisLogo from "@/components/AvisLogo";
import AdminOnly from "@/components/AdminOnly";
import ConsolidadoControls from "@/components/ConsolidadoControls";
import DetallePartes from "@/components/DetallePartes";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const isISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const dUTC = (iso: string) => new Date(iso + "T00:00:00.000Z");
const masUnDia = (d: Date) => { const t = new Date(d); t.setUTCDate(t.getUTCDate() + 1); return t; };

export default async function Fernando({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; mes?: string; vete?: string; q?: string }> }) {
  const sp = await searchParams;

  // Rango por defecto: del 1° del mes en curso hasta hoy (AR). Compat: ?mes=YYYY-MM abre ese mes entero.
  const hoy = hoyISOArg();
  let desde: string, hasta: string;
  if (isISO(sp.desde) || isISO(sp.hasta)) {
    desde = isISO(sp.desde) ? sp.desde! : `${(isISO(sp.hasta) ? sp.hasta! : hoy).slice(0, 7)}-01`;
    hasta = isISO(sp.hasta) ? sp.hasta! : hoy;
  } else if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [a, m] = sp.mes.split("-").map(Number);
    desde = `${sp.mes}-01`;
    hasta = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  } else {
    desde = `${hoy.slice(0, 7)}-01`;
    hasta = hoy;
  }
  if (hasta < desde) hasta = desde;

  const gte = dUTC(desde);
  const ltExcl = masUnDia(dUTC(hasta));

  // Cierre por rango de fechas: el período mostrado está cerrado si todo [desde, hasta] lo está.
  const cerrado = await rangoCerrado(desde, hasta);
  const puedeEditar = !cerrado;

  const partes = await prisma.parte.findMany({ where: { anulado: false, fecha: { gte, lt: ltExcl } }, orderBy: [{ fecha: "asc" }, { remito: "asc" }] });
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

  // ── Controles del período (avisos antes de descargar) ──────────────────────
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const fechasConParte = new Set(partes.map((p) => ymd(p.fecha)));
  // Días hábiles del rango, sin pasar de hoy, sin ninguna carga.
  const topeStr = hasta < hoy ? hasta : hoy;
  const tope = dUTC(topeStr);
  const diasSinCarga: string[] = [];
  for (let dt = new Date(gte); dt <= tope; dt = masUnDia(dt)) {
    if (dt.getUTCDay() === 0) continue; // domingo
    if (!fechasConParte.has(ymd(dt))) diasSinCarga.push(`${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}`);
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
  if (vetsSinCarga.length) avisos.push({ titulo: `${vetsSinCarga.length} veterinario(s) sin ningún evento`, detalle: vetsSinCarga.map((v) => v.nombre).join(", ") });
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
          <AdminNav />
        </div>
      </header>

      <AdminOnly admins={adminAbrevs}>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <ConsolidadoControls desde={desde} hasta={hasta} cerrado={cerrado} />

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Eventos</div><div className="mt-1 text-2xl font-semibold text-slate-800">{partes.length}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Movilidad (lts)</div><div className="mt-1 text-2xl font-semibold text-slate-800">{totGasoil.toLocaleString("es-AR")}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Días libres</div><div className="mt-1 text-2xl font-semibold text-slate-800">{totLibre}</div></div>
        </div>

        {partes.length > 0 && (
          <div className={`mt-5 rounded-xl border px-4 py-3 shadow-sm ${avisos.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center gap-2">
              <span>{avisos.length ? "⚠️" : "✅"}</span>
              <h2 className={`text-sm font-semibold ${avisos.length ? "text-amber-900" : "text-emerald-900"}`}>
                {avisos.length ? `Controles del período — ${avisos.length} aviso(s) para revisar antes de descargar` : "Controles del período — todo en orden, listo para descargar"}
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

        <DetallePartes
          partes={partes.map((p) => ({ id: p.id, remito: p.remito, fecha: fmt(p.fecha), fechaISO: ymd(p.fecha), turno: p.turno, vete: p.vete, libre: p.libre, cliente: p.cliente, descripcion: p.descripcion, camioneta: p.camioneta, compartida: p.compartida, doble: p.doble }))}
          vets={vets.map((v) => ({ abreviado: v.abreviado, nombre: nombreVet(v.abreviado) }))}
          resumen={porVet}
          puedeEditar={puedeEditar}
          desde={desde}
          hasta={hasta}
          initialVete={sp.vete ?? ""}
          initialQ={sp.q ?? ""}
        />
        <p className="mt-3 text-xs text-slate-400">El Excel descargado trae GENERAL + una hoja por veterinario + la distribución de movilidad.</p>
      </div>
      </AdminOnly>
    </main>
  );
}
