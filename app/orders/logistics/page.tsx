"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Copy, Check, Phone, Truck, Package, MapPin, Clock, CheckCircle2 } from "lucide-react"
import { shopApi, type LogisticsDetail } from "@/lib/api"

const mockLogistics: LogisticsDetail = {
  orderId: "o1",
  orderNo: "202412010001",
  company: "顺丰速运",
  companyLogo: "/placeholder.svg",
  companyPhone: "95338",
  trackingNo: "SF1234567890123",
  status: "in_transit",
  estimatedDelivery: "2024-12-03 18:00",
  courierName: "张师傅",
  courierPhone: "13800138000",
  receiver: {
    name: "张三",
    phone: "138****8888",
    address: "北京市朝阳区建国路88号SOHO现代城A座1201",
  },
  tracks: [
    { status: "in_transit", description: "快件已到达【北京朝阳营业点】，正在派送中", time: "2024-12-02 14:30", location: "北京市朝阳区", isCurrent: true },
    { status: "in_transit", description: "快件已到达【北京转运中心】", time: "2024-12-02 08:15", location: "北京市顺义区", isCurrent: false },
    { status: "in_transit", description: "快件已从【上海转运中心】发出", time: "2024-12-01 22:00", location: "上海市青浦区", isCurrent: false },
    { status: "picked", description: "快件已到达【上海转运中心】", time: "2024-12-01 18:30", location: "上海市青浦区", isCurrent: false },
    { status: "picked", description: "已揽收，快递员：李师傅 13900139000", time: "2024-12-01 15:20", location: "上海市浦东新区", isCurrent: false },
    { status: "pending", description: "商家已发货，等待揽收", time: "2024-12-01 14:00", location: "上海市浦东新区", isCurrent: false },
  ],
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待揽收", color: "bg-gray-500" },
  picked: { label: "已揽收", color: "bg-blue-500" },
  in_transit: { label: "运输中", color: "bg-[#C41E3A]" },
  delivering: { label: "派送中", color: "bg-orange-500" },
  delivered: { label: "已送达", color: "bg-green-500" },
  signed: { label: "已签收", color: "bg-green-600" },
}

function LogisticsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [logistics, setLogistics] = useState<LogisticsDetail | null>(null)
  const [copied, setCopied] = useState(false)

  const orderId = searchParams.get('orderId')

  useEffect(() => {
    const fetchLogistics = async () => {
      try {
        if (orderId) {
          const data = await shopApi.getLogistics(orderId)
          setLogistics(data)
        }
      } catch {
        setLogistics(mockLogistics)
      } finally {
        setLoading(false)
      }
    }
    fetchLogistics()
  }, [orderId])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!logistics) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center">
        <Package className="w-16 h-16 text-[#999999] mb-4" />
        <p className="text-[#666666]">暂无物流信息</p>
      </div>
    )
  }

  const statusInfo = statusMap[logistics.status] || statusMap.pending

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <h1 className="text-lg font-semibold text-[#2C2C2C]">物流详情</h1>
      </div>

      {/* 物流状态卡片 */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-[#C41E3A] to-[#E8546A] rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{logistics.company}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{statusInfo.label}</span>
            </div>
            <div className="text-sm text-white/80 mt-0.5">运单号：{logistics.trackingNo}</div>
          </div>
          <button
            onClick={() => handleCopy(logistics.trackingNo)}
            className="p-2 bg-white/20 rounded-lg"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        
        {logistics.estimatedDelivery && (
          <div className="flex items-center gap-2 text-sm text-white/90 bg-white/10 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4" />
            <span>预计送达：{logistics.estimatedDelivery}</span>
          </div>
        )}
      </div>

      {/* 快递员信息 */}
      {logistics.courierName && (
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FAF8F5] rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-[#C41E3A]" />
              </div>
              <div>
                <div className="font-medium text-[#2C2C2C]">快递员：{logistics.courierName}</div>
                <div className="text-sm text-[#999999]">正在为您派送</div>
              </div>
            </div>
            {logistics.courierPhone && (
              <button
                onClick={() => handleCall(logistics.courierPhone!)}
                className="flex items-center gap-1 px-4 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
              >
                <Phone className="w-4 h-4" />
                <span>联系</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 收货地址 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#FAF8F5] rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-[#C41E3A]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-[#2C2C2C]">{logistics.receiver.name}</span>
              <span className="text-[#666666]">{logistics.receiver.phone}</span>
            </div>
            <p className="text-sm text-[#666666] leading-relaxed">{logistics.receiver.address}</p>
          </div>
        </div>
      </div>

      {/* 物流轨迹 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <h3 className="font-semibold text-[#2C2C2C] mb-4">物流轨迹</h3>
        <div className="relative">
          {logistics.tracks.map((track, index) => (
            <div key={index} className="flex gap-4 pb-6 last:pb-0">
              {/* 时间线 */}
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${track.isCurrent ? 'bg-[#C41E3A]' : 'bg-[#E8E3DB]'} ${track.isCurrent ? 'ring-4 ring-[#C41E3A]/20' : ''}`} />
                {index < logistics.tracks.length - 1 && (
                  <div className="w-0.5 flex-1 bg-[#E8E3DB] mt-1" />
                )}
              </div>
              {/* 内容 */}
              <div className="flex-1 -mt-1">
                <p className={`text-sm leading-relaxed ${track.isCurrent ? 'text-[#2C2C2C] font-medium' : 'text-[#666666]'}`}>
                  {track.description}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#999999]">
                  <span>{track.time}</span>
                  {track.location && (
                    <>
                      <span className="w-1 h-1 bg-[#999999] rounded-full" />
                      <span>{track.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3">
        <div className="flex gap-3">
          {logistics.companyPhone && (
            <button
              onClick={() => handleCall(logistics.companyPhone!)}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#E8E3DB] rounded-xl text-[#666666]"
            >
              <Phone className="w-5 h-5" />
              <span>联系物流公司</span>
            </button>
          )}
          <button
            onClick={() => router.push(`/orders/${logistics.orderId}`)}
            className="flex-1 py-3 bg-[#C41E3A] text-white rounded-xl font-medium"
          >
            查看订单
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function LogisticsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LogisticsPageContent />
    </Suspense>
  )
}
