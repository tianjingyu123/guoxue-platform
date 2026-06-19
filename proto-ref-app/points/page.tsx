"use client"

import { useState, useEffect, useCallback } from "react"
import { BackButton } from "@/components/common/back-button"
import { Gift, Coins, CheckCircle, ChevronRight, Calendar, FileText, Users, ShoppingBag, Ticket, Crown, Package } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { DataState } from "@/components/data-state"
import { getPointsInfo, getPointsTasks, getPointsHistory, getPointsExchangeItems, exchangePoints } from "@/lib/api"
import type { PointsInfo, PointsTask, PointsHistoryItem, PointsExchangeItem } from "@/lib/types/points"

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar, FileText, Users, ShoppingBag, Ticket, Coins, Crown, Package,
}

export default function PointsPage() {
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PointsExchangeItem | null>(null)
  const [exchangeSuccess, setExchangeSuccess] = useState(false)
  
  // 数据状态
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null)
  const [tasks, setTasks] = useState<PointsTask[]>([])
  const [history, setHistory] = useState<PointsHistoryItem[]>([])
  const [exchangeItems, setExchangeItems] = useState<PointsExchangeItem[]>([])

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [infoRes, tasksRes, historyRes, exchangeRes] = await Promise.all([
        getPointsInfo(),
        getPointsTasks(),
        getPointsHistory(),
        getPointsExchangeItems(),
      ])
      
      if (infoRes.code === 200) setPointsInfo(infoRes.data)
      if (tasksRes.code === 200) setTasks(tasksRes.data)
      if (historyRes.code === 200) setHistory(historyRes.data)
      if (exchangeRes.code === 200) setExchangeItems(exchangeRes.data)
    } catch (err) {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  const handleExchange = (item: PointsExchangeItem) => {
    if (pointsInfo && pointsInfo.balance >= item.points) {
      setSelectedItem(item)
      setShowExchangeModal(true)
    }
  }
  
  const confirmExchange = async () => {
    if (!selectedItem) return
    
    const res = await exchangePoints(selectedItem.id)
    if (res.code === 200 && res.data.success) {
      setExchangeSuccess(true)
      // 更新积分余额
      if (pointsInfo) {
        setPointsInfo({ ...pointsInfo, balance: res.data.newBalance })
      }
      setTimeout(() => {
        setShowExchangeModal(false)
        setExchangeSuccess(false)
        setSelectedItem(null)
      }, 2000)
    }
  }

  const userPoints = pointsInfo?.balance ?? 0

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">积分中心</h1>
          <Link href="/points/history" className="text-sm text-primary">
            明细
          </Link>
        </div>
      </header>

      <DataState
        isLoading={loading}
        isError={!!error}
        isEmpty={!pointsInfo}
        errorMessage={error || undefined}
        onRetry={fetchData}
      >
        {/* 积分余额卡片 */}
        <div className="px-4 pt-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-accent via-accent/80 to-yellow-600 p-5">
            {/* 装饰图案 */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 top-8 w-16 h-16 rounded-full bg-white/5" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-white/80" />
                <span className="text-white/80 text-sm">我的积分</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {userPoints.toLocaleString()}
              </div>
              <p className="text-white/70 text-xs">
                100积分 = ¥1.00，可在兑换时抵扣
              </p>
              
              {/* 积分数据 */}
              {pointsInfo && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-white/60 text-xs">累计获取</p>
                    <p className="text-white font-medium">{pointsInfo.totalEarned.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">累计使用</p>
                    <p className="text-white font-medium">{pointsInfo.totalSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">今日获取</p>
                    <p className="text-white font-medium">+{pointsInfo.todayEarned}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 积分获取任务 */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base text-foreground">如何获取积分</h2>
            <Link href="/points/tasks" className="text-xs text-muted-foreground flex items-center gap-1">
              更多任务 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <Card className="divide-y divide-border">
            {tasks.map(task => {
              const Icon = iconMap[task.icon] || Calendar
              return (
                <div key={task.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{task.title}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-0">
                          +{task.points}积分
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.limit}
                        {task.current !== undefined && ` (${task.current}/${task.max})`}
                      </p>
                    </div>
                  </div>
                  
                  {task.completed ? (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已完成
                    </Badge>
                  ) : (
                    <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-primary/90 transition-colors">
                      {task.action}
                    </button>
                  )}
                </div>
              )
            })}
          </Card>
        </div>

        {/* 积分兑换 */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base text-foreground">积分兑换</h2>
            <Link href="/points/exchange" className="text-xs text-muted-foreground flex items-center gap-1">
              全部商品 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {exchangeItems.map(item => {
              const Icon = iconMap[item.icon] || Gift
              const canExchange = userPoints >= item.points
              
              return (
                <Card 
                  key={item.id}
                  className={`p-3 ${canExchange ? 'hover:bg-secondary/50 cursor-pointer' : 'opacity-60'}`}
                  onClick={() => canExchange && handleExchange(item)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-muted-foreground/30 text-muted-foreground">
                      剩{item.stock}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-accent" />
                      <span className="text-sm font-medium text-accent">{item.points}</span>
                    </div>
                    <button 
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        canExchange 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'bg-secondary text-muted-foreground'
                      }`}
                      disabled={!canExchange}
                    >
                      {canExchange ? '兑换' : '积分不足'}
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* 积分明细预览 */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base text-foreground">近期明细</h2>
            <Link href="/points/history" className="text-xs text-muted-foreground flex items-center gap-1">
              全部记录 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <Card className="divide-y divide-border">
            {history.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
                <span className={`text-sm font-medium ${
                  item.type === 'earn' ? 'text-green-500' : 'text-primary'
                }`}>
                  {item.points > 0 ? '+' : ''}{item.points}
                </span>
              </div>
            ))}
          </Card>
        </div>

        {/* 积分说明 */}
        <div className="px-4 mt-6">
          <Card className="p-3 bg-secondary/50">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">积分说明：</strong>
              积分可用于兑换优惠券、国学币、会员体验及实物礼品。积分有效期为获取后12个月，请及时使用。
            </p>
          </Card>
        </div>
      </DataState>

      {/* 兑换确认弹窗 */}
      {showExchangeModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-[85%] max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200">
            {!exchangeSuccess ? (
              <>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">确认兑换</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    使用 <span className="text-accent font-medium">{selectedItem.points}积分</span> 兑换
                  </p>
                </div>
                
                <Card className="p-3 bg-secondary/50 mb-4">
                  <p className="text-sm font-medium text-foreground text-center">{selectedItem.title}</p>
                </Card>
                
                <p className="text-xs text-muted-foreground text-center mb-4">
                  兑换后积分余额：{(userPoints - selectedItem.points).toLocaleString()}
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowExchangeModal(false)}
                    className="flex-1 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={confirmExchange}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    确认兑换
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">兑换成功</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedItem.title} 已发放至您的账户
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
