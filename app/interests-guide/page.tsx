"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { recommendApi, type InterestTag } from "@/lib/api"

// ── 兜底数据（API 未返回时使用） ─────────────────────────────────────
const FALLBACK_TAGS: InterestTag[] = [
  { id: "1",  name: "八字命理", category: "命理", icon: "🔮" },
  { id: "2",  name: "紫微斗数", category: "命理", icon: "⭐" },
  { id: "3",  name: "六爻占卜", category: "命理", icon: "☯" },
  { id: "4",  name: "风水堪舆", category: "风水", icon: "🏠" },
  { id: "5",  name: "奇门遁甲", category: "命理", icon: "🧭" },
  { id: "6",  name: "周易易经", category: "经典", icon: "📖" },
  { id: "7",  name: "诗词歌赋", category: "诗词", icon: "🖋" },
  { id: "8",  name: "唐诗宋词", category: "诗词", icon: "📜" },
  { id: "9",  name: "中医养生", category: "养生", icon: "🌿" },
  { id: "10", name: "太极武术", category: "武术", icon: "🥋" },
  { id: "11", name: "茶道文化", category: "茶道", icon: "🍵" },
  { id: "12", name: "书法艺术", category: "书法", icon: "✍️" },
  { id: "13", name: "国画丹青", category: "国画", icon: "🎨" },
  { id: "14", name: "古典音乐", category: "音乐", icon: "🎵" },
  { id: "15", name: "中华历史", category: "历史", icon: "🏛" },
  { id: "16", name: "道家文化", category: "经典", icon: "☯" },
  { id: "17", name: "儒家经典", category: "经典", icon: "📚" },
  { id: "18", name: "佛学禅意", category: "经典", icon: "🪷" },
  { id: "19", name: "节气民俗", category: "民俗", icon: "🎑" },
  { id: "20", name: "琴棋书画", category: "艺术", icon: "♟" },
  { id: "21", name: "花鸟虫鱼", category: "自然", icon: "🌸" },
  { id: "22", name: "篆刻印章", category: "书法", icon: "🔖" },
  { id: "23", name: "器物收藏", category: "收藏", icon: "🏺" },
  { id: "24", name: "占星星座", category: "命理", icon: "🌙" },
]

const MIN_SELECT = 3
const MAX_SELECT = 8

// ── 单个标签组件 ───────────────────────────────────────────────────
interface TagChipProps {
  tag: InterestTag
  selected: boolean
  disabled: boolean
  onToggle: (id: string) => void
}

function TagChip({ tag, selected, disabled, onToggle }: TagChipProps) {
  return (
    <button
      onClick={() => !disabled && onToggle(tag.id)}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all duration-200 active:scale-95",
        selected
          ? "bg-[#C41E3A] border-[#C41E3A] shadow-[0_2px_12px_rgba(196,30,58,0.3)]"
          : disabled
          ? "bg-white/50 border-[#E8E0D5] opacity-50 cursor-not-allowed"
          : "bg-white border-[#E8E0D5] hover:border-[#C41E3A]/40 hover:shadow-sm"
      )}
    >
      <span className="text-base leading-none">{tag.icon}</span>
      <span
        className={cn(
          "text-[13px] font-medium leading-none",
          selected ? "text-white" : "text-[#2C2C2C]"
        )}
      >
        {tag.name}
      </span>
      {selected && (
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/25">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

// ── 步骤指示器 ─────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i + 1 === current
              ? "w-5 h-2 bg-[#C41E3A]"
              : i + 1 < current
              ? "w-2 h-2 bg-[#C41E3A]/60"
              : "w-2 h-2 bg-[#E8E0D5]"
          )}
        />
      ))}
      <span className="text-[12px] text-[#999999] ml-1">
        {current}/{total}
      </span>
    </div>
  )
}

