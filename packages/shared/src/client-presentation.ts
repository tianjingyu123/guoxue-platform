/** 包内声明式运营能力 V1；不下载脚本、不解析表达式、不改变授权与权益。 */
export const PRESENTATION_CAPABILITY = "presentation-v1";
/** 完整包构建导出的能力清单。能力可用不表示已展示、已获用户授权或已通过渠道发布审查。 */
export const CLIENT_CAPABILITY_PROFILES = {
  "managed-presentation-v1": {
    schemaVersion: 1,
    surfaces: ["home", "shop", "course", "circle", "agent"],
    components: ["notice", "richtext", "entry-grid"],
    capabilities: ["home-entries.v1"],
    nativeDependencies: [],
  },
  "legacy-v1": {
    schemaVersion: 1,
    surfaces: [],
    components: [],
    capabilities: [],
    nativeDependencies: [],
  },
  "presentation-v1": {
    schemaVersion: 1,
    surfaces: ["home", "discover", "live", "shop", "course", "circle", "agent"],
    components: ["notice", "richtext", "entry-grid", "banner"],
    capabilities: ["navigation.v1", "home-entries.v1", "home-feed.v1"],
    nativeDependencies: [],
  },
} as const;
export const PRESENTATION_SURFACES = [
  "home",
  "discover",
  "live",
  "shop",
  "course",
  "circle",
  "agent",
] as const;
export const PRESENTATION_ENTRIES = [
  { id: "course", icon: "book-open", label: "课程", href: "/courses" },
  { id: "mall", icon: "shopping-bag", label: "商城", href: "/mall" },
  { id: "classics", icon: "scroll-text", label: "古籍馆", href: "/pkg-classics/home/index" },
  { id: "audiobook", icon: "headphones", label: "听书", href: "/pkg-classics/audiobooks/index" },
  { id: "paipan", icon: "layout-grid", label: "排盘", href: "/pages/paipan/index" },
  { id: "article", icon: "file-text", label: "文章", href: "/pkg-circle/articles/index" },
  { id: "agent", icon: "bot", label: "智能体广场", href: "/agents" },
  { id: "circles", icon: "users", label: "圈子广场", href: "/pages/circles/index" },
  { id: "video", icon: "play", label: "视频", href: "/videos" },
  { id: "live", icon: "radio", label: "直播", href: "/pkg-live/plaza/index" },
] as const;
export type PresentationSurface = (typeof PRESENTATION_SURFACES)[number];
export interface PresentationEntry {
  id: string;
  visible: boolean;
  order: number;
  label?: string;
}
export interface PresentationBlock {
  id: string;
  type: "notice" | "richtext" | "entry-grid" | "banner";
  title: string;
  text: string;
  entries: string[];
  targetEntryId?: string;
  imagePath?: string;
  columns?: number;
}
export interface ClientPresentation {
  schemaVersion: 1;
  entries: PresentationEntry[];
  navigation: PresentationEntry[];
  homeChannels: Array<"recommend" | "following" | "hot" | "local">;
  pages: Partial<Record<PresentationSurface, PresentationBlock[]>>;
}
export const EMPTY_PRESENTATION: ClientPresentation = {
  schemaVersion: 1,
  entries: [],
  navigation: [],
  homeChannels: ["recommend", "following", "hot", "local"],
  pages: {},
};
const entryIds = new Set<string>(PRESENTATION_ENTRIES.map((entry) => entry.id));
function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("配置必须为对象");
  return value;
}
function keys(value: Record<string, any>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("声明式配置含未支持字段");
}
function text(value: unknown, max: number): string {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001f<>]/.test(value))
    throw new Error("文案格式或长度非法");
  return value;
}
function array(value: unknown, max: number): any[] {
  if (!Array.isArray(value) || value.length > max) throw new Error("配置列表超出范围");
  return value;
}
function entries(value: unknown, ids: Set<string>, strict: boolean): PresentationEntry[] {
  const seen = new Set<string>();
  return array(value ?? [], 20).flatMap((raw) => {
    const item = object(raw);
    keys(item, ["id", "visible", "order", "label"]);
    if (!ids.has(item.id)) {
      if (strict) throw new Error("入口不在包内能力白名单");
      return [];
    }
    if (
      seen.has(item.id) ||
      typeof item.visible !== "boolean" ||
      !Number.isInteger(item.order) ||
      item.order < 0 ||
      item.order > 100
    )
      throw new Error("入口重复或属性非法");
    seen.add(item.id);
    return [
      {
        id: item.id,
        visible: item.visible,
        order: item.order,
        ...(item.label === undefined ? {} : { label: text(item.label, 24) }),
      },
    ];
  });
}
/** 服务端严格拒绝未知能力；客户端缺组件时忽略该模块，其他已支持模块继续消费。 */
export function parseClientPresentation(value: unknown, strict = true): ClientPresentation {
  const raw = object(value);
  keys(raw, ["schemaVersion", "entries", "navigation", "homeChannels", "pages"]);
  if (raw.schemaVersion !== 1) throw new Error("不支持的声明式协议版本");
  const navigation = entries(raw.navigation, new Set(["circle", "discover", "paipan"]), strict);
  const homeChannels = array(raw.homeChannels ?? EMPTY_PRESENTATION.homeChannels, 4);
  if (
    !homeChannels.length ||
    homeChannels.some((channel) => !EMPTY_PRESENTATION.homeChannels.includes(channel)) ||
    new Set(homeChannels).size !== homeChannels.length
  )
    throw new Error("内容频道不在包内白名单");
  const pages: ClientPresentation["pages"] = {};
  for (const [surface, blocks] of Object.entries(object(raw.pages ?? {}))) {
    if (!(PRESENTATION_SURFACES as readonly string[]).includes(surface)) {
      if (strict) throw new Error("未支持的页面");
      continue;
    }
    const seen = new Set<string>();
    pages[surface as PresentationSurface] = array(blocks, 12).flatMap((value) => {
      const block = object(value);
      if (!["notice", "richtext", "entry-grid", "banner"].includes(block.type)) {
        if (strict) throw new Error("未支持的包内组件");
        return [];
      }
      keys(block, [
        "id",
        "type",
        "title",
        "text",
        "entries",
        "targetEntryId",
        "imagePath",
        "columns",
      ]);
      if (!/^[a-z][a-z0-9-]{1,47}$/.test(block.id) || seen.has(block.id))
        throw new Error("模块标识非法或重复");
      seen.add(block.id);
      const selected = array(block.entries ?? [], 10).filter((id) => {
        if (entryIds.has(id)) return true;
        if (strict) throw new Error("模块入口未内置");
        return false;
      });
      if (
        new Set(selected).size !== selected.length ||
        (block.targetEntryId !== undefined && !entryIds.has(block.targetEntryId))
      )
        throw new Error("模块入口重复或跳转非法");
      if (
        block.imagePath !== undefined &&
        (typeof block.imagePath !== "string" ||
          !/^\/assets\/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$/.test(block.imagePath))
      )
        throw new Error("图片仅接受公开资产源内的图片路径");
      if (block.type === "banner" && !block.imagePath) throw new Error("图片模块缺少图片路径");
      if (block.columns !== undefined && ![3, 4, 5].includes(block.columns))
        throw new Error("卡片列数只支持 3、4、5");
      return [
        {
          id: block.id,
          type: block.type,
          title: text(block.title, 60),
          text: text(block.text, 1000),
          entries: selected,
          ...(block.targetEntryId ? { targetEntryId: block.targetEntryId } : {}),
          ...(block.imagePath ? { imagePath: block.imagePath } : {}),
          ...(block.columns ? { columns: block.columns } : {}),
        },
      ];
    });
  }
  return {
    schemaVersion: 1,
    entries: entries(raw.entries, entryIds, strict),
    navigation,
    homeChannels,
    pages,
  };
}
/** 未配置入口沿用包内默认；隐藏只调整发现入口，不封锁已购服务或历史页面。 */
export function projectPresentationEntries<T extends { id: string; label: string }>(
  builtin: readonly T[],
  config: PresentationEntry[],
): T[] {
  return builtin
    .map((entry, index) => {
      const rule = config.find((rule) => rule.id === entry.id);
      return {
        entry: { ...entry, ...(rule?.label ? { label: rule.label } : {}) },
        visible: rule?.visible !== false,
        order: rule?.order ?? index,
      };
    })
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order)
    .map((item) => item.entry);
}
