"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Users, Clock, Share2, ChevronRight, X, Copy, MessageCircle, QrCode, Flame, ShieldCheck } from "lucide-react"
import { marketingApi, type GroupBuy, type MyGroupBuy } from "@/lib/api"

// Mock数据
const mockGroupBuys: GroupBuy[] = [
  { id: "1", title: "周易六十四卦详解", cover: "/marketing/course.png", price: 99, originalPrice: 168, minMembers: 3, currentMembers: 2, endTime: new Date(Date.now() + 8 * 3600000).toISOString(), status: "ongoing" },
  { id: "2", title: "紫微斗数入门精讲", cover: "/marketing/course.png", price: 128, originalPrice: 238, minMembers: 5, currentMembers: 3, endTime: new Date(Date.now() + 12 * 3600000).toISOString(), status: "ongoing" },
  { id: "3", title: "风水学基础教程", cover: "/marketing/course.png", price: 68, originalPrice: 128, minMembers: 3, currentMembers: 3, endTime: new Date(Date.now() - 3600000).toISOString(), status: "success" },
]

const mockMyGroups: MyGroupBuy[] = [
  { id: "g1", productId: "1", productName: "周易六十四卦详解", productCover: "/marketing/course.png", price: 99, status: "pending", members: [{ id: "u1", name: "张三", avatar: "/placeholder.svg" }, { id: "u2", name: "李四", avatar: "/placeholder.svg" }], minMembers: 3, currentMembers: 2, endTime: new Date(Date.now() + 6 * 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(), isOwner: true },
]

function formatCountdown(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return { h: "00", m: "00", s: "00", expired: true }
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { h: h.toString().padStart(2, "0"), m: m.toString().padStart(2, "0"), s: s.toString().padStart(2, "0"), expired: false }
}

// 参团头像簇（社交温度）
function MemberStack({ current, total }: { current: number; total: number }) {
  const remaining = Math.max(0, total - current)
  return (
    <div className="flex items-center -space-x-2">
      {Array.from({ length: current }).map((_, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full border-2 border-surface bg-gradient-to-br from-brand to-brand-soft flex items-center justify-center"
        >
          <Users className="w-3 h-3 text-primary-foreground" />
        </div>
      ))}
      {Array.from({ length: remaining }).map((_, i) => (
        <div
          key={`e-${i}`}
          className="w-6 h-6 rounded-full border-2 border-surface bg-muted flex items-center justify-center"
        >
          <span className="text-[10px] text-ink-faint">+</span>
        </div>
      ))}
    </div>
  )
}

export default function GroupBuyPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"all" | "my">("all")
  const [loading, setLoading] = useState(true)
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([])
  const [myGroups, setMyGroups] = useState<MyGroupBuy[]>([])
  const [, setTick] = useState(0)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [shareTarget, setShareTarget] = useState<MyGroupBuy | null>(null)

  useEffect(() => {
    loadData()
    const timer = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [list, my] = await Promise.all([
        marketingApi.groupBuys().catch(() => mockGroupBuys),
        marketingApi.myGroupBuys().catch(() => mockMyGroups),
      ])
      setGroupBuys(list)
      setMyGroups(my)
    } catch {
      setGroupBuys(mockGroupBuys)
      setMyGroups(mockMyGroups)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = (groupId: string) => {
    router.push(`/shop/group-buy/${groupId}`)
  }

  const handleCreate = (productId: string) => {
    router.push(`/shop/group-buy/${productId}?action=create`)
  }

  const handleShareClick = (group: MyGroupBuy) => {
    setShareTarget(group)
    setShowSharePanel(true)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://rebu.app/shop/group-buy/${shareTarget?.id}`)
    setShowSharePanel(false)
  }

  return (
    <div className="min-h-screen bg-surface-base max-w-lg mx-auto">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 bg-gradient-to-br from-[#a01830] via-brand to-brand-soft text-primary-foreground">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold font-serif flex items-center gap-1.5">
            <Users className="w-5 h-5 text-gold" />
            拼团特惠
          </h1>
        </div>

        {/* Tab切换 */}
        <div className="flex px-4 pb-3 gap-4">
          {[{ key: "all", label: "拼团商品" }, { key: "my", label: "我的拼团" }].map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as "all" | "my")}
              className={`pb-2 px-2 text-sm font-medium border-b-2 transition-all ${
                tab === item.key ? "border-gold text-primary-foreground" : "border-transparent text-primary-foreground/70"
              }`}
            >
              {item.label}
              {item.key === "my" && myGroups.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-gold/25 rounded-full text-xs">{myGroups.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 拼团说明横幅 */}
      <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-gold/15 to-gold/5 border border-gold/25 rounded-xl flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-soft rounded-full flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-ink">邀请好友一起拼团</div>
          <div className="text-xs text-ink-soft">人越多越便宜，拼团成功立享优惠</div>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-faint" />
      </div>

      {loading ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-24 h-24 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-full mt-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === "all" ? (
        <div className="p-4 space-y-4">
          {groupBuys.map(item => {
            const countdown = formatCountdown(item.endTime)
            const progress = Math.round((item.currentMembers / item.minMembers) * 100)
            const isSuccess = item.status === "success"

            return (
              <div key={item.id} className="bg-surface rounded-2xl p-4 card-shadow">
                <div className="flex gap-3">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.cover || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                    {/* 拼团角标 */}
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-brand to-brand-soft text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-br-lg">
                      {item.minMembers}人团
                    </div>
                    {isSuccess && (
                      <div className="absolute inset-0 bg-ink/55 flex items-center justify-center">
                        <span className="text-primary-foreground text-xs font-medium">已成团</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-ink truncate">{item.title}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-brand text-xl font-bold leading-none">
                        <span className="text-sm align-top">¥</span>
                        {item.price}
                      </span>
                      <span className="text-ink-faint text-xs line-through">单买¥{item.originalPrice}</span>
                    </div>
                    <div className="mt-1.5 inline-flex items-center px-1.5 py-0.5 bg-gold/15 text-gold text-xs font-bold rounded border border-gold/30">
                      拼团省{item.originalPrice - item.price}元
                    </div>

                    {/* 拼团进度 */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5">
                          <MemberStack current={item.currentMembers} total={item.minMembers} />
                          <span className="text-ink-soft">
                            {isSuccess ? "已拼满" : `还差${item.minMembers - item.currentMembers}人`}
                          </span>
                        </span>
                        {!countdown.expired && (
                          <div className="flex items-center gap-1 text-brand font-medium tabular-nums">
                            <Clock className="w-3 h-3" />
                            <span>{countdown.h}:{countdown.m}:{countdown.s}</span>
                          </div>
                        )}
                      </div>
                      <div className="h-1.5 bg-brand/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand to-brand-soft rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                {!isSuccess && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleJoin(item.id)}
                      className="btn-shimmer relative flex-1 py-2.5 bg-gradient-to-r from-brand to-brand-soft text-primary-foreground text-sm font-bold rounded-full flex items-center justify-center gap-1"
                    >
                      <Flame className="w-4 h-4 text-gold fill-gold" />
                      去拼团
                    </button>
                    <button
                      onClick={() => handleCreate(item.id)}
                      className="flex-1 py-2.5 border border-brand text-brand text-sm font-medium rounded-full flex items-center justify-center gap-1"
                    >
                      <Share2 className="w-4 h-4" />
                      开新团
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {myGroups.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-ink-faint" />
              </div>
              <p className="text-ink-faint mb-4">暂无拼团记录</p>
              <button
                onClick={() => setTab("all")}
                className="px-6 py-2 bg-brand text-primary-foreground text-sm rounded-full"
              >
                去拼团
              </button>
            </div>
          ) : (
            myGroups.map(item => {
              const countdown = formatCountdown(item.endTime)
              const statusMap = {
                pending: { text: "拼团中", color: "bg-brand" },
                success: { text: "已成团", color: "bg-success" },
                failed: { text: "拼团失败", color: "bg-ink-faint" },
              }
              const statusInfo = statusMap[item.status]

              return (
                <div key={item.id} className="bg-surface rounded-2xl p-4 card-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 ${statusInfo.color} text-primary-foreground text-xs rounded-full`}>
                      {statusInfo.text}
                    </span>
                    {item.isOwner && (
                      <span className="px-2 py-0.5 bg-gold/15 text-gold text-xs rounded-full border border-gold/30">团长</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <img src={item.productCover || "/placeholder.svg"} alt={item.productName} className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-ink truncate">{item.productName}</h3>
                      <div className="text-brand font-bold mt-1">
                        <span className="text-sm align-top">¥</span>
                        {item.price}
                      </div>

                      {/* 成员头像 */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-2">
                          {item.members.slice(0, 4).map((m, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-surface bg-gradient-to-br from-brand to-brand-soft flex items-center justify-center">
                              <Users className="w-3 h-3 text-primary-foreground" />
                            </div>
                          ))}
                          {Array.from({ length: item.minMembers - item.members.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-6 h-6 rounded-full border-2 border-surface bg-muted flex items-center justify-center">
                              <span className="text-[10px] text-ink-faint">?</span>
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-ink-soft">还差{item.minMembers - item.currentMembers}人成团</span>
                      </div>
                    </div>
                  </div>

                  {item.status === "pending" && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                      <div className="flex items-center gap-1 text-sm text-brand font-medium tabular-nums">
                        <Clock className="w-4 h-4" />
                        <span>剩余 {countdown.h}:{countdown.m}:{countdown.s}</span>
                      </div>
                      <button
                        onClick={() => handleShareClick(item)}
                        className="btn-shimmer relative px-4 py-1.5 bg-gradient-to-r from-brand to-brand-soft text-primary-foreground text-sm rounded-full flex items-center gap-1"
                      >
                        <Share2 className="w-4 h-4" />
                        邀请好友
                      </button>
                    </div>
                  )}

                  {item.status === "success" && (
                    <div className="mt-4 pt-4 border-t border-line flex items-center gap-2 text-sm text-success">
                      <ShieldCheck className="w-4 h-4" />
                      拼团成功，商品将尽快为您发货
                    </div>
                  )}

                  {item.status === "failed" && (
                    <div className="mt-4 pt-4 border-t border-line text-sm text-ink-soft">
                      很遗憾未在规定时间内成团，已支付金额将原路退回钱包
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 分享弹窗 */}
      {showSharePanel && shareTarget && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setShowSharePanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface rounded-t-3xl overflow-hidden">
            {/* 头部 */}
            <div className="relative p-4 pb-0">
              <button
                onClick={() => setShowSharePanel(false)}
                className="absolute right-4 top-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5 text-ink-faint" />
              </button>
              <h3 className="text-lg font-bold font-serif text-center text-ink">邀请好友参团</h3>
              <p className="text-sm text-ink-soft text-center mt-1">
                还差 <span className="text-brand font-bold">{shareTarget.minMembers - shareTarget.currentMembers}</span> 人即可成团
              </p>
            </div>

            {/* 商品预览 */}
            <div className="mx-4 mt-4 p-3 bg-surface-sunken rounded-xl flex gap-3">
              <img src={shareTarget.productCover || "/placeholder.svg"} alt="" className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-ink truncate">{shareTarget.productName}</p>
                <p className="text-brand font-bold mt-1">¥{shareTarget.price}</p>
              </div>
            </div>

            {/* 分享方式 */}
            <div className="p-4">
              <p className="text-sm text-ink-soft mb-3">分享至</p>
              <div className="grid grid-cols-4 gap-4">
                <button className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#07C160] flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs text-ink-soft">微信好友</span>
                </button>
                <button className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#07C160] flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs text-ink-soft">朋友圈</span>
                </button>
                <button className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs text-ink-soft">二维码</span>
                </button>
                <button onClick={handleCopyLink} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-[#b8985f] flex items-center justify-center">
                    <Copy className="w-6 h-6 text-ink" />
                  </div>
                  <span className="text-xs text-ink-soft">复制链接</span>
                </button>
              </div>
            </div>

            {/* 底部提示 */}
            <div className="px-4 pb-8 pt-2">
              <div className="p-3 bg-gold/10 border border-gold/20 rounded-lg">
                <p className="text-xs text-ink-soft text-center">
                  分享给好友，TA购买后即可帮你成团，成团后自动发货
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
