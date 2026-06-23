"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Calendar,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle,
  ChevronRight,
  Filter,
  X,
  BookOpen,
  ShoppingBag,
  Users,
  Gift
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  getSettlements,
  getSettlementDetail,
  getSettlementStatusLabel,
  getSettlementStatusColor,
  getIncomeTypeLabel,
  getIncomeTypeColor,
} from "@/lib/api/offline"
import type { Settlement, SettlementDetail, SettlementStats, SettlementStatus, IncomeType } from "@/lib/types/offline"

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </header>
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}

function SettlementsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stationId = Number(searchParams.get('stationId')) || 1

  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [stats, setStats] = useState<SettlementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<SettlementStatus | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showDetail, setShowDetail] = useState(false)
  const [detailData, setDetailData] = useState<SettlementDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  const statusOptions: { value: SettlementStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待结算' },
    { value: 'processing', label: '结算中' },
    { value: 'completed', label: '已结算' },
  ]

  const years = [2026, 2025, 2024]

  useEffect(() => {
    loadSettlements()
  }, [stationId, selectedStatus, selectedYear])

  async function loadSettlements() {
    setLoading(true)
    try {
      const res = await getSettlements({
        stationId,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        year: selectedYear,
      })
      if (res.code === 200 && res.data) {
        setSettlements(res.data.list)
        setStats(res.data.stats)
      }
    } finally {
      setLoading(false)
    }
  }

  async function openDetail(settlement: Settlement) {
    setShowDetail(true)
    setDetailLoading(true)
    try {
      const res = await getSettlementDetail(settlement.id)
      if (res.code === 200 && res.data) {
        setDetailData(res.data)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  function getIncomeIcon(type: IncomeType) {
    const icons = {
      course: BookOpen,
      product: ShoppingBag,
      booking: Users,
      commission: Gift,
    }
    return icons[type]
  }

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">收入结算</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowFilter(true)}
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 统计卡片 */}
      {stats && (
        <div className="p-4">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
            <div className="text-sm opacity-90 mb-1">累计收入</div>
            <div className="text-3xl font-bold mb-4">
              ¥{stats.totalNetAmount.toLocaleString()}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="opacity-75">总收入</div>
                <div className="font-medium">¥{stats.totalIncome.toLocaleString()}</div>
              </div>
              <div>
                <div className="opacity-75">扣除</div>
                <div className="font-medium">¥{stats.totalDeduction.toLocaleString()}</div>
              </div>
              <div>
                <div className="opacity-75">待结算</div>
                <div className="font-medium">¥{stats.pendingAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 状态筛选 */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statusOptions.map(option => (
            <Button
              key={option.value}
              variant={selectedStatus === option.value ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0"
              onClick={() => setSelectedStatus(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 结算列表 */}
      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : settlements.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">暂无结算记录</p>
          </div>
        ) : (
          settlements.map(settlement => (
            <div
              key={settlement.id}
              className="bg-card rounded-lg border border-border p-4 cursor-pointer active:bg-muted/50"
              onClick={() => openDetail(settlement)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {settlement.periodStart} ~ {settlement.periodEnd}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    结算单号：{settlement.settlementNo}
                  </div>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  getSettlementStatusColor(settlement.status)
                )}>
                  {getSettlementStatusLabel(settlement.status)}
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div className="grid grid-cols-3 gap-4 text-sm flex-1">
                  <div>
                    <div className="text-muted-foreground text-xs">收入</div>
                    <div className="font-medium">¥{settlement.totalIncome.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">扣除</div>
                    <div className="font-medium text-red-500">-¥{settlement.totalDeduction.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">实收</div>
                    <div className="font-medium text-green-600">¥{settlement.netAmount.toLocaleString()}</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 筛选弹窗 */}
      {showFilter && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowFilter(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">筛选</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowFilter(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-2">选择年份</div>
              <div className="flex flex-wrap gap-2">
                {years.map(year => (
                  <Button
                    key={year}
                    variant={selectedYear === year ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}年
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setShowFilter(false)}
            >
              确定
            </Button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetail && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowDetail(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-semibold">结算详情</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {detailLoading ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-40 rounded-lg" />
              </div>
            ) : detailData && (
              <div className="p-4 space-y-4">
                {/* 结算概览 */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {detailData.periodStart} ~ {detailData.periodEnd}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full ml-auto",
                      getSettlementStatusColor(detailData.status)
                    )}>
                      {getSettlementStatusLabel(detailData.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">总收入</div>
                      <div className="font-semibold">¥{detailData.totalIncome.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">扣除</div>
                      <div className="font-semibold text-red-500">-¥{detailData.totalDeduction.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">实收</div>
                      <div className="font-semibold text-green-600">¥{detailData.netAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* 收入构成 */}
                <div>
                  <h4 className="font-medium mb-3">收入构成</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {detailData.incomeByType.map(item => {
                      const Icon = getIncomeIcon(item.type)
                      return (
                        <div key={item.type} className="bg-card rounded-lg border border-border p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("p-1.5 rounded", getIncomeTypeColor(item.type))}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm">{getIncomeTypeLabel(item.type)}</span>
                          </div>
                          <div className="font-semibold">¥{item.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{item.count}笔</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 收入明细 */}
                <div>
                  <h4 className="font-medium mb-3">收入明细</h4>
                  <div className="space-y-2">
                    {detailData.incomeItems.map(item => {
                      const Icon = getIncomeIcon(item.type)
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                          <div className={cn("p-1.5 rounded", getIncomeTypeColor(item.type))}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.time}</div>
                          </div>
                          <div className="font-medium text-green-600">+¥{item.amount}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 扣除明细 */}
                <div>
                  <h4 className="font-medium mb-3">扣除明细</h4>
                  <div className="space-y-2">
                    {detailData.deductionItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm">{item.title}</div>
                          {item.remark && (
                            <div className="text-xs text-muted-foreground">{item.remark}</div>
                          )}
                        </div>
                        <div className="font-medium text-red-500">-¥{item.amount.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettlementsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SettlementsContent />
    </Suspense>
  )
}
