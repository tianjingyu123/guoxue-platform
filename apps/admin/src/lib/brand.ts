/**
 * 平台品牌配置（admin 端·单一事实来源·租-T0 品牌抽象）
 * 后台所有品牌露出（侧边栏 Logo/登录页/欢迎页/大屏水印/预置文案）统一引用，确保口径一致。
 *
 * 内置默认值 = 现状"热卜"口径（与 apps/mobile/src/lib/brand.ts 完全一致）；
 * 应用启动时从后端 GET /system/public/brand-config 水合，
 * 后台「系统管理 → 品牌配置」改一处配置全端生效。
 * 拉取失败时静默保留内置默认值（品牌兜底属配置降级，非业务数据 mock）。
 */
import { reactive } from "vue";
import { systemApi } from "@/api";

export interface BrandConfig {
  /** 站名（全称） */
  name: string;
  /** 站名（简称·印章两字） */
  nameShort: string;
  /** 英文名 */
  nameEn: string;
  /** 主标语 */
  slogan: string;
  /** 备用标语 */
  sloganAlt: string;
  /** 副标题 */
  tagline: string;
  /** 版权/页脚文案 */
  copyright: string;
  /** 二维码引导语 */
  qrGuide: string;
  /** Logo 图片地址（空=内置印章 Logo） */
  logoUrl: string;
  /** 品牌主色 */
  primaryColor: string;
  /** H5 入口地址 */
  h5Url: string;
  /** 客服电话 */
  servicePhone: string;
  /** 客服邮箱 */
  serviceEmail: string;
  /** 客服微信 */
  serviceWechat: string;
  /** 协议主体：公司全称 */
  companyName: string;
  /** 协议主体：平台名 */
  platformName: string;
}

/** 后端字段 → 前端字段映射（后端 siteName* 命名，前端沿用历史 name* 命名，其余同名） */
const FIELD_MAP: Record<string, keyof BrandConfig> = {
  siteName: "name",
  siteNameShort: "nameShort",
  siteNameEn: "nameEn",
  slogan: "slogan",
  sloganAlt: "sloganAlt",
  tagline: "tagline",
  copyright: "copyright",
  qrGuide: "qrGuide",
  logoUrl: "logoUrl",
  primaryColor: "primaryColor",
  h5Url: "h5Url",
  servicePhone: "servicePhone",
  serviceEmail: "serviceEmail",
  serviceWechat: "serviceWechat",
  companyName: "companyName",
  platformName: "platformName",
};

export const BRAND = reactive<BrandConfig>({
  name: "热卜国学",
  nameShort: "热卜",
  nameEn: "REBU",
  slogan: "探寻东方智慧",
  sloganAlt: "观天地 · 明心性",
  tagline: "国学知识平台",
  copyright: "热卜国学 · 让国学回归生活",
  qrGuide: "长按识别 · 开启国学之旅",
  logoUrl: "",
  primaryColor: "#c41e3a",
  h5Url: "https://api.rebugx.cn/h5/",
  servicePhone: "",
  serviceEmail: "support@rebu.com",
  serviceWechat: "rebu_guoxue",
  companyName: "",
  platformName: "热卜国学",
});

let hydrating: Promise<void> | null = null;

/** 启动时从后端水合品牌配置（main.ts 调用·幂等·失败静默用内置默认值并允许下次重试） */
export function hydrateBrandConfig(): Promise<void> {
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const res = await systemApi.getBrandConfig();
      const cfg = res?.data as Record<string, unknown> | undefined;
      if (!cfg) return;
      for (const [remoteKey, localKey] of Object.entries(FIELD_MAP)) {
        const v = cfg[remoteKey];
        // 仅在返回值为非空字符串时覆盖内置默认值
        if (typeof v === "string" && v !== "") BRAND[localKey] = v;
      }
    } catch {
      // 静默降级：品牌配置拉取失败时保留内置默认值，不影响启动
      hydrating = null; // 允许下次重试
    }
  })();
  return hydrating;
}
