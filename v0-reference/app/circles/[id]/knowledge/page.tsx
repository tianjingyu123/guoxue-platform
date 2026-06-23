"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, Search, BookOpen, Clock, FileText,
  Check, X, ChevronDown, ChevronUp, Tag
} from "lucide-react"
import { circleApi, type KnowledgeItem } from "@/lib/api"

// 骨架屏
function KnowledgeSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-full mb-2" />
          <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-100 rounded-full w-16" />
            <div className="h-6 bg-gray-100 rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// 知识卡片
function KnowledgeCard({
  item,
  isOwner,
  onConfirm,
  onIgnore,
}: {
  item: KnowledgeItem
  isOwner: boolean
  onConfirm?: () => void
  onIgnore?: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const sourceIcon = {
    post: "帖子",
    article: "文章",
    manual: "手动",
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4">
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-[#2C2C2C] leading-tight flex-1">
            {item.title}
          </h3>
          {item.status === "pending" && (
            <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full whitespace-nowrap">
              待确认
            </span>
          )}
        </div>

        {/* 摘要 */}
        <p className="text-sm text-[#666666] leading-relaxed mb-3 line-clamp-2">
          {item.summary}
        </p>

        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-[#FAF8F5] text-[#666666] rounded-full flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-[#999999]">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 来源和时间 */}
        <div className="flex items-center justify-between text-xs text-[#999999]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {sourceIcon[item.source.type]}：{item.source.name}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* 展开详情 */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#E8E3DB]">
            <p className="text-sm text-[#666666] leading-relaxed whitespace-pre-wrap">
              {item.content}
            </p>
          </div>
        )}

        {/* 展开/收起按钮 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-[#C41E3A] py-2"
        >
          {expanded ? (
            <>
              收起 <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              查看详情 <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* 圈主操作按钮 - 仅待确认状态显示 */}
      {isOwner && item.status === "pending" && (
        <div className="flex border-t border-[#E8E3DB]">
          <button
            onClick={onIgnore}
            className="flex-1 py-3 flex items-center justify-center gap-1.5 text-sm text-[#999999] hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
            忽略
          </button>
          <div className="w-px bg-[#E8E3DB]" />
          <button
            onClick={onConfirm}
            className="flex-1 py-3 flex items-center justify-center gap-1.5 text-sm text-[#C41E3A] hover:bg-red-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            确认入库
          </button>
        </div>
      )}
    </div>
  )
}

export default function CircleKnowledgePage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [activeTab, setActiveTab] = useState<"confirmed" | "pending">("confirmed")
  const [keyword, setKeyword] = useState("")
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner] = useState(true) // 实际从用户权限获取

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const result = await circleApi.listKnowledge(circleId, {
          status: activeTab,
          keyword,
        })
        setItems(result.data)
      } catch {
        // Mock 数据
        setItems([
          {
            id: "1",
            title: "八字命理中的天干地支基础知识",
            summary: "天干地支是中国古代记录时间的系统，由十天干和十二地支组成。天干包括甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支包括子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。",
            content: "天干地支是中国古代记录时间的系统，由十天干和十二地支组成。\n\n天干包括：甲、乙、丙、丁、戊、己、庚、辛、壬、癸\n地支包括：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥\n\n天干与五行的对应关系：\n- 甲乙属木\n- 丙丁属火\n- 戊己属土\n- 庚辛属金\n- 壬癸属水",
            source: { type: "post", id: "p1", name: "周易大师的帖子" },
            status: activeTab,
            tags: ["八字", "天干地支", "基础"],
            createdAt: "2024-01-15T10:00:00Z",
          },
          {
            id: "2",
            title: "紫微斗数十二宫位详解",
            summary: "紫微斗数的命盘由十二个宫位组成，分别是命宫、兄弟宫、夫妻宫、子女宫、财帛宫、疾厄宫、迁移宫、奴仆宫、官禄宫、田宅宫、福德宫、父母宫。",
            content: "紫微斗数的命盘由十二个宫位组成：\n\n1. 命宫 - 代表个人性格特质\n2. 兄弟宫 - 兄弟姐妹关系\n3. 夫妻宫 - 婚姻感情\n4. 子女宫 - 子女缘分\n5. 财帛宫 - 财运状况\n6. 疾厄宫 - 健康状况\n7. 迁移宫 - 外出运势\n8. 奴仆宫 - 人际关系\n9. 官禄宫 - 事业发展\n10. 田宅宫 - 不动产\n11. 福德宫 - 精神生活\n12. 父母宫 - 与长辈关系",
            source: { type: "article", id: "a1", name: "紫微斗数入门" },
            status: activeTab,
            tags: ["紫微斗数", "宫位"],
            createdAt: "2024-01-14T15:30:00Z",
          },
          {
            id: "3",
            title: "风水中的五行生克关系",
            summary: "五行相生：木生火、火生土、土生金、金生水、水生木。五行相克：木克土、土克水、水克火、火克金、金克木。理解五行生克是风水学的基础。",
            content: "五行生克关系是风水学的核心理论：\n\n五行相生（循环促进）：\n- 木生火：木材燃烧产生火\n- 火生土：火燃烧后产生灰土\n- 土生金：金属从土中开采\n- 金生水：金属遇冷凝结水珠\n- 水生木：水滋润树木生长\n\n五行相克（相互制约）：\n- 木克土：树根破土\n- 土克水：土能阻挡水流\n- 水克火：水能灭火\n- 火克金：火能熔化金属\n- 金克木：金属能砍伐树木",
            source: { type: "manual", name: "管理员整理" },
            status: activeTab,
            tags: ["风水", "五行"],
            createdAt: "2024-01-13T09:00:00Z",
          },
        ])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [circleId, activeTab, keyword])

  // 确认入库
  const handleConfirm = async (id: string) => {
    try {
      await circleApi.confirmKnowledge(circleId, id)
      setItems(items.filter((item) => item.id !== id))
    } catch {
      // 乐观更新
      setItems(items.filter((item) => item.id !== id))
    }
  }

  // 忽略
  const handleIgnore = async (id: string) => {
    try {
      await circleApi.ignoreKnowledge(circleId, id)
      setItems(items.filter((item) => item.id !== id))
    } catch {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const pendingCount = isOwner ? 5 : 0 // 实际从API获取

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="font-semibold text-[#2C2C2C]">知识库</h1>
          <div className="w-10" />
        </div>

        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <input
              type="text"
              placeholder="搜索知识..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] rounded-full text-sm placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
            />
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab("confirmed")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "confirmed"
                ? "text-[#C41E3A] border-[#C41E3A]"
                : "text-[#666666] border-transparent"
            }`}
          >
            <BookOpen className="w-4 h-4 inline-block mr-1.5" />
            已入库
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === "pending"
                  ? "text-[#C41E3A] border-[#C41E3A]"
                  : "text-[#666666] border-transparent"
              }`}
            >
              待确认
              {pendingCount > 0 && (
                <span className="absolute -top-1 right-1/4 px-1.5 py-0.5 text-xs bg-[#C41E3A] text-white rounded-full min-w-[18px]">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {loading ? (
          <KnowledgeSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F5] flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-[#C9A96E]" />
            </div>
            <p className="text-[#999999]">
              {activeTab === "confirmed" ? "暂无知识内容" : "暂无待确认内容"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                isOwner={isOwner}
                onConfirm={() => handleConfirm(item.id)}
                onIgnore={() => handleIgnore(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