// ── 主页面 ─────────────────────────────────────────────────────────
export default function InterestsGuidePage() {
  const router = useRouter()
  const [tags, setTags] = useState<InterestTag[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [shakeBtn, setShakeBtn] = useState(false)

  // 加载默认兴趣标签
  useEffect(() => {
    recommendApi.defaultInterests()
      .then((data) => setTags(Array.isArray(data) && data.length ? data : FALLBACK_TAGS))
      .catch(() => setTags(FALLBACK_TAGS))
      .finally(() => setLoading(false))
  }, [])

  const toggleTag = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= MAX_SELECT) return prev   // 超出上限，静默拦截
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSubmit = async () => {
    if (selected.size < MIN_SELECT) {
      // 按钮抖动提示
      setShakeBtn(true)
      setTimeout(() => setShakeBtn(false), 600)
      return
    }
    setSubmitting(true)
    try {
      await recommendApi.setInterests(Array.from(selected))
    } catch {
      // 接口失败不阻断流程，继续跳转
    } finally {
      setSubmitting(false)
      router.replace("/")
    }
  }

  const remaining = MIN_SELECT - selected.size

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col overflow-hidden">

      {/* ── 顶部装饰背景 ── */}
      <div className="absolute inset-x-0 top-0 h-64 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#C41E3A]/8 via-[#C9A96E]/5 to-transparent" />
        {/* 飘散的八卦符号装饰 */}
        {["☯", "☷", "☵", "☳", "☴"].map((sym, i) => (
          <span
            key={i}
            className="absolute text-[#C41E3A]/10 font-serif select-none"
            style={{
              fontSize: `${20 + i * 8}px`,
              left: `${10 + i * 20}%`,
              top: `${10 + (i % 2) * 20}px`,
              transform: `rotate(${i * 15}deg)`,
            }}
          >
            {sym}
          </span>
        ))}
      </div>

      {/* ── 头部 ── */}
      <div className="relative z-10 pt-14 px-6 pb-4">
        {/* 步骤指示器 */}
        <div className="flex justify-end mb-6">
          <StepIndicator current={1} total={2} />
        </div>

        {/* AI推荐角标 */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C41E3A]/10 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#C41E3A]" />
          <span className="text-[12px] font-medium text-[#C41E3A]">AI 个性化推荐</span>
        </div>

        <h1 className="font-serif text-[26px] font-bold text-[#2C2C2C] leading-tight mb-2">
          选择你感兴趣的
          <br />
          <span className="text-[#C41E3A]">领域</span>
        </h1>
        <p className="text-[13px] text-[#999999]">
          已选 <span className="text-[#C41E3A] font-bold">{selected.size}</span>/{MAX_SELECT} 个
          {remaining > 0 && (
            <span className="ml-1 text-[#C9A96E]">·  还需选择 {remaining} 个</span>
          )}
        </p>
      </div>

      {/* ── 标签网格 ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {loading ? (
          // 骨架屏
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-full bg-[#F2EFEA] animate-pulse"
                style={{ width: `${60 + (i % 4) * 16}px` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {tags.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                selected={selected.has(tag.id)}
                disabled={!selected.has(tag.id) && selected.size >= MAX_SELECT}
                onToggle={toggleTag}
              />
            ))}
          </div>
        )}

        {/* 最多选8个提示 */}
        {selected.size >= MAX_SELECT && (
          <p className="mt-4 text-center text-[12px] text-[#C9A96E]">
            已达最多选择数量（{MAX_SELECT}个），可取消已选标签来更换
          </p>
        )}
      </div>

      {/* ── 底部操作区 ── */}
      <div className="px-5 pb-10 pt-3 bg-gradient-to-t from-[#FAF8F5] to-transparent">
        {/* 已选标签预览 */}
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
            {Array.from(selected).map(id => {
              const tag = tags.find(t => t.id === id)
              if (!tag) return null
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C41E3A]/10 text-[11px] text-[#C41E3A] font-medium"
                >
                  {tag.icon} {tag.name}
                </span>
              )
            })}
          </div>
        )}

        {/* 开始探索按钮 */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={cn(
            "w-full h-13 rounded-full flex items-center justify-center gap-2 text-[16px] font-bold transition-all duration-200",
            selected.size >= MIN_SELECT
              ? "bg-gradient-to-r from-[#C41E3A] to-[#E8314E] text-white shadow-[0_4px_20px_rgba(196,30,58,0.35)] active:scale-[0.98]"
              : "bg-[#E8E3DB] text-[#B0AAA0] cursor-not-allowed",
            shakeBtn && "animate-shake"
          )}
          style={{ height: "52px" }}
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>开始探索</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {selected.size < MIN_SELECT && (
          <p className="text-center text-[12px] text-[#BBBBBB] mt-2.5">
            至少选择 {MIN_SELECT} 个领域才能继续
          </p>
        )}
      </div>

      {/* 抖动 & 动画 */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}
