"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 一级分类数据
const categories = [
  { id: "all", name: "全部", count: 256 },
  { id: "books", name: "书籍", count: 86 },
  { id: "creative", name: "文创", count: 42 },
  { id: "jewelry", name: "饰品", count: 38 },
  { id: "course", name: "课程周边", count: 24 },
  { id: "tea", name: "茶具香道", count: 32 },
  { id: "stationery", name: "文房四宝", count: 28 },
  { id: "clothing", name: "国风服饰", count: 18 },
]

// 排序选项
const sortOptions = [
  { id: "default", name: "综合排序" },
  { id: "sales", name: "销量优先" },
  { id: "price_asc", name: "价格升序" },
  { id: "price_desc", name: "价格降序" },
  { id: "newest", name: "最新上架" },
]

// 商品数据
const products = [
  { id: 1, name: "《渊海子平》精装典藏版", price: 128, originalPrice: 168, sales: 2856, category: "books", image: "", isMemberFree: false },
  { id: 2, name: "八卦太极挂件纯铜", price: 68, originalPrice: 98, sales: 1256, category: "jewelry", image: "", isMemberFree: false },
  { id: 3, name: "国学书签套装礼盒", price: 39, originalPrice: 59, sales: 3680, category: "creative", image: "", isMemberFree: true },
  { id: 4, name: "《滴天髓》白话详解", price: 88, originalPrice: 118, sales: 1892, category: "books", image: "", isMemberFree: false },
  { id: 5, name: "紫砂茶壶 手工刻绘", price: 368, originalPrice: 468, sales: 568, category: "tea", image: "", isMemberFree: false },
  { id: 6, name: "湖笔套装 书法入门", price: 158, originalPrice: 198, sales: 892, category: "stationery", image: "", isMemberFree: false },
  { id: 7, name: "罗盘模型 风水摆件", price: 199, originalPrice: 299, sales: 1456, category: "jewelry", image: "", isMemberFree: false },
  { id: 8, name: "《三命通会》全译本", price: 148, originalPrice: 188, sales: 1128, category: "books", image: "", isMemberFree: false },
  { id: 9, name: "沉香线香 养生助眠", price: 89, originalPrice: 128, sales: 2156, category: "tea", image: "", isMemberFree: false },
  { id: 10, name: "课程笔记本 手账本", price: 29, originalPrice: 49, sales: 4562, category: "course", image: "", isMemberFree: true },
  { id: 11, name: "五帝钱挂饰 开光铜钱", price: 58, originalPrice: 88, sales: 3256, category: "jewelry", image: "", isMemberFree: false },
  { id: 12, name: "端砚 文房珍品", price: 688, originalPrice: 888, sales: 286, category: "stationery", image: "", isMemberFree: false },
]

