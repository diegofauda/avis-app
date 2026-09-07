import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_TOKEN } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // El login y su API siempre accesibles.
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  if (req.cookies.get("avis_auth")?.value === AUTH_TOKEN) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Protege todo menos estáticos y el manifest/íconos (para que la PWA cargue sin login).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|avis-logo.png|cow-bg.png|manifest.webmanifest|apple-icon|icon).*)"],
};
