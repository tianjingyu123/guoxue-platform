/**
 * 古籍竖排字体配置
 * 字体分层回退链：霞鹜文楷 → 思源宋体 → 天珩全字库 → 系统兜底
 * 覆盖 90,000+ 字符，支持扩展 A-I 区生僻字
 */

export interface FontFace {
  family: string;
  weight: number | string;
  style: string;
  url: string;
  format: "woff2" | "woff" | "truetype";
  unicodeRange?: string;
  display: "swap" | "block" | "fallback" | "optional";
}

export interface FontLayer {
  name: string;
  description: string;
  priority: number;  // 1=最高优先
  coverage: string;  // 覆盖字符集描述
  faces: FontFace[];
}

/** 基础字体 CDN 地址（部署时替换为实际 CDN 域名） */
const FONT_CDN_BASE = process.env.FONT_CDN_BASE || "/fonts";

export const FONT_LAYERS: FontLayer[] = [
  {
    name: "霞鹜文楷",
    description: "LXGW WenKai — 开源楷体，覆盖 CJK 基本区 + 扩展A（27,000+ 字符）",
    priority: 1,
    coverage: "CJK Unified Ideographs (U+4E00–U+9FFF) + Extension A",
    faces: [
      {
        family: "LXGW WenKai",
        weight: 400,
        style: "normal",
        url: `${FONT_CDN_BASE}/LXGWWenKai-Regular.woff2`,
        format: "woff2",
        unicodeRange: "U+4E00-9FFF, U+3400-4DBF",
        display: "swap",
      },
      {
        family: "LXGW WenKai",
        weight: 700,
        style: "normal",
        url: `${FONT_CDN_BASE}/LXGWWenKai-Bold.woff2`,
        format: "woff2",
        unicodeRange: "U+4E00-9FFF, U+3400-4DBF",
        display: "swap",
      },
    ],
  },
  {
    name: "思源宋体",
    description: "Source Han Serif — Adobe/Google 联合开发宋体，覆盖 CJK 基本区 + 扩展A-F（44,000+ 字符）",
    priority: 2,
    coverage: "CJK Unified Ideographs + Extension A–F",
    faces: [
      {
        family: "Source Han Serif",
        weight: 400,
        style: "normal",
        url: `${FONT_CDN_BASE}/SourceHanSerifCN-Regular.woff2`,
        format: "woff2",
        unicodeRange: "U+4E00-9FFF, U+3400-4DBF, U+20000-2A6DF, U+2A700-2B73F, U+2B740-2B81F, U+2B820-2CEAF",
        display: "swap",
      },
    ],
  },
  {
    name: "天珩全字库",
    description: "TH-Khaai — 全汉字覆盖（90,000+ 字符），含扩展 A-I 区生僻字",
    priority: 3,
    coverage: "CJK Unified Ideographs + Extension A–I (90,000+)",
    faces: [
      {
        family: "TH-Khaai-PP0",
        weight: 400,
        style: "normal",
        url: `${FONT_CDN_BASE}/TH-Khaai-PP0.woff2`,
        format: "woff2",
        // 扩展 G-I 区生僻字（#1 古籍善本特有）
        unicodeRange: "U+30000-3134F, U+2CEB0-2EBEF",
        display: "swap",
      },
      {
        family: "TH-Khaai-PP1",
        weight: 400,
        style: "normal",
        url: `${FONT_CDN_BASE}/TH-Khaai-PP1.woff2`,
        format: "woff2",
        unicodeRange: "U+2F800-2FA1F, U+E0000-E007F",
        display: "swap",
      },
    ],
  },
  {
    name: "系统兜底",
    description: "System fallback — 宋体/楷体/黑体按系统原生支持",
    priority: 4,
    coverage: "System native fonts",
    faces: [
      {
        family: "SimSun",
        weight: 400,
        style: "normal",
        url: "local('SimSun')",
        format: "truetype",
        display: "fallback",
      },
    ],
  },
];

/** 竖排 CSS */
export const VERTICAL_CSS = `
/* 古籍竖排排版样式 */
.classic-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: "LXGW WenKai", "Source Han Serif", "TH-Khaai-PP0", "TH-Khaai-PP1", "SimSun", serif;
  line-height: 2;
  letter-spacing: 0.15em;
}
`;

/** 生成 @font-face CSS */
export function generateFontFaceCSS(): string {
  const allFaces = FONT_LAYERS.flatMap((layer) => layer.faces);

  return allFaces.map((face) => {
    const parts = [
      `@font-face {`,
      `  font-family: "${face.family}";`,
      `  font-weight: ${face.weight};`,
      `  font-style: ${face.style};`,
      `  src: ${face.url.startsWith("local(") ? face.url : `url("${face.url}") format("${face.format}")`};`,
      `  font-display: ${face.display};`,
    ];
    if (face.unicodeRange) {
      parts.push(`  unicode-range: ${face.unicodeRange};`);
    }
    parts.push("}");
    return parts.join("\n");
  }).join("\n\n");
}
