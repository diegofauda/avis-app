import { AUTH_TOKEN } from "@/lib/auth";

const PASS = process.env.AVIS_PASSWORD || "Avis*2026";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (String(b.password ?? "") !== PASS) {
    return new Response("Contraseña incorrecta", { status: 401 });
  }
  const recordar = !!b.recordar;
  const res = Response.json({ ok: true });
  // httpOnly: el cliente no puede leerla; el middleware la valida.
  const maxAge = recordar ? 60 * 60 * 24 * 365 : undefined; // 1 año o sesión
  const partes = [
    `avis_auth=${AUTH_TOKEN}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    // Secure solo en producción (HTTPS); en local HTTP el navegador rechazaría la cookie.
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
    ...(maxAge ? [`Max-Age=${maxAge}`] : []),
  ];
  res.headers.set("Set-Cookie", partes.join("; "));
  return res;
}
