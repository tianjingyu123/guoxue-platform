'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, CheckCircle, AlertCircle, ArrowUpRight, DollarSign } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'

// Mock data - 提现记录
const mockWithdrawRecords = [
  {
    id: 'WD20240120001',
    amount: 5000,
    fee: 30,
    actualAmount: 4970,
    method: '支付宝',
    account: '138****8888',
    status: 'completed',
    statusText: '已到账',
    time: '2024-01-20 10:30',
    completedTime: '2024-01-20 14:30',
  },
  {
    id: 'WD20240118002',
    amount: 2000,
    fee: 12,
    actualAmount: 1988,
    method: '微信零钱',
    account: '微信用户_张三',
    status: 'processing',
    statusText: '处理中',
    time: '2024-01-18 15:20',
    completedTime: null,
  },
  {
    id: 'WD20240115003',
    amount: 3500,
    fee: 21,
    actualAmount: 3479,
    method: '银行卡',
    account: '工商银行 尾号8888',
    status: 'completed',
    statusText: '已到账',
    time: '2024-01-15 09:45',
    completedTime: '2024-01-17 10:20',
  },
  {
    id: 'WD20240110004',
    amount: 1500,
    fee: 9,
    actualAmount: 1491,
    method: '支付宝',
    account: '138****8888',
    status: 'completed',
    statusText: '已到账',
    time: '2024-01-10 16:10',
    completedTime: '2024-01-10 20:30',
  },
  {
    id: 'WD20240105005',
    amount: 8000,
    fee: 48,
    actualAmount: 7952,
    method: '银行卡',
    account: '工商银行 尾号8888',
    status: 'completed',
    statusText: '已到账',
    time: '2024-01-05 11:20',
    completedTime: '2024-01-07 14:10',
  },
  {
    id: 'WD20240101006',
    amount: 2500,
    fee: 15,
    actualAmount: 2485,
    method: '微信零钱',
    account: '微信用户_张三',
    status: 'cancelled',
    statusText: '已取消',
    time: '2024-01-01 13:40',
    completedTime: null,
  },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-600" />
    case 'processing':
      return <Clock className="w-5 h-5 text-blue-600" />
    case 'cancelled':
      return <AlertCircle className="w-5 h-5 text-red-600" />
    default:
      return <DollarSign className="w-5 h-5 text-foreground/60" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'processing':
      return 'bg-blue-100 text-blue-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function WithdrawRecordsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState(mockWithdrawRecords)

  const totalWithdrawn = records
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.actualAmount, 0)

  const processingAmount = records
    .filter(r => r.status === 'processing')
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">提现记录</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        empty={records.length === 0}
        skeleton={
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <div className="pb-20">
          {/* 统计卡片 */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">已提现金额</div>
              <div className="text-2xl font-bold text-foreground">
                ¥{totalWithdrawn.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </Card>
            <Card className="p-4 text-center border border-blue-200 bg-blue-50">
              <div className="text-xs text-blue-700 mb-1">处理中金额</div>
              <div className="text-2xl font-bold text-blue-600">
                ¥{processingAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </Card>
          </div>

          {/* 提现记录列表 */}
          <div className="mx-4 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">提现明细</h3>
            <div className="space-y-2">
              {records.map(record => (
                <button
                  key={record.id}
                  onClick={() => {}}
                  className="w-full p-4 rounded-xl border border-border hover:border-primary/30 bg-card transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(record.status)}
                      <div>
                        <h3 className="font-semibold text-foreground">{record.method}</h3>
                        <div className="text-xs text-muted-foreground mt-0.5">{record.account}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground flex items-center gap-1">
                        <ArrowUpRight className="w-4 h-4" /> ¥{record.actualAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <Badge className={`${getStatusColor(record.status)} text-[10px] mt-1`}>
                        {record.statusText}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      <span>申请: {record.time}</span>
                      {record.completedTime && (
                        <span className="ml-3">完成: {record.completedTime}</span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      手续费: ¥{record.fee.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* 展开详情提示 */}
                  <div className="mt-2 pt-2 border-t border-border/50 text-xs text-primary">
                    点击查看详情
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 提示信息 */}
          <div className="mx-4 mt-6 p-4 bg-muted/50 rounded-xl">
            <h4 className="text-sm font-semibold text-foreground mb-2">提现说明</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 提现手续费为提现金额的 0.6%，最低 1 元</li>
              <li>• 微信、支付宝通常 2 小时内到账</li>
              <li>• 银行卡通常 1-3 个工作日到账</li>
              <li>• 周末及节假日可能延迟到账</li>
            </ul>
          </div>
        </div>
      </DataState>
    </div>
  )
}
