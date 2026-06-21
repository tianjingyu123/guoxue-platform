"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, Edit, TrendingUp } from "lucide-react"

interface ManagedProduct {
  id: string
  name: string
  price: number
  stock: number
  sold: number
  status: "on" | "off"
}

const mockProducts: ManagedProduct[] = [
  { id: "p1", name: "开光招财手串", price: 168, stock: 42, sold: 128, status: "on" },
  { id: "p2", name: "国学经典套装（精装）", price: 299, stock: 15, sold: 56, status: "on" },
  { id: "p3", name: "驿站定制茶礼盒", price: 88, stock: 0, sold: 203, status: "off" },
  { id: "p4", name: "手抄心经字帖", price: 45, stock: 88, sold: 312, status: "on" },
]

export default function ProductManagePage() {
  const router = useRouter()
  const [products, setProducts] = useState(mockProducts)

  const toggleStatus = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === "on" ? "off" : "on" } : p)),
    )
  }

  const onCount = products.filter((p) => p.status === "on").length

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-card px-4 py-3 border-b border-border">
        <BackButton />
        <h1 className="text-base font-semibold">商品管理</h1>
        <Button size="sm" className="ml-auto gap-1" onClick={() => router.push("/offline/manage/products/create")}>
          <Plus className="w-4 h-4" />
          上架商品
        </Button>
      </header>

      {/* 概览 */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold">{products.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">商品总数</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-success">{onCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">在售中</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-primary">{products.reduce((s, p) => s + p.sold, 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">累计销量</p>
        </Card>
      </div>

      {/* 列表 */}
      <div className="px-4 space-y-3">
        {products.map((product) => (
          <Card key={product.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{product.name}</span>
                  <Badge
                    className={
                      product.status === "on"
                        ? "bg-success/10 text-success text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                    }
                  >
                    {product.status === "on" ? "在售" : "已下架"}
                  </Badge>
                </div>
                <p className="text-sm text-primary font-semibold mt-1">¥{product.price}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className={product.stock === 0 ? "text-destructive" : ""}>库存 {product.stock}</span>
                  <span className="flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    已售 {product.sold}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1 bg-transparent"
                onClick={() => router.push(`/offline/manage/products/create?id=${product.id}`)}
              >
                <Edit className="w-3.5 h-3.5" />
                编辑
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => toggleStatus(product.id)}>
                {product.status === "on" ? "下架" : "上架"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
