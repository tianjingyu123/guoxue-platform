"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Share2, Users, Clock, Crown, Check, Plus } from "lucide-react"
import { marketingApi, type GroupBuyDetail } from "@/lib/api"

interface ActiveGroup {
  id: string
  owner: { id: string; name: string; avatar: string }
  members: { id: string; name: string; avatar: string }[]
  currentMembers: number
  minMembers: number
  endTime: string
}

const mockDetail: GroupBuyDetail = {
  id: "1",
  title: "周易六十四卦详解",
  cover: "/placeholder.svg",
  price: 99,
  originalPrice: 199,
  minMembers: 3,
  currentMembers: 0,
  endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  status: "ongoing",
  description: "精装典藏版，收录完整六十四卦卦辞、爻辞及历代名家注解。",
  members: [],
  rules: ["拼团有效期24小时", "成团后不可退款", "未成团自动退款"],
}

const mockGroups: ActiveGroup[] = [
  { id: "g1", owner: { id: "u1", name: "张三", avatar: "/placeholder.svg" }, members: [{ id: "u2", name: "李四", avatar: "/placeholder.svg" }], currentMembers: 2, minMembers: 3, endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
  { id: "g2", owner: { id: "u3", name: "王五", avatar: "/placeholder.svg" }, members: [], currentMembers: 1, minMembers: 3, endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() },
]

export default function GroupBuyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<GroupBuyDetail | null>(null)
  const [groups, setGroups] = useState<ActiveGroup[]>([])
  const [countdown, setCountdown] = useState<Record<string, { h: number; m: number; s: number }>>({})
  const [joining, setJoining] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await marketingApi.groupBuyDetail(params.id as string)
        setDetail(res)
        setGroups(mockGroups)
      } catch {
        setDetail(mockDetail)
        setGroups(mockGroups)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [params.id])

  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdown: Record<string, { h: number; m: number; s: number }> = {}
      groups.forEach(g => {
        const diff = Math.max(0, new Date(g.endTime).getTime() - Date.now())
        newCountdown[g.id] = {
          h: Math.floor(diff / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000),
        }
      })
      setCountdown(newCountdown)
    }, 1000)
    return () => clearInterval(timer)
  }, [groups])

  const handleJoin = async (groupId: string) => {
    setJoining(groupId)
    try {
      await marketingApi.joinGroupBuy(groupId)
      router.push(`/shop/checkout?type=group&groupId=${groupId}`)
    } catch {
      alert("加入失败，请重试")
    } finally {
      setJoining(null)
    }
  }

  const handleCreate = async () => {
    if (!detail) return
    setCreating(true)
    try {
      const res = await marketingApi.createGroupBuy(detail.id)
      router.push(`/shop/checkout?type=group&groupId=${res.groupId}`)
    } catch {
      alert("开团失败，请重试")
    } finally {
      setCreating(false)
    }
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

  if (!detail) return null

  const saved = detail.originalPrice - detail.price

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#FF6B35] to-[#C41E3A] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-white font-medium">拼团详情</span>
        <button className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full">
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Product Info */}
      <div className="bg-white m-4 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex gap-4 p-4">
          <img src={detail.cover} alt={detail.title} className="w-28 h-28 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="font-bold text-[#2C2C2C] line-clamp-2">{detail.title}</h1>
            <p className="text-sm text-[#999999] mt-1 line-clamp-2">{detail.description}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[#C41E3A] font-bold text-xl">¥{detail.price}</span>
              <span className="text-[#999999] text-sm line-through">¥{detail.originalPrice}</span>
              <span className="bg-[#FFF0ED] text-[#C41E3A] text-xs px-2 py-0.5 rounded">省¥{saved}</span>
            </div>
          </div>
        </div>
        
        {/* Group Info */}
        <div className="bg-gradient-to-r from-[#FFF5F0] to-[#FFF0ED] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-sm text-[#666666]">{detail.minMembers}人成团</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-sm text-[#666666]">24小时有效</span>
          </div>
        </div>
      </div>

      {/* Active Groups */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[#2C2C2C]">正在拼团</h2>
          <span className="text-sm text-[#999999]">{groups.length}个团进行中</span>
        </div>

        <div className="space-y-3">
          {groups.map(group => {
            const ct = countdown[group.id] || { h: 0, m: 0, s: 0 }
            const remaining = group.minMembers - group.currentMembers
            return (
              <div key={group.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Owner */}
                  <div className="relative">
                    <img src={group.owner.avatar} alt={group.owner.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#FF6B35]" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex -space-x-2">
                    {group.members.map(m => (
                      <img key={m.id} src={m.avatar} alt={m.name} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                    ))}
                    {Array.from({ length: remaining }).map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-dashed border-[#E8E3DB] bg-[#F5F5F5] flex items-center justify-center">
                        <span className="text-[#CCCCCC] text-lg">?</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 text-right">
                    <div className="text-sm text-[#666666]">还差<span className="text-[#C41E3A] font-bold mx-1">{remaining}</span>人成团</div>
                    <div className="text-xs text-[#999999] mt-1 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {ct.h.toString().padStart(2, '0')}:{ct.m.toString().padStart(2, '0')}:{ct.s.toString().padStart(2, '0')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(group.id)}
                    disabled={joining === group.id}
                    className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#C41E3A] text-white text-sm font-medium rounded-full disabled:opacity-50"
                  >
                    {joining === group.id ? "加入中..." : "去参团"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {groups.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Users className="w-12 h-12 text-[#E8E3DB] mx-auto mb-3" />
            <p className="text-[#999999]">暂无进行中的拼团</p>
            <p className="text-sm text-[#CCCCCC] mt-1">快来开启第一个拼团吧</p>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-[#2C2C2C] mb-3">拼团规则</h2>
        <div className="space-y-2">
          {detail.rules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-[#666666]">
              <Check className="w-4 h-4 text-[#FF6B35] mt-0.5 flex-shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 flex gap-3">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex-1 py-3 bg-gradient-to-r from-[#FF6B35] to-[#C41E3A] text-white font-medium rounded-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {creating ? (
            "开团中..."
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>¥{detail.price} 开新团</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
