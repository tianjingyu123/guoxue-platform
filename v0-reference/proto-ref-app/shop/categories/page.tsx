"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"
import { shopApi, type Product, type ProductCategory } from "@/lib/api"

// Mock数据
const mockCategories: ProductCategory[] = [
  { id: "1", name: "国学书籍", icon: "📚", children: [
    { id: "1-1", name: "经典原著", icon: "" },
    { id: "1-2", name: "注解版本", icon: "" },
    { id: "1-3", name: "入门读物", icon: "" },
  ]},
  { id: "2", name: "文房用品", icon: "✒️", children: [
    { id: "2-1", name: "毛笔", icon: "" },
    { id: "2-2", name: "宣纸", icon: "" },
    { id: "2-3", name: "墨砚", icon: "" },
  ]},
  { id: "3", name: "香道用品", icon: "🪔", children: [
    { id: "3-1", name: "线香", icon: "" },
    { id: "3-2", name: "香炉", icon: "" },
    { id: "3-3", name: "沉香", icon: "" },
  ]},
  { id: "4", name: "茶道用品", icon: "🍵", children: [
    { id: "4-1", name: "茶具套装", icon: "" },
    { id: "4-2", name: "茶叶", icon: "" },
    { id: "4-3", name: "茶盘", icon: "" },
  ]},
  { id: "5", name: "养生保健", icon: "🏥", children: [
    { id: "5-1", name: "艾灸用品", icon: "" },
    { id: "5-2", name: "按摩器具", icon: "" },
    { id: "5-3", name: "养生食材", icon: "" },
  ]},
  { id: "6", name: "风水摆件", icon: "🏺", children: [
    { id: "6-1", name: "招财摆件", icon: "" },
    { id: "6-2", name: "化煞物品", icon: "" },
    { id: "6-3", name: "水晶", icon: "" },
  ]},
  { id: "7", name: "佛道用品", icon: "🙏", children: [
    { id: "7-1", name: "佛像", icon: "" },
    { id: "7-2", name: "念珠", icon: "" },
    { id: "7-3", name: "供品", icon: "" },
  ]},
  { id: "8", name: "乐器", icon: "🎸", children: [
    { id: "8-1", name: "古琴", icon: "" },
    { id: "8-2", name: "箫笛", icon: "" },
    { id: "8-3", name: "古筝", icon: "" },
  ]},
]

const mockProducts: Product[] = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i + 1}`,
  name: ["易经全解", "毛笔套装", "沉香线香", "紫砂茶壶", "艾灸盒", "招财貔貅", "小叶紫檀念珠", "古琴入门"][i % 8],
  cover: `https://picsum.photos/200/200?random=${i + 100}`,
  price: [128, 89, 168, 299, 68, 388, 258, 1999][i % 8],
  originalPrice: [168, 128, 218, 399, 98, 488, 328, 2599][i % 8],
  sales: Math.floor(Math.random() * 1000) + 100,
  rating: 4.5 + Math.random() * 0.5,
  category: ["1-1", "2-1", "3-1", "4-1", "5-1", "6-1", "7-2", "8-1"][i % 8],
}))

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedSubCategory) {
      loadProducts(selectedSubCategory)
    }
  }, [selectedSubCategory])

  const loadCategories = async () => {
    try {
      const data = await shopApi.categoryTree()
      setCategories(data)
      if (data.length > 0) {
        setSelectedCategory(data[0].id)
        if (data[0].children?.length) {
          setSelectedSubCategory(data[0].children[0].id)
        }
      }
    } catch {
      setCategories(mockCategories)
      setSelectedCategory(mockCategories[0].id)
      if (mockCategories[0].children?.length) {
        setSelectedSubCategory(mockCategories[0].children[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async (categoryId: string) => {
    setProductsLoading(true)
    try {
      const res = await shopApi.categoryProducts(categoryId)
      setProducts(res.data)
    } catch {
      setProducts(mockProducts.filter(p => p.category === categoryId || mockProducts.slice(0, 6)))
    } finally {
      setProductsLoading(false)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId)
    const category = categories.find(c => c.id === categoryId)
    if (category?.children?.length) {
      setSelectedSubCategory(category.children[0].id)
    }
    // 滚动到对应位置
    const ref = categoryRefs.current[categoryId]
    if (ref && rightPanelRef.current) {
      rightPanelRef.current.scrollTo({
        top: ref.offsetTop - 60,
        behavior: "smooth"
      })
    }
  }

  const currentCategory = categories.find(c => c.id === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
        <div className="flex h-[calc(100vh-52px)]">
          <div className="w-24 bg-[#F5F2EF] border-r border-[#E8E3DB] p-2 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex-1 p-4">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <span className="font-semibold text-[#2C2C2C]">商品分类</span>
          <button onClick={() => router.push("/shop/search")} className="p-1">
            <Search className="w-5 h-5 text-[#2C2C2C]" />
          </button>
        </div>
      </div>

      {/* 双栏布局 */}
      <div className="flex h-[calc(100vh-52px)]">
        {/* 左侧一级分类 */}
        <div className="w-24 bg-[#F5F2EF] border-r border-[#E8E3DB] overflow-y-auto flex-shrink-0">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`w-full py-4 px-2 text-center text-sm transition-all relative ${
                selectedCategory === category.id
                  ? "bg-white text-[#C41E3A] font-medium"
                  : "text-[#666666] hover:bg-white/50"
              }`}
            >
              {selectedCategory === category.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#C41E3A] rounded-r" />
              )}
              <div className="text-lg mb-1">{category.icon}</div>
              <div className="leading-tight">{category.name}</div>
            </button>
          ))}
        </div>

        {/* 右侧内容区 */}
        <div ref={rightPanelRef} className="flex-1 overflow-y-auto">
          {/* 二级分类标签 */}
          {currentCategory?.children && currentCategory.children.length > 0 && (
            <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {currentCategory.children.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubCategory(sub.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      selectedSubCategory === sub.id
                        ? "bg-[#C41E3A] text-white"
                        : "bg-[#F5F2EF] text-[#666666]"
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 商品列表 */}
          <div className="p-3">
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => router.push(`/shop/${product.id}`)}
                    className="bg-white rounded-xl p-3 text-left shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-[#F5F2EF]">
                      <img
                        src={product.cover}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-sm text-[#2C2C2C] font-medium line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#C41E3A] font-bold">¥{product.price}</span>
                      {product.originalPrice > product.price && (
                        <span className="text-xs text-[#999999] line-through">
                          ¥{product.originalPrice}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#999999] mt-1">
                      已售 {product.sales}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full bg-[#F5F2EF] flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-[#999999]" />
                </div>
                <p className="text-[#999999]">暂无商品</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
