export const PROTECTED_PREFIXES = ["/workspace"] as const;

export const AUTH_PAGES = ["/login", "/signup"] as const;

export const LOGIN_PATH = "/login";
export const POST_LOGIN_REDIRECT = "/workspace";

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => pathname === page);
}
