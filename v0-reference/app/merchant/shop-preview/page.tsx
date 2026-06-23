"use client"

import Link from "next/link"
import { ArrowLeft, Store, Star, MapPin, Phone, Clock, Share2, Heart, MessageSquare, ShoppingCart, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const shopData = {
  id: "1",
  name: "墨香阁文化",
  logo: "",
  slogan: "传承国学经典，弘扬传统文化",
  description: "墨香阁专注于国学文化传播，提供命理、风水、书法等传统文化产品和服务。",
  rating: 4.9,
  reviewCount: 328,
  followerCount: 1256,
  productCount: 45,
  salesCount: 2680,
  isFollowed: false,
  phone: "400-888-8888",
  address: "北京市朝阳区建国路88号",
  businessHours: "09:00-21:00",
  level: "金牌商家",
  badges: ["品质保障", "极速发货", "7天无理由"],
}

const products = [
  { id: "1", title: "滴天髓精解", price: 68, originalPrice: 98, sales: 328, image: "" },
  { id: "2", title: "子平真诠评注", price: 88, originalPrice: 128, sales: 215, image: "" },
  { id: "3", title: "文房四宝套装", price: 268, originalPrice: 368, sales: 56, image: "" },
  { id: "4", title: "紫砂茶壶礼盒", price: 588, originalPrice: null, sales: 12, image: "" },
  { id: "5", title: "八字命理基础课", price: 199, originalPrice: 299, sales: 456, image: "" },
  { id: "6", title: "毛笔书法入门套装", price: 128, originalPrice: 168, sales: 89, image: "" },
]

export default function ShopPreviewPage() {
  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/merchant/profile">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">店铺预览</h1>
          <Button variant="ghost" size="icon">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>
      
      {/* 店铺头部 */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 pb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Store className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold truncate">{shopData.name}</h1>
              <Badge className="bg-amber-500/90 text-white text-[10px] flex-shrink-0">{shopData.level}</Badge>
            </div>
            <p className="text-sm text-primary-foreground/80 mt-1 line-clamp-2">{shopData.slogan}</p>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{shopData.rating}</span>
              </div>
              <span className="text-primary-foreground/60">|</span>
              <span>{shopData.followerCount}关注</span>
              <span className="text-primary-foreground/60">|</span>
              <span>{shopData.productCount}商品</span>
            </div>
          </div>
        </div>
        
        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {shopData.badges.map(badge => (
            <Badge key={badge} variant="secondary" className="bg-white/20 text-white text-[10px] border-0">
              {badge}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* 店铺数据 */}
      <Card className="mx-4 -mt-3 relative z-10 p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{shopData.productCount}</p>
            <p className="text-xs text-muted-foreground">全部商品</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{shopData.salesCount}</p>
            <p className="text-xs text-muted-foreground">总销量</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{shopData.reviewCount}</p>
            <p className="text-xs text-muted-foreground">评价数</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{shopData.followerCount}</p>
            <p className="text-xs text-muted-foreground">粉丝数</p>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1">
            <Heart className="w-4 h-4 mr-1" />
            关注店铺
          </Button>
          <Button variant="outline" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-1" />
            联系客服
          </Button>
        </div>
      </Card>
      
      {/* 店铺信息 */}
      <Card className="mx-4 mt-3 p-4">
        <h3 className="font-medium mb-3">店铺信息</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{shopData.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{shopData.address}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>营业时间: {shopData.businessHours}</span>
          </div>
        </div>
      </Card>
      
      {/* 商品列表 */}
      <div className="mt-4">
        <Tabs defaultValue="all">
          <div className="px-4 sticky top-14 z-40 bg-muted/30 py-2">
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
              <TabsTrigger value="hot" className="text-xs">热销</TabsTrigger>
              <TabsTrigger value="new" className="text-xs">新品</TabsTrigger>
              <TabsTrigger value="price" className="text-xs">价格</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0 px-4">
            <div className="grid grid-cols-2 gap-3">
              {products.map(product => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <span className="text-4xl">📦</span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium line-clamp-2">{product.title}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-base font-bold text-primary">¥{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">¥{product.originalPrice}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">已售 {product.sales}</p>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* 底部购物车入口 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              2
            </span>
          </Button>
          <Button className="flex-1">
            去购物车结算
          </Button>
        </div>
      </div>
    </div>
  )
}
