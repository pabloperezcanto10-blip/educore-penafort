export type ToastType = "success" | "error" | "warning" | "info";

type ToastOptions = {
  refresh?: boolean;
};

export function withToast(
  href: string,
  type: ToastType,
  message: string,
  options: ToastOptions = {}
) {
  const [pathname, queryString = ""] = href.split("?");
  const params = new URLSearchParams(queryString);

  params.set("toast_type", type);
  params.set("toast_message", message);
  params.set("toast_id", String(Date.now()));
  if (options.refresh) {
    params.set("toast_refresh", "1");
  }

  return `${pathname}?${params.toString()}`;
}
