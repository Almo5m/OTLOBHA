import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { homeFor, isStaffPath, pathBelongsToRole } from "@/lib/auth/roles";

// الموقع كله مفتوح للزوار (العميل بيطلب من غير حساب). الحماية بس على مسارات
// الإداريين (/admin و/agent و/super)، وصفحة الدخول بتحوّل الإداري لمكانه.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request: { headers: request.headers } });

  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const staffArea = isStaffPath(pathname);

  // الزائر العادي مش محتاج نكلم Supabase خالص
  if (!staffArea && !isLogin && pathname !== "/blocked") return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // الدور والصلاحيات لازم يتقروا طازة من الداتابيز في كل طلب بدون كاش
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

  if (!user) {
    if (staffArea) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  // حساب في Auth من غير صف في users = مش إداري
  if (!profile) {
    if (staffArea) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  if (profile.status !== "active") {
    if (pathname !== "/blocked") return NextResponse.redirect(new URL("/blocked", request.url));
    return response;
  }

  if (isLogin) {
    return NextResponse.redirect(new URL(homeFor(profile.role), request.url));
  }

  if (staffArea && !pathBelongsToRole(pathname, profile.role)) {
    return NextResponse.redirect(new URL(homeFor(profile.role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api|.*\\.(?:svg|png|jpg|jpeg|webp|js|json)).*)"]
};
