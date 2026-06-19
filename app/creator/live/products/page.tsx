"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Plus, ShoppingBag, Search, Trash2,
  ToggleLeft, ToggleRight, ChevronRight, Package
} from "lucide-react"
import Link from "next/link"

type Status = "all" | "on" | "off"

const FILTERS: { key: Status; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "on", label: "已上架" },
  { key: "off", label: "已下架" },
]

const mockProducts = [
  { id: "1", name: "《渊海子平》精装典藏版", price: 168, stock: 200, sold: 86, cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80", status: "on" as const },
  { id: "2", name: "紫微斗数入门教程（平装）", price: 88, stock: 150, sold: 142, cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80", status: "on" as const },
  { id: "3", name: "八字命盘分析工具书", price: 128, stock: 0, sold: 320, cover: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=200&q=80", status: "off" as const },
  { id: "4", name: "纯铜罗盘（专业款）", price: 480, stock: 15, sold: 28, cover: "https://images.unsplash.com/photo-1518756131217-31eb79b20e8f?w=200&q=80", status: "on" as const },
  { id: "5", name: "手抄本《周易参同契》", price: 240, stock: 8, sold: 45, cover: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&q=80", status: "off" as const },
]

export default function LiveProductsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<Status>("all")
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState(mockProducts)

  const toggleStatus = (id: string) => {
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, status: p.status === "on" ? "off" : "on" } : p)
    )
  }

  const remove = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const filtered = products.filter(p => {
    const matchFilter = filter === "all" || p.status === filter
    const matchSearch = !search || p.name.includes(search)
    return matchFilter && matchSearch
  })

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-base font-semibold text-foreground">带货商品</h1>
          </div>
          <Link href="/creator/live/products/add">
            <button className="flex items-center gap-1 text-xs text-primary font-medium">
              <Plus className="w-4 h-4" />
              添加商品
            </button>
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="搜索商品名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 状态筛选 */}
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 统计 */}
        <p className="text-xs text-muted-foreground">共 {filtered.length} 件商品</p>

        {/* 商品列表 */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无商品</p>
            <Link href="/creator/live/products/add">
              <button className="mt-3 px-4 py-2 text-xs text-primary-foreground bg-primary rounded-full">
                添加第一件商品
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => (
              <div key={product.id} className="bg-card rounded-xl p-3.5 border border-border">
                <div className="flex gap-3">
                  {/* 封面 */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.cover} alt={product.name} className="w-full h-full object-cover" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate mb-1">{product.name}</p>
                    <p className="text-base font-bold text-primary">¥{product.price}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>库存 {product.stock}</span>
                      <span>已售 {product.sold}</span>
                    </div>
                  </div>

                  {/* 上架开关 */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(product.id)}
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors",
                        product.status === "on" ? "bg-chart-4" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 bg-card rounded-full shadow transition-all",
                        product.status === "on" ? "right-0.5" : "left-0.5"
                      )} />
                    </button>
                    <span className={cn(
                      "text-[10px] font-medium",
                      product.status === "on" ? "text-chart-4" : "text-muted-foreground"
                    )}>
                      {product.status === "on" ? "已上架" : "已下架"}
                    </span>
                  </div>
                </div>

                {/* 操作行 */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <button className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5" />
                    编辑
                  </button>
                  <button
                    onClick={() => remove(product.id)}
                    className="flex items-center gap-1 text-xs text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                  {product.stock === 0 && (
                    <span className="ml-auto text-xs text-destructive font-medium">库存不足</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  )
}