export default function CategoryPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [sortBy, setSortBy] = useState("default")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // 筛选状态
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [onlyMemberFree, setOnlyMemberFree] = useState(false)
  
  // 筛选商品
  const filteredProducts = products.filter(product => {
    // 分类筛选
    if (activeCategory !== "all" && product.category !== activeCategory) return false
    // 搜索筛选
    if (searchQuery && !product.name.includes(searchQuery)) return false
    // 价格区间筛选
    if (product.price < priceRange[0] || product.price > priceRange[1]) return false
    // 会员免费筛选
    if (onlyMemberFree && !product.isMemberFree) return false
    return true
  })
  
  // 排序商品
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "sales": return b.sales - a.sales
      case "price_asc": return a.price - b.price
      case "price_desc": return b.price - a.price
      case "newest": return b.id - a.id
      default: return 0
    }
  })

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部搜索栏 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center gap-3 px-4 h-14">
          <BackButton fallbackPath="/mall" />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索商品"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 左侧分类栏 */}
        <aside className="w-20 flex-shrink-0 bg-secondary/30 border-r border-border min-h-[calc(100vh-56px)] sticky top-14">
          <div className="py-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "w-full px-2 py-3 text-xs text-center transition-colors relative",
                  activeCategory === category.id
                    ? "text-primary font-medium bg-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeCategory === category.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                )}
                <span className="line-clamp-2">{category.name}</span>
                <span className="text-[10px] text-muted-foreground/70 mt-0.5 block">
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* 右侧商品列表 */}
        <main className="flex-1 min-w-0">
          {/* 排序栏 */}
          <div className="sticky top-14 z-30 bg-background border-b border-border">
            <div className="flex items-center justify-between px-3 h-10">
              {/* 排序下拉 */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1 text-sm text-foreground"
                >
                  {sortOptions.find(s => s.id === sortBy)?.name}
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    showSortMenu && "rotate-180"
                  )} />
                </button>
                
                {showSortMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                      {sortOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortBy(option.id)
                            setShowSortMenu(false)
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm transition-colors",
                            sortBy === option.id
                              ? "text-primary bg-primary/5"
                              : "text-foreground hover:bg-secondary"
                          )}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 筛选按钮 */}
              <button
                onClick={() => setShowFilter(true)}
                className={cn(
                  "flex items-center gap-1 text-sm",
                  (priceRange[0] > 0 || priceRange[1] < 1000 || onlyMemberFree)
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                筛选
              </button>
            </div>
          </div>

          {/* 商品网格 */}
          {sortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 p-2">
              {sortedProducts.map(product => (
                <Link key={product.id} href={`/mall/product/${product.id}`}>
                  <Card className="overflow-hidden hover:bg-secondary/30 transition-colors">
                    <div className="aspect-square bg-secondary relative flex items-center justify-center">
                      <span className="text-4xl text-muted-foreground/30">
                        {categories.find(c => c.id === product.category)?.name[0]}
                      </span>
                      {product.isMemberFree && (
                        <Badge className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 bg-accent text-accent-foreground border-0">
                          会员免费
                        </Badge>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium text-foreground line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm text-primary font-semibold">
                          ¥{product.price}
                        </span>
                        <span className="text-[10px] text-muted-foreground line-through">
                          ¥{product.originalPrice}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        已售{product.sales > 1000 ? (product.sales / 1000).toFixed(1) + "k" : product.sales}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">暂无相关商品</p>
              <button
                onClick={() => {
                  setActiveCategory("all")
                  setSearchQuery("")
                  setPriceRange([0, 1000])
                  setOnlyMemberFree(false)
                }}
                className="mt-3 text-sm text-primary"
              >
                重置筛选条件
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 筛选面板 */}
      {showFilter && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowFilter(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl z-50 safe-area-pb animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-base text-foreground">筛选</h3>
              <button onClick={() => setShowFilter(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* 价格区间 */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">价格区间</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="最低价"
                    value={priceRange[0] || ""}
                    onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                    className="flex-1 h-10 px-3 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    placeholder="最高价"
                    value={priceRange[1] === 1000 ? "" : priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 1000])}
                    className="flex-1 h-10 px-3 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {/* 快捷价格标签 */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[[0, 50], [50, 100], [100, 300], [300, 500], [500, 1000]].map(([min, max]) => (
                    <button
                      key={`${min}-${max}`}
                      onClick={() => setPriceRange([min, max])}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs transition-colors",
                        priceRange[0] === min && priceRange[1] === max
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      ¥{min}-{max}
                    </button>
                  ))}
                </div>
              </div>

              {/* 其他筛选 */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">其他</h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div 
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      onlyMemberFree
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    )}
                    onClick={() => setOnlyMemberFree(!onlyMemberFree)}
                  >
                    {onlyMemberFree && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-foreground">仅看会员免费</span>
                </label>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-3 px-4 py-4 border-t border-border">
              <button
                onClick={() => {
                  setPriceRange([0, 1000])
                  setOnlyMemberFree(false)
                }}
                className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                重置
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
