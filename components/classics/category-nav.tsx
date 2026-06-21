"use client"

import { cn } from "@/lib/utils"
import { ScrollText, BookOpen, Lightbulb, PenLine } from "lucide-react"

export interface CategoryNavProps {
  activeCategory?: string
  onCategoryChange?: (category: string) => void
  className?: string
}

// 四库全书分类 - 使用古籍专属配色
const categories = [
  { 
    id: "jing", 
    name: "经部", 
    icon: ScrollText,
    desc: "儒家经典",
    // 使用 CSS 变量实现古朴配色
    cssVar: "--classics-jing",
  },
  { 
    id: "shi", 
    name: "史部", 
    icon: BookOpen,
    desc: "历史典籍",
    cssVar: "--classics-shi",
  },
  { 
    id: "zi", 
    name: "子部", 
    icon: Lightbulb,
    desc: "诸子百家",
    cssVar: "--classics-zi",
  },
  { 
    id: "ji", 
    name: "集部", 
    icon: PenLine,
    desc: "文学作品",
    cssVar: "--classics-ji",
  },
]

export function CategoryNav({ activeCategory, onCategoryChange, className }: CategoryNavProps) {
  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:gap-3", className)}>
      {categories.map(cat => {
        const Icon = cat.icon
        const isActive = activeCategory === cat.id
        
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange?.(isActive ? "" : cat.id)}
            className={cn(
              "relative py-3 sm:py-4 px-2 rounded-xl text-center transition-all duration-200 touch-manipulation",
              isActive
                ? "shadow-lg scale-[1.02]"
                : "hover:scale-[1.01] active:scale-[0.98]"
            )}
            style={{
              backgroundColor: isActive 
                ? `var(${cat.cssVar})` 
                : `color-mix(in srgb, var(${cat.cssVar}) 10%, transparent)`,
              color: isActive ? 'white' : `var(${cat.cssVar})`,
            }}
          >
            <Icon className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1",
              isActive ? "text-white" : ""
            )} 
            style={{ color: isActive ? 'white' : `var(${cat.cssVar})` }}
            />
            <span className="text-xs sm:text-sm font-medium block">
              {cat.name}
            </span>
            <span className={cn(
              "text-[10px] sm:text-xs mt-0.5 block",
              isActive ? "text-white/80" : "opacity-70"
            )}>
              {cat.desc}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// 朝代筛选
const dynasties = [
  { id: "all", name: "全部" },
  { id: "zhou", name: "周" },
  { id: "chunqiu", name: "春秋战国" },
  { id: "qin", name: "秦" },
  { id: "han", name: "汉" },
  { id: "sanguo", name: "三国" },
  { id: "jin", name: "晋" },
  { id: "nanbei", name: "南北朝" },
  { id: "sui", name: "隋" },
  { id: "tang", name: "唐" },
  { id: "song", name: "宋" },
  { id: "yuan", name: "元" },
  { id: "ming", name: "明" },
  { id: "qing", name: "清" },
]

export interface DynastyFilterProps {
  activeDynasty?: string
  onDynastyChange?: (dynasty: string) => void
  className?: string
}

export function DynastyFilter({ activeDynasty = "all", onDynastyChange, className }: DynastyFilterProps) {
  return (
    <div className={cn("flex overflow-x-auto scrollbar-hide gap-2 py-1", className)}>
      {dynasties.map(d => (
        <button
          key={d.id}
          onClick={() => onDynastyChange?.(d.id)}
          className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            activeDynasty === d.id 
              ? "bg-amber-600 text-white" 
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {d.name}
        </button>
      ))}
    </div>
  )
}

// 类型筛选
const types = [
  { id: "all", name: "全部" },
  { id: "lishi", name: "历史" },
  { id: "foxue", name: "佛学" },
  { id: "zhongyi", name: "中医" },
  { id: "shushu", name: "术数" },
  { id: "xiaoshuo", name: "小说" },
  { id: "shici", name: "诗词" },
  { id: "wenxue", name: "文学" },
  { id: "zhexue", name: "哲学" },
  { id: "yixue", name: "易学" },
  { id: "bingfa", name: "兵法" },
  { id: "keji", name: "科技" },
  { id: "daojiao", name: "道教" },
  { id: "dili", name: "地理" },
]

export interface TypeFilterProps {
  activeType?: string
  onTypeChange?: (type: string) => void
  className?: string
}

export function TypeFilter({ activeType = "all", onTypeChange, className }: TypeFilterProps) {
  return (
    <div className={cn("flex overflow-x-auto scrollbar-hide gap-2 py-1", className)}>
      {types.map(t => (
        <button
          key={t.id}
          onClick={() => onTypeChange?.(t.id)}
          className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            activeType === t.id 
              ? "bg-primary text-primary-foreground" 
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}

// 导出分类数据供其他组件使用
export { categories, dynasties, types }
