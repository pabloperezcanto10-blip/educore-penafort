export type ToastType = "success" | "error" | "warning" | "info";

export function withToast(href: string, type: ToastType, message: string) {
  const [pathname, queryString = ""] = href.split("?");
  const params = new URLSearchParams(queryString);

  params.set("toast_type", type);
  params.set("toast_message", message);
  params.set("toast_id", String(Date.now()));

  return `${pathname}?${params.toString()}`;
}
