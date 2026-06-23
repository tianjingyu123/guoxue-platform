"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Copy, Phone, MapPin, Truck, Package, CheckCircle, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// 快递公司列表
const expressCompanies = [
  { id: "sf", name: "顺丰速运", code: "SF" },
  { id: "yd", name: "韵达快递", code: "YD" },
  { id: "zt", name: "中通快递", code: "ZTO" },
  { id: "yt", name: "圆通速递", code: "YTO" },
  { id: "st", name: "申通快递", code: "STO" },
  { id: "jd", name: "京东物流", code: "JD" },
  { id: "ems", name: "EMS", code: "EMS" },
  { id: "db", name: "德邦物流", code: "DBL" },
]

const orderDetail = {
  id: "202401150001",
  status: "pending",
  createdAt: "2024-01-15 14:30:00",
  paidAt: "2024-01-15 14:32:00",
  payMethod: "微信支付",
  buyer: {
    name: "张三",
    phone: "13888888888",
    address: "北京市朝阳区建国路88号SOHO现代城A座1801室",
  },
  products: [
    {
      id: "1",
      title: "滴天髓精解",
      image: "",
      specs: "精装版",
      price: 68,
      quantity: 2,
    }
  ],
  amounts: {
    productTotal: 136,
    shipping: 0,
    discount: 0,
    total: 136,
  },
  remark: "请用气泡膜包装好，谢谢",
  timeline: [
    { time: "2024-01-15 14:32:00", title: "买家已付款", desc: "等待商家发货" },
    { time: "2024-01-15 14:30:00", title: "订单创建", desc: "买家提交订单" },
  ]
}

const statusConfig = {
  pending: { label: "待发货", color: "text-orange-600" },
  shipped: { label: "已发货", color: "text-blue-600" },
  completed: { label: "已完成", color: "text-green-600" },
  refunding: { label: "退款中", color: "text-red-600" },
  cancelled: { label: "已取消", color: "text-gray-600" },
}

function OrderDetailContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("id") || orderDetail.id
  const [expressCompany, setExpressCompany] = useState("")
  const [trackingNo, setTrackingNo] = useState("")
  const [showShipDialog, setShowShipDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleShip = async () => {
    if (!trackingNo || !expressCompany) return
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setShowShipDialog(false)
    // 重置表单
    setExpressCompany("")
    setTrackingNo("")
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const config = statusConfig[orderDetail.status as keyof typeof statusConfig]

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link href="/merchant/orders" className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">订单详情</h1>
        </div>
      </header>
      
      {/* 订单状态 */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4">
        <div className="flex items-center gap-3">
          <Package className="w-10 h-10" />
          <div>
            <p className="text-lg font-semibold">{config.label}</p>
            <p className="text-sm text-white/80">请尽快发货，超时将自动关闭订单</p>
          </div>
        </div>
      </div>
      
      {/* 收货信息 */}
      <Card className="mx-4 -mt-2 relative z-10 p-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{orderDetail.buyer.name}</span>
              <span className="text-muted-foreground">{orderDetail.buyer.phone}</span>
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyText(orderDetail.buyer.phone)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{orderDetail.buyer.address}</p>
          </div>
          <a href={`tel:${orderDetail.buyer.phone}`}>
            <Button variant="outline" size="icon" className="flex-shrink-0">
              <Phone className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </Card>
      
      {/* 商品信息 */}
      <Card className="mx-4 mt-3 p-4">
        <h3 className="font-medium mb-3">商品信息</h3>
        {orderDetail.products.map(product => (
          <div key={product.id} className="flex gap-3">
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📦</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium line-clamp-2">{product.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{product.specs}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-medium">¥{product.price}</span>
                <span className="text-xs text-muted-foreground">x{product.quantity}</span>
              </div>
            </div>
          </div>
        ))}
        
        {orderDetail.remark && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">买家备注</p>
                <p className="text-sm mt-0.5">{orderDetail.remark}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* 金额明细 */}
      <Card className="mx-4 mt-3 p-4">
        <h3 className="font-medium mb-3">金额明细</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">商品总价</span>
            <span>¥{orderDetail.amounts.productTotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">运费</span>
            <span>{orderDetail.amounts.shipping === 0 ? "免运费" : `¥${orderDetail.amounts.shipping}`}</span>
          </div>
          {orderDetail.amounts.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">优惠</span>
              <span className="text-red-500">-¥{orderDetail.amounts.discount}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>实付金额</span>
            <span className="text-primary text-lg">¥{orderDetail.amounts.total}</span>
          </div>
        </div>
      </Card>
      
      {/* 订单信息 */}
      <Card className="mx-4 mt-3 p-4">
        <h3 className="font-medium mb-3">订单信息</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">订单编号</span>
            <div className="flex items-center gap-1">
              <span>{orderId}</span>
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyText(orderId)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">下单时间</span>
            <span>{orderDetail.createdAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">付款时间</span>
            <span>{orderDetail.paidAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">支付方式</span>
            <span>{orderDetail.payMethod}</span>
          </div>
        </div>
      </Card>
      
      {/* 订单进度 */}
      <Card className="mx-4 mt-3 p-4">
        <h3 className="font-medium mb-3">订单进度</h3>
        <div className="space-y-4">
          {orderDetail.timeline.map((item, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  index === 0 ? "bg-primary" : "bg-muted"
                )} />
                {index < orderDetail.timeline.length - 1 && (
                  <div className="w-px h-full bg-border flex-1 my-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p className={cn("text-sm font-medium", index === 0 ? "text-foreground" : "text-muted-foreground")}>
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* 底部操作栏 */}
      {orderDetail.status === "pending" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              修改价格
            </Button>
            <Dialog open={showShipDialog} onOpenChange={setShowShipDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <Truck className="w-4 h-4 mr-2" />
                  发货
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>填写物流信息</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* 快递公司选择 */}
                  <div className="space-y-2">
                    <Label>快递公司 <span className="text-destructive">*</span></Label>
                    <Select value={expressCompany} onValueChange={setExpressCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择快递公司" />
                      </SelectTrigger>
                      <SelectContent>
                        {expressCompanies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 物流单号输入 */}
                  <div className="space-y-2">
                    <Label>物流单号 <span className="text-destructive">*</span></Label>
                    <Input 
                      placeholder="请输入物流单号" 
                      value={trackingNo}
                      onChange={e => setTrackingNo(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      请仔细核对单号，填写错误将影响买家查询物流
                    </p>
                  </div>
                  
                  {/* 发货商品预览 */}
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">发货商品</p>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-sm">
                        📦
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{orderDetail.products[0].title}</p>
                        <p className="text-xs text-muted-foreground">x{orderDetail.products[0].quantity}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleShip}
                    disabled={!trackingNo || !expressCompany || isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    确认发货
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  )
}
