import { BRAND } from "@/lib/brand";

export interface ShareLinkOptions {
  title?: string;
  text?: string;
  url?: string;
}
export type ShareQuery = Record<string, string | number | boolean | undefined | null>;

/** 按当前 history 路由模式生成可外部打开的 H5 深链；禁止再拼 /#/ 旧 hash 地址。 */
export function buildH5Url(route: string, params: ShareQuery = {}): string {
  const envH5Url = String((import.meta as any).env?.VITE_PUBLIC_H5_URL || "");
  let base = (BRAND.h5Url || envH5Url).replace(/\/+$/, "");
  if (!base) throw new Error("未配置 H5 公网地址，无法生成分享链接");
  // #ifdef H5
  if (typeof window !== "undefined" && window.location?.origin) {
    const rawBase = String((import.meta as any).env?.BASE_URL || "/h5/");
    const basePath = `/${rawBase}`.replace(/\/+/g, "/").replace(/\/+$/, "");
    base = `${window.location.origin}${basePath}`;
  }
  // #endif

  const cleanRoute = String(route || "").replace(/^\/+/, "");
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  const url = cleanRoute ? `${base}/${cleanRoute}` : base;
  return `${url}${query ? `?${query}` : ""}`;
}

/** 生成当前页面的正式 H5 链接；H5 保留浏览器完整 query，App/小程序从页面栈重建。 */
export function getCurrentShareUrl(): string {
  if (typeof window !== "undefined" && window.location?.href) return window.location.href;
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as unknown as {
    route?: string;
    options?: Record<string, string | number | boolean | undefined | null>;
  };
  const route = String(current?.route || "pages/index/index").replace(/^\//, "");
  return buildH5Url(route, current?.options || {});
}

function copyLink(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.setClipboardData({
      data: url,
      success: () => {
        uni.showToast({ title: "链接已复制", icon: "none" });
        resolve(true);
      },
      fail: () => {
        uni.showToast({ title: "复制失败，请稍后重试", icon: "none" });
        resolve(false);
      },
    });
  });
}

/**
 * 优先调用浏览器系统分享；不支持时复制正式链接。
 * 用户主动取消系统分享不伪报成功，也不强行回退剪贴板。
 */
export async function shareLink(options: ShareLinkOptions = {}): Promise<boolean> {
  const url = options.url || getCurrentShareUrl();
  if (!url) {
    uni.showToast({ title: "分享链接生成失败", icon: "none" });
    return false;
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: options.title, text: options.text, url });
        return true;
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return false;
        // 系统分享异常时回退复制，保证用户仍能完成动作。
      }
    }
  }
  return copyLink(url);
}
