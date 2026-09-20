import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { homeFor, pathBelongsToRole } from "@/lib/auth/roles";

// المسارات دي مفتوحة تمامًا للزائر بدون تسجيل دخول — تصفّح حر للموقع
const PUBLIC_PREFIXES = ["/", "/home", "/categories", "/products", "/cart", "/legal"];

function isPublicRoute(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // نفس السبب المذكور في lib/supabase/server.ts — الدور والصلاحيات
      // لازم يتقروا طازة من الداتابيز في كل طلب بدون أي كاش من Next.js.
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) => fetch(url, { ...options, cache: "no-store" })
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/reset-password");
  const publicRoute = isPublicRoute(pathname);

  if (!user) {
    if (isAuthRoute || publicRoute) return response;
    // مسار محمي (مثل /checkout أو /orders) وزائر مش مسجّل دخول:
    // نوجّهه لتسجيل الدخول مع الاحتفاظ بمكانه عشان يرجعله بعد الدخول مباشرة
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role,status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    if (isAuthRoute || publicRoute) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (profile.status !== "active") {
    if (pathname !== "/blocked") return NextResponse.redirect(new URL("/blocked", request.url));
    return response;
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(homeFor(profile.role), request.url));
  }

  if (!pathBelongsToRole(pathname, profile.role) && !publicRoute) {
    return NextResponse.redirect(new URL(homeFor(profile.role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api|.*\\.(?:svg|png|jpg|jpeg|webp|js|json)).*)"]
};
