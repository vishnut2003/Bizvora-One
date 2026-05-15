import { NextResponse } from "next/server";
import { auth } from "@/config/auth";
import {
  LOGIN_PATH,
  POST_LOGIN_REDIRECT,
  isAuthPage,
  isProtectedPath,
} from "@/config/routes";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 1. Block unauthenticated access to protected routes.
  if (isProtectedPath(nextUrl.pathname) && !isLoggedIn) {
    const loginUrl = new URL(LOGIN_PATH, nextUrl);
    loginUrl.searchParams.set(
      "callbackUrl",
      nextUrl.pathname + nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  // 2. Bounce signed-in users away from login/signup pages.
  if (isAuthPage(nextUrl.pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL(POST_LOGIN_REDIRECT, nextUrl));
  }

  // 3. Add custom logic below (logging, headers, role checks, A/B, etc.)

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
