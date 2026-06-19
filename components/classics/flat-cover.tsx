import { cn } from "@/lib/utils"

export type CoverColor = "cream" | "brown" | "green" | "red" | "gray" | "blue"

/**
 * 一类一色规则：分类关键词 → 配色
 * 易经=米金 / 命理·经部·儒家=赭棕 / 史部·紫微=藏青 / 子部·道·医·兵·风水=松绿 / 集部·诗词·奇门=朱红 / 其他=墨灰
 */
const KEYWORD_COLOR: [string, CoverColor][] = [
  ["易经", "cream"], ["周易", "cream"], ["易类", "cream"], ["梅花", "cream"], ["预测", "cream"], ["占卜", "cream"],
  ["命理", "brown"], ["八字", "brown"], ["子平", "brown"], ["滴天髓", "brown"], ["三命", "brown"], ["渊海", "brown"], ["穷通", "brown"],
  ["紫微", "blue"], ["斗数", "blue"],
  ["风水", "green"], ["堪舆", "green"], ["阳宅", "green"], ["葬", "green"], ["地理", "green"],
  ["奇门", "red"], ["遁甲", "red"], ["六壬", "red"], ["太乙", "red"],
]

// 知名古籍的分类归属，保证同一本书跨页面颜色一致
const TITLE_CATEGORY: Record<string, string> = {
  周易: "易经", 梅花易数: "易经",
  论语: "儒家", 孟子: "儒家", 大学: "儒家", 中庸: "儒家", 尚书: "经部", 诗经: "经部",
  道德经: "道家", 庄子: "道家", 黄帝内经: "医家", 孙子兵法: "兵家", 韩非子: "法家", 墨子: "诸子", 鬼谷子: "诸子", 山海经: "子部",
  史记: "史部", 资治通鉴: "史部", 汉书: "史部", 三国志: "史部", 左传: "史部", 战国策: "史部",
  楚辞: "集部", 李太白集: "集部", 杜工部集: "集部", 东坡乐府: "集部", 漱玉词: "集部", 文心雕龙: "集部", 聊斋志异: "集部", 金瓶梅: "集部",
  滴天髓: "命理", 子平真诠: "命理", 三命通会: "命理", 渊海子平: "命理", 穷通宝鉴: "命理",
  紫微斗数全书: "紫微", 葬经: "风水", 阳宅三要: "风水", 地理五诀: "风水", 奇门遁甲大全: "奇门",
}

function categoryToColor(cat: string): CoverColor {
  for (const [kw, color] of KEYWORD_COLOR) if (cat.includes(kw)) return color
  if (/经|儒/.test(cat)) return "brown"
  if (/史/.test(cat)) return "blue"
  if (/子|道|医|兵|法|墨|诸子|纵横/.test(cat)) return "green"
  if (/集|诗|词|赋|文/.test(cat)) return "red"
  return "gray"
}

/** 根据书名 / 分类得到稳定的封面色，实现「一类一色」且跨页一致 */
export function coverColorForBook(title?: string, category?: string): CoverColor {
  const cat = category || (title ? TITLE_CATEGORY[title.replace(/[《》]/g, "")] : undefined)
  return cat ? categoryToColor(cat) : "gray"
}

// 平面书封配色 - 苹果 Books 风格：饱和渐变 + 可控排版
const palette: Record<
  CoverColor,
  { from: string; to: string; title: string; sub: string; accent: string }
> = {
  red: { from: "#c8324c", to: "#9e1b30", title: "#fff", sub: "rgba(255,255,255,0.72)", accent: "rgba(255,255,255,0.9)" },
  brown: { from: "#a06a38", to: "#6f4521", title: "#fff", sub: "rgba(255,255,255,0.72)", accent: "rgba(255,255,255,0.9)" },
  green: { from: "#3f8560", to: "#27543b", title: "#fff", sub: "rgba(255,255,255,0.72)", accent: "rgba(255,255,255,0.9)" },
  blue: { from: "#3a6196", to: "#243f63", title: "#fff", sub: "rgba(255,255,255,0.72)", accent: "rgba(255,255,255,0.9)" },
  gray: { from: "#5b5b66", to: "#33333c", title: "#fff", sub: "rgba(255,255,255,0.7)", accent: "rgba(255,255,255,0.85)" },
  cream: { from: "#f6efe2", to: "#e7d8bd", title: "#5a4326", sub: "rgba(90,67,38,0.6)", accent: "rgba(90,67,38,0.8)" },
}

interface FlatCoverProps {
  title: string
  /** 朝代/作者等顶部小标签 */
  label?: string
  /** 底部副信息（作者） */
  footer?: string
  coverColor?: CoverColor
  className?: string
  titleClassName?: string
}

/**
 * 平面书封 - 苹果风
 * 纯平面渐变卡片，标题横排、位置完全可控，告别立体线装书无法控制字位的问题。
 */
export function FlatCover({
  title,
  label,
  footer,
  coverColor = "cream",
  className,
  titleClassName,
}: FlatCoverProps) {
  const c = palette[coverColor]
  return (
    <div
      className={cn(
        "relative aspect-[3/4] rounded-2xl overflow-hidden flex flex-col justify-between p-3 sm:p-3.5",
        "shadow-sm ring-1 ring-black/5",
        className,
      )}
      style={{ background: `linear-gradient(150deg, ${c.from}, ${c.to})` }}
    >
      {/* 顶部小标签 */}
      {label ? (
        <span
          className="self-start text-[9px] sm:text-[10px] font-medium tracking-wide px-1.5 py-0.5 rounded-md"
          style={{ color: c.title, backgroundColor: "rgba(255,255,255,0.16)" }}
        >
          {label}
        </span>
      ) : (
        <span />
      )}

      {/* 标题 - 横排，位置可控；≤4字用 2+2 方块排版，更工整也避免零散换行 */}
      <div className="flex-1 flex items-center">
        <h3
          className={cn(
            "font-serif font-bold leading-[1.15] tracking-[0.08em] text-balance",
            titleClassName ?? "text-lg sm:text-xl",
          )}
          style={{ color: c.title, maxWidth: title.replace(/[《》]/g, "").length === 4 ? "2.4em" : undefined }}
        >
          {title.replace(/[《》]/g, "")}
        </h3>
      </div>

      {/* 底部副信息 + 细装饰线 */}
      <div>
        <span className="block w-7 h-px mb-1.5" style={{ backgroundColor: c.accent }} />
        {footer ? (
          <p className="text-[10px] sm:text-[11px] truncate" style={{ color: c.sub }}>
            {footer}
          </p>
        ) : null}
      </div>
    </div>
  )
}
