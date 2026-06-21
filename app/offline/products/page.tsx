"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { 
  ChevronLeft, 
  Search,
  ShoppingCart,
  Filter,
  ChevronDown,
  BookOpen,
  Compass,
  Coffee,
  Flame,
  Gem,
  Package,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
  getStationProducts,
  getStationList,
  getProductCategoryLabel,
  addToCart,
} from "@/lib/api/offline"
import type { StationProduct, StationProductCategory, Station } from "@/lib/types/offline"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 加载骨架屏
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </header>
      <div className="p-4">
        <Skeleton className="h-10 w-full rounded-lg mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// 分类图标
const categoryIcons: Record<StationProductCategory, React.ReactNode> = {
  book: <BookOpen className="w-4 h-4" />,
  tool: <Compass className="w-4 h-4" />,
  tea: <Coffee className="w-4 h-4" />,
  incense: <Flame className="w-4 h-4" />,
  ornament: <Gem className="w-4 h-4" />,
  other: <Package className="w-4 h-4" />,
}

// 分类列表
const categories: { value: StationProductCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'book', label: '图书' },
  { value: 'tool', label: '工具' },
  { value: 'tea', label: '茶品' },
  { value: 'incense', label: '香品' },
  { value: 'ornament', label: '饰品' },
  { value: 'other', label: '其他' },
]

// 排序选项
const sortOptions = [
  { value: 'default', label: '默认排序' },
  { value: 'sales', label: '销量优先' },
  { value: 'price', label: '价格优先' },
  { value: 'newest', label: '最新上架' },
]

function ProductsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stationIdParam = searchParams.get('stationId')
  
  // 状态
  const [products, setProducts] = useState<StationProduct[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const [selectedStation, setSelectedStation] = useState<number | undefined>(
    stationIdParam ? Number(stationIdParam) : undefined
  )
  const [selectedCategory, setSelectedCategory] = useState<StationProductCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'sales' | 'price' | 'newest'>('default')
  const [showStationPicker, setShowStationPicker] = useState(false)
  const [showSortPicker, setShowSortPicker] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [addingToCart, setAddingToCart] = useState<number | null>(null)

  // 加载驿站列表
  useEffect(() => {
    async function loadStations() {
      const res = await getStationList()
      if (res.code === 200 && res.data) {
        setStations(res.data.list)
      }
    }
    loadStations()
  }, [])

  // 加载商品列表
  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      const res = await getStationProducts({
        stationId: selectedStation,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        keyword: keyword || undefined,
        sortBy: sortBy === 'default' ? undefined : sortBy as 'price' | 'sales' | 'newest',
      })
      if (res.code === 200 && res.data) {
        setProducts(res.data.list)
      }
      setLoading(false)
    }
    loadProducts()
  }, [selectedStation, selectedCategory, sortBy, keyword])

  // 添加到购物车
  const handleAddToCart = async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setAddingToCart(productId)
    const res = await addToCart(productId)
    if (res.code === 200 && res.data) {
      setCartCount(prev => prev + 1)
    }
    setTimeout(() => setAddingToCart(null), 500)
  }

  // 搜索
  const handleSearch = () => {
    // 触发重新加载
  }

  const selectedStationName = selectedStation 
    ? stations.find(s => s.id === selectedStation)?.name || '选择驿站'
    : '全部驿站'

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold flex-1">驿站商品</h1>
          <button 
            onClick={() => router.push('/cart')}
            className="relative p-1"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        
        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索商品..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* 筛选栏 */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {/* 驿站筛选 */}
          <button 
            onClick={() => setShowStationPicker(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm"
          >
            <span className="truncate max-w-[100px]">{selectedStationName}</span>
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          </button>
          
          {/* 排序 */}
          <button 
            onClick={() => setShowSortPicker(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm"
          >
            <Filter className="w-4 h-4" />
            <span>{sortOptions.find(s => s.value === sortBy)?.label}</span>
          </button>
        </div>
        
        {/* 分类Tab */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                  selectedCategory === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {cat.value !== 'all' && categoryIcons[cat.value as StationProductCategory]}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 商品网格 */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-lg overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">暂无商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <div 
                key={product.id}
                onClick={() => router.push(`/offline/products/${product.id}`)}
                className="bg-card rounded-lg overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* 商品图片 */}
                <div className="relative aspect-square bg-muted">
                  <Image
                    src={product.cover}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                      {Math.round((1 - product.price / product.originalPrice) * 100)}%OFF
                    </div>
                  )}
                </div>
                
                {/* 商品信息 */}
                <div className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2 mb-2">{product.name}</h3>
                  
                  {/* 标签 */}
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {product.tags.slice(0, 2).map(tag => (
                        <span 
                          key={tag}
                          className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* 价格和购买 */}
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-primary font-bold">¥{product.price}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-xs text-muted-foreground line-through ml-1">
                          ¥{product.originalPrice}
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        已售 {product.sales}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleAddToCart(product.id, e)}
                      disabled={addingToCart === product.id}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        addingToCart === product.id
                          ? "bg-green-500 text-white"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {addingToCart === product.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 驿站选择弹窗 */}
      {showStationPicker && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowStationPicker(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[60vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">选择驿站</h3>
              <button onClick={() => setShowStationPicker(false)}>
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              <button
                onClick={() => {
                  setSelectedStation(undefined)
                  setShowStationPicker(false)
                }}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-center justify-between",
                  !selectedStation && "bg-primary/10 text-primary"
                )}
              >
                <span>全部驿站</span>
                {!selectedStation && <Check className="w-5 h-5" />}
              </button>
              {stations.map(station => (
                <button
                  key={station.id}
                  onClick={() => {
                    setSelectedStation(station.id)
                    setShowStationPicker(false)
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left flex items-center justify-between",
                    selectedStation === station.id && "bg-primary/10 text-primary"
                  )}
                >
                  <div>
                    <div className="font-medium">{station.name}</div>
                    <div className="text-sm text-muted-foreground">{station.city}</div>
                  </div>
                  {selectedStation === station.id && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 排序选择弹窗 */}
      {showSortPicker && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowSortPicker(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">排序方��</h3>
              <button onClick={() => setShowSortPicker(false)}>
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div>
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value as typeof sortBy)
                    setShowSortPicker(false)
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left flex items-center justify-between",
                    sortBy === option.value && "bg-primary/10 text-primary"
                  )}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ProductsContent />
    </Suspense>
  )
}
