import { AUTH_TOKEN } from "@/lib/auth";

const PASS = process.env.AVIS_PASSWORD || "Avis*2026";

function cookie(recordar: boolean) {
  const maxAge = recordar ? 60 * 60 * 24 * 365 : undefined; // 1 año o sesión
  const partes = [
    `avis_auth=${AUTH_TOKEN}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
    ...(maxAge ? [`Max-Age=${maxAge}`] : []),
  ];
  return partes.join("; ");
}

const safeNext = (n: unknown) => { const s = String(n ?? ""); return s.startsWith("/") ? s : "/"; };

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";

  // Envío nativo del form (sin JS): application/x-www-form-urlencoded → validar y REDIRIGIR.
  if (ct.includes("form")) {
    const f = await req.formData();
    if (String(f.get("password") ?? "") !== PASS) {
      return Response.redirect(new URL("/login?error=1", req.url), 303);
    }
    // Redirect construido a mano (Response.redirect trae headers de solo lectura).
    return new Response(null, {
      status: 303,
      headers: { Location: new URL(safeNext(f.get("next")), req.url).toString(), "Set-Cookie": cookie(f.get("recordar") != null) },
    });
  }

  // Camino JS (fetch): JSON.
  const b = await req.json().catch(() => ({}));
  if (String(b.password ?? "") !== PASS) return new Response("Contraseña incorrecta", { status: 401 });
  const res = Response.json({ ok: true });
  res.headers.set("Set-Cookie", cookie(!!b.recordar));
  return res;
}
