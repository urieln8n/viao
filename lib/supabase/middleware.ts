import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// F3-06 (VIAO_ROADMAP.md) — únicas rutas que dependen de datos reales de
// usuario hoy (F3-05, `profiles`). El resto de rutas de producto
// (/search, /trips, /rewards) siguen siendo placeholders estáticos de F2-02
// sin lógica de sesión: protegerlas ahora sería inventar una regla de
// producto no justificada por el estado real del proyecto.
const PROTECTED_PATHS = ["/profile"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida el JWT contra Supabase Auth (a diferencia de
  // getSession(), que solo lee la cookie local sin verificarla) — es la
  // única comprobación válida para autorizar acceso server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Importante: se debe devolver este `supabaseResponse` tal cual (o una
  // copia que preserve sus cookies) — es el que lleva las cookies de
  // sesión refrescadas. Crear una NextResponse nueva aquí perdería el
  // refresco de sesión gestionado por @supabase/ssr.
  return supabaseResponse;
}
