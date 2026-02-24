export interface HomeGuideAutoStartOptions {
  pathname?: string | null | undefined;
  seenValue?: string | null | undefined;
}

export function isHomePagePath(pathname: string | null | undefined): boolean {
  const path = typeof pathname === "string" ? pathname : "";
  return path === "/" || /\/index\.html?$/.test(path) || path === "";
}

export function shouldAutoStartHomeGuide(options: HomeGuideAutoStartOptions): boolean {
  const opts = options || {};
  if (!isHomePagePath(opts.pathname)) return false;
  return String(opts.seenValue || "0") !== "1";
}
