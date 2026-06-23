"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type OrderStatus = "pending" | "paid" | "completed" | "refund"

interface ManageOrder {
  id: string
  buyer: string
  item: string
  type: "course" | "product"
  amount: number
  status: OrderStatus
  time: string
}

const mockOrders: ManageOrder[] = [
  { id: "20240812001", buyer: "李明远", item: "周易入门精讲（线下班）", type: "course", amount: 980, status: "paid", time: "08-12 14:32" },
  { id: "20240812002", buyer: "王静怡", item: "开光招财手串", type: "product", amount: 168, status: "pending", time: "08-12 11:05" },
  { id: "20240811008", buyer: "张伟", item: "国学经典套装（精装）", type: "product", amount: 299, status: "completed", time: "08-11 19:48" },
  { id: "20240811003", buyer: "陈芳", item: "紫微斗数实战工作坊", type: "course", amount: 1280, status: "refund", time: "08-11 09:21" },
]

const statusMap: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "待付款", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "已付款", cls: "bg-info/10 text-info" },
  completed: { label: "已完成", cls: "bg-success/10 text-success" },
  refund: { label: "退款", cls: "bg-destructive/10 text-destructive" },
}

const tabs: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待付款" },
  { key: "paid", label: "已付款" },
  { key: "completed", label: "已完成" },
  { key: "refund", label: "退款" },
]

export default function OrderManagePage() {
  const [tab, setTab] = useState<OrderStatus | "all">("all")
  const list = tab === "all" ? mockOrders : mockOrders.filter((o) => o.status === tab)
  const todayIncome = mockOrders.filter((o) => o.status === "paid" || o.status === "completed").reduce((s, o) => s + o.amount, 0)

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-card px-4 py-3 border-b border-border">
        <BackButton />
        <h1 className="text-base font-semibold">订单管理</h1>
      </header>

      <Card className="m-4 p-4">
        <p className="text-xs text-muted-foreground">有效订单收入（已付款 + 已完成）</p>
        <p className="text-2xl font-bold text-primary mt-1">¥{todayIncome.toLocaleString()}</p>
      </Card>

      <div className="px-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus | "all")}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {list.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {order.type === "course" ? "课程" : "商品"}
                </Badge>
                <span className="text-xs text-muted-foreground">No.{order.id}</span>
              </div>
              <Badge className={`${statusMap[order.status].cls} text-[10px]`}>{statusMap[order.status].label}</Badge>
            </div>
            <p className="font-medium mt-2">{order.item}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">
                {order.buyer} · {order.time}
              </span>
              <span className="font-semibold text-primary">¥{order.amount}</span>
            </div>
            {order.status === "refund" && (
              <Button variant="outline" size="sm" className="w-full mt-3 bg-transparent">
                处理退款申请
              </Button>
            )}
          </Card>
        ))}
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">暂无该状态订单</p>}
      </div>
    </div>
  )
}
