"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, ArrowUpDown, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const products = [
  {
    id: "1",
    title: "滴天髓精解",
    image: "",
    price: 68,
    originalPrice: 98,
    stock: 156,
    sales: 328,
    status: "online",
    category: "命理书籍",
    createdAt: "2024-01-15"
  },
  {
    id: "2", 
    title: "子平真诠评注",
    image: "",
    price: 88,
    originalPrice: 128,
    stock: 89,
    sales: 215,
    status: "online",
    category: "命理书籍",
    createdAt: "2024-01-10"
  },
  {
    id: "3",
    title: "文房四宝套装",
    image: "",
    price: 268,
    originalPrice: 368,
    stock: 0,
    sales: 56,
    status: "soldout",
    category: "文房用品",
    createdAt: "2024-01-08"
  },
  {
    id: "4",
    title: "紫砂茶壶礼盒",
    image: "",
    price: 588,
    originalPrice: null,
    stock: 23,
    sales: 12,
    status: "offline",
    category: "茶道用品",
    createdAt: "2024-01-05"
  },
  {
    id: "5",
    title: "八字命理基础课",
    image: "",
    price: 199,
    originalPrice: 299,
    stock: 999,
    sales: 456,
    status: "online",
    category: "在线课程",
    createdAt: "2024-01-01"
  },
]

const statusConfig = {
  online: { label: "已上架", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  offline: { label: "已下架", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  soldout: { label: "已售罄", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  pending: { label: "审核中", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  
  // 确认删除弹窗状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // 快捷编辑状态
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<"price" | "stock" | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  
  const filteredProducts = products.filter(p => {
    if (activeTab !== "all" && p.status !== activeTab) return false
    if (searchQuery && !p.title.includes(searchQuery)) return false
    return true
  })

  const toggleSelect = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const stats = {
    all: products.length,
    online: products.filter(p => p.status === "online").length,
    offline: products.filter(p => p.status === "offline").length,
    soldout: products.filter(p => p.status === "soldout").length,
  }
  
  // 删除确认处理
  const handleDeleteClick = (product: { id: string, title: string }) => {
    setDeleteTarget(product)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
    // 实际应用中这里会更新商品列表
  }
  
  // 快捷编辑处理
  const startQuickEdit = (productId: string, field: "price" | "stock", currentValue: number) => {
    setEditingProduct(productId)
    setEditingField(field)
    setEditValue(String(currentValue))
  }
  
  const cancelQuickEdit = () => {
    setEditingProduct(null)
    setEditingField(null)
    setEditValue("")
  }
  
  const saveQuickEdit = async () => {
    if (!editingProduct || !editingField) return
    setIsSaving(true)
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsSaving(false)
    cancelQuickEdit()
    // 实际应用中这里会更新商品数据
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/merchant/dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">商品管理</h1>
          </div>
          <Link href="/merchant/product-edit">
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              发布商品
            </Button>
          </Link>
        </div>
      </header>
      
      {/* 搜索和筛选 */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索商品名称" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 状态标签 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">全部({stats.all})</TabsTrigger>
            <TabsTrigger value="online" className="text-xs">已上架({stats.online})</TabsTrigger>
            <TabsTrigger value="offline" className="text-xs">已下架({stats.offline})</TabsTrigger>
            <TabsTrigger value="soldout" className="text-xs">已售罄({stats.soldout})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* 商品列表 */}
      <div className="px-4 space-y-3">
        {filteredProducts.map(product => (
          <Card key={product.id} className="p-3">
            <div className="flex gap-3">
              {/* 商品图片 */}
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 relative">
                <span className="text-2xl">📦</span>
                <input 
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  className="absolute top-1 left-1 w-4 h-4 rounded"
                />
              </div>
              
              {/* 商品信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2">{product.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/merchant/product-edit?id=${product.id}`}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑商品
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {product.status === "online" ? "下架商品" : "上架商品"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick({ id: product.id, title: product.title })}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除商品
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
                  <Badge className={cn("text-[10px]", statusConfig[product.status as keyof typeof statusConfig].color)}>
                    {statusConfig[product.status as keyof typeof statusConfig].label}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  {/* 快捷编辑价格 */}
                  {editingProduct === product.id && editingField === "price" ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">¥</span>
                      <Input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-20 h-7 text-sm"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="w-6 h-6" onClick={saveQuickEdit} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-600" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="w-6 h-6" onClick={cancelQuickEdit}>
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <button 
                      className="flex items-baseline gap-1 hover:bg-secondary/50 rounded px-1 -ml-1 transition-colors"
                      onClick={() => startQuickEdit(product.id, "price", product.price)}
                    >
                      <span className="text-base font-bold text-primary">¥{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">¥{product.originalPrice}</span>
                      )}
                      <Edit className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  {/* 快捷编辑库存 */}
                  {editingProduct === product.id && editingField === "stock" ? (
                    <div className="flex items-center gap-1">
                      <span>库存:</span>
                      <Input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-16 h-6 text-xs"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="w-5 h-5" onClick={saveQuickEdit} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-600" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="w-5 h-5" onClick={cancelQuickEdit}>
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <button 
                      className="hover:bg-secondary/50 rounded px-1 -ml-1 transition-colors"
                      onClick={() => startQuickEdit(product.id, "stock", product.stock)}
                    >
                      库存: <span className={product.stock === 0 ? "text-red-500" : ""}>{product.stock}</span>
                      <Edit className="w-3 h-3 ml-0.5 inline opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                  <span>销量: {product.sales}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredProducts.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">暂无商品</p>
            <Link href="/merchant/product-edit">
              <Button className="mt-4">发布第一个商品</Button>
            </Link>
          </div>
        )}
      </div>
      
      {/* 批量操作栏 */}
      {selectedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedProducts.length} 件商品
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">批量下架</Button>
              <Button variant="destructive" size="sm">批量删除</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除商品？</AlertDialogTitle>
            <AlertDialogDescription>
              您即将删除商品「{deleteTarget?.title}」，删除后将无法恢复。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
