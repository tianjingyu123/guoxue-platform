"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Plus, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import { shopApi, type ProductDetail } from "@/lib/api"

// ---- 骨架屏 ----
function CompareSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-14 bg-white border-b border-[#E8E3DB] animate-pulse" />
      <div className="h-40 bg-white border-b border-[#E8E3DB] animate-pulse mt-2" />
      <div className="mt-2 space-y-px">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-white animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// ---- 差异检测 ----
function isDifferent(values: (string | undefined)[]) {
  const nonEmpty = values.filter(Boolean)
  if (nonEmpty.length < 2) return false
  return new Set(nonEmpty).size > 1
}

// ---- 空插槽 ----
function EmptySlot({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-[#E8E3DB] rounded-2xl w-28 shrink-0 hover:border-[#C41E3A] transition-colors"
    >
      <Plus className="w-7 h-7 text-[#C9A96E] mb-1" />
      <span className="text-xs text-[#999999]">添加商品</span>
    </button>
  )
}

// ---- 商品选择器弹窗 ----
function ProductPickerModal({
  onClose,
  onSelect,
  excludeIds,
}: {
  onClose: () => void
  onSelect: (id: string) => void
  excludeIds: string[]
}) {
  const MOCK_PICKS = [
    { id: "p1", name: "八字命理精研课", price: 299, cover: "" },
    { id: "p2", name: "紫微斗数入门", price: 199, cover: "" },
    { id: "p3", name: "六爻预测实战课", price: 399, cover: "" },
    { id: "p4", name: "奇门遁甲核心", price: 499, cover: "" },
    { id: "p5", name: "风水堪舆基础", price: 159, cover: "" },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[60vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-bold text-[#2C2C2C]">选择对比商品</span>
          <button onClick={onClose}><X className="w-5 h-5 text-[#666666]" /></button>
        </div>
        <div className="space-y-3">
          {MOCK_PICKS.filter(p => !excludeIds.includes(p.id)).map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); onClose() }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E8E3DB] hover:border-[#C41E3A] transition-colors text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] flex items-center justify-center shrink-0 text-xs text-[#999999]">封面</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2C2C2C] truncate">{p.name}</p>
                <p className="text-sm text-[#C41E3A] font-bold mt-0.5">¥{p.price}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- 主内容 ----
function ComparePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialIds = (searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 4)

  const [productIds, setProductIds] = useState<string[]>(initialIds.length ? initialIds : ["p1", "p2"])
  const [products, setProducts] = useState<(ProductDetail | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [onlyDiff, setOnlyDiff] = useState(false)

  // mock数据
  const MOCK_PRODUCTS: Record<string, ProductDetail> = {
    p1: {
      id: "p1", name: "八字命理精研课", cover: "", price: 299, originalPrice: 499,
      sales: 2341, rating: 4.8, category: "命理", tags: ["热门", "精品"],
      images: [], description: "", reviews: 456, stock: 99, shipping: "虚拟商品",
      specs: [
        { name: "课时", value: "48节" }, { name: "有效期", value: "永久" },
        { name: "讲师", value: "王命理" }, { name: "学员数", value: "2341人" },
        { name: "证书", value: "含结课证书" }, { name: "答疑", value: "7天内" },
        { name: "格式", value: "视频" }, { name: "难度", value: "中级" },
      ],
      skus: [],
    },
    p2: {
      id: "p2", name: "紫微斗数入门", cover: "", price: 199, originalPrice: 299,
      sales: 1823, rating: 4.6, category: "命理", tags: ["入门"],
      images: [], description: "", reviews: 312, stock: 99, shipping: "虚拟商品",
      specs: [
        { name: "课时", value: "32节" }, { name: "有效期", value: "365天" },
        { name: "讲师", value: "李斗数" }, { name: "学员数", value: "1823人" },
        { name: "证书", value: "不含证书" }, { name: "答疑", value: "3天内" },
        { name: "格式", value: "视频+图文" }, { name: "难度", value: "入门" },
      ],
      skus: [],
    },
    p3: {
      id: "p3", name: "六爻预测实战课", cover: "", price: 399, originalPrice: 599,
      sales: 987, rating: 4.9, category: "命理", tags: ["实战"],
      images: [], description: "", reviews: 198, stock: 99, shipping: "虚拟商品",
      specs: [
        { name: "课时", value: "60节" }, { name: "有效期", value: "永久" },
        { name: "讲师", value: "张六爻" }, { name: "学员数", value: "987人" },
        { name: "证书", value: "含结课证书" }, { name: "答疑", value: "24小时内" },
        { name: "格式", value: "视频" }, { name: "难度", value: "高级" },
      ],
      skus: [],
    },
    p4: {
      id: "p4", name: "奇门遁甲核心", cover: "", price: 499, originalPrice: 799,
      sales: 654, rating: 4.7, category: "命理", tags: ["进阶"],
      images: [], description: "", reviews: 134, stock: 99, shipping: "虚拟商品",
      specs: [
        { name: "课时", value: "72节" }, { name: "有效期", value: "永久" },
        { name: "讲师", value: "刘奇门" }, { name: "学员数", value: "654人" },
        { name: "证书", value: "含结课证书" }, { name: "答疑", value: "7天内" },
        { name: "格式", value: "视频" }, { name: "难度", value: "高级" },
      ],
      skus: [],
    },
  }

  useEffect(() => {
    setLoading(true)
    const results: (ProductDetail | null)[] = productIds.map(id => MOCK_PRODUCTS[id] ?? null)
    setTimeout(() => { setProducts(results); setLoading(false) }, 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds])

  const handleRemove = (idx: number) => {
    setProductIds(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAdd = (newId: string) => {
    if (productIds.length >= 4) return
    setProductIds(prev => [...prev, newId])
  }

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  // 参数分组
  const PARAM_GROUPS = [
    { group: "价格信息", keys: [
      { key: "price", label: "当前价格", getValue: (p: ProductDetail) => `¥${p.price}` },
      { key: "originalPrice", label: "原价", getValue: (p: ProductDetail) => `¥${p.originalPrice}` },
      { key: "sales", label: "销量", getValue: (p: ProductDetail) => `${p.sales}人` },
      { key: "rating", label: "评分", getValue: (p: ProductDetail) => `${p.rating}分` },
    ]},
    { group: "课程规格", keys: (products[0]?.specs || []).map(s => ({
      key: s.name,
      label: s.name,
      getValue: (p: ProductDetail) => p.specs.find(sp => sp.name === s.name)?.value || "—",
    }))},
  ]

  if (loading) return <CompareSkeleton />

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E8E3DB] flex items-center h-14 px-4 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
        </button>
        <span className="flex-1 text-base font-bold text-[#2C2C2C]">商品对比</span>
        <button
          onClick={() => setOnlyDiff(!onlyDiff)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${onlyDiff ? "bg-[#C41E3A] text-white border-[#C41E3A]" : "border-[#E8E3DB] text-[#666666]"}`}
        >
          只看差异
        </button>
      </header>

      {/* 商品选择区 */}
      <div className="bg-white border-b border-[#E8E3DB] px-4 py-4">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {productIds.map((id, idx) => {
            const p = products[idx]
            return (
              <div key={id} className="relative shrink-0 w-28">
                <div
                  className="w-28 h-28 rounded-2xl bg-[#FAF8F5] overflow-hidden cursor-pointer border border-[#E8E3DB] flex items-center justify-center"
                  onClick={() => router.push(`/shop/${id}`)}
                >
                  <span className="text-[10px] text-[#999999]">封面</span>
                </div>
                {p && (
                  <p className="text-xs text-[#2C2C2C] mt-1.5 truncate font-medium leading-tight">{p.name}</p>
                )}
                <p className="text-sm font-bold text-[#C41E3A] mt-0.5">¥{p?.price ?? "—"}</p>
                <button
                  onClick={() => handleRemove(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#2C2C2C] flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            )
          })}
          {productIds.length < 4 && (
            <EmptySlot onAdd={() => setShowPicker(true)} />
          )}
        </div>
      </div>

      {/* 对比表格 */}
      <div className="mt-2">
        {PARAM_GROUPS.map(({ group, keys }) => {
          if (keys.length === 0) return null
          const collapsed = collapsedGroups.has(group)
          const rows = keys.map(k => ({
            ...k,
            values: products.map(p => p ? k.getValue(p) : undefined),
          }))
          const visibleRows = onlyDiff ? rows.filter(r => isDifferent(r.values)) : rows

          if (onlyDiff && visibleRows.length === 0) return null

          return (
            <div key={group} className="mb-2">
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF8F5]"
              >
                <span className="text-sm font-bold text-[#2C2C2C]">{group}</span>
                {collapsed
                  ? <ChevronDown className="w-4 h-4 text-[#999999]" />
                  : <ChevronUp className="w-4 h-4 text-[#999999]" />
                }
              </button>

              {!collapsed && visibleRows.map((row, ri) => {
                const diff = isDifferent(row.values)
                return (
                  <div
                    key={row.key}
                    className={`flex border-b border-[#E8E3DB] ${diff ? "bg-[#FFF5F5]" : "bg-white"} ${ri % 2 === 0 && !diff ? "bg-white" : ""}`}
                  >
                    {/* 参数名 */}
                    <div className="w-24 shrink-0 px-3 py-3 flex items-center">
                      <span className="text-xs text-[#999999] leading-snug">{row.label}</span>
                      {diff && (
                        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#C41E3A] shrink-0" />
                      )}
                    </div>
                    {/* 各商品值 */}
                    <div className="flex-1 flex divide-x divide-[#E8E3DB]">
                      {productIds.map((_, idx) => {
                        const val = row.values[idx]
                        const isBest = diff && row.key === "price"
                          ? val === products.filter(Boolean).map(p => p ? row.getValue(p) : "").sort()[0]
                          : false
                        return (
                          <div
                            key={idx}
                            className={`flex-1 px-2 py-3 flex items-center justify-center text-center ${isBest ? "text-[#C41E3A] font-bold" : diff ? "text-[#2C2C2C] font-semibold" : "text-[#666666]"}`}
                          >
                            <span className="text-xs leading-snug">{val ?? "—"}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* 底部操作区 */}
      <div className="sticky bottom-0 bg-white border-t border-[#E8E3DB] px-4 py-3">
        <div className="flex gap-3">
          {productIds.map((id, idx) => {
            const p = products[idx]
            if (!p) return null
            return (
              <button
                key={id}
                onClick={() => router.push(`/shop/${id}`)}
                className="flex-1 flex items-center justify-center gap-1 h-10 rounded-full bg-[#C41E3A] text-white text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                查看
              </button>
            )
          })}
        </div>
      </div>

      {/* 商品选择弹窗 */}
      {showPicker && (
        <ProductPickerModal
          onClose={() => setShowPicker(false)}
          onSelect={handleAdd}
          excludeIds={productIds}
        />
      )}
    </div>
  )
}

export default function ProductComparePage() {
  return (
    <Suspense fallback={<CompareSkeleton />}>
      <ComparePageContent />
    </Suspense>
  )
}
