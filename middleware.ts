import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// خرائط المسارات المسموحة لكل دور — أي مسار خارج قائمة الدور يُعاد توجيهه
const ROLE_HOME: Record<string, string> = {
  customer: "/home",
  delivery_agent: "/agent/dashboard",
  business_admin: "/admin/dashboard",
  super_admin: "/admin/dashboard"
};

function pathBelongsToRole(pathname: string, role: string) {
  if (pathname.startsWith("/admin")) return role === "business_admin" || role === "super_admin";
  if (pathname.startsWith("/super")) return role === "super_admin";
  if (pathname.startsWith("/agent")) return role === "delivery_agent";
  // مسارات العميل: كل ما تبقى خارج admin/agent/super وخارج auth
  return true;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
  const isPublicRoute = pathname === "/" || pathname.startsWith("/categories") || pathname.startsWith("/products") || pathname.startsWith("/reset-password");

  if (!user) {
    if (isAuthRoute || isPublicRoute) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role,status")
    .eq("id", user.id)
    .single();

  if (!profile) return response;

  if (profile.status !== "active") {
    if (pathname !== "/blocked") return NextResponse.redirect(new URL("/blocked", request.url));
    return response;
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(ROLE_HOME[profile.role] ?? "/home", request.url));
  }

  if (!pathBelongsToRole(pathname, profile.role) && !isPublicRoute) {
    return NextResponse.redirect(new URL(ROLE_HOME[profile.role] ?? "/home", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api|.*\\.(?:svg|png|jpg|jpeg|webp|js|json)).*)"]
};
