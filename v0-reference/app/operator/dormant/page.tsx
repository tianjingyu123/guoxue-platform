"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Bell, Check, MessageCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DormantMember {
  id: string
  name: string
  level: string
  lastActiveDays: number
  totalCommission: number
  reminded: boolean
}

const dormantMembers: DormantMember[] = [
  { id: "m1", name: "李静雅", level: "金牌站长", lastActiveDays: 32, totalCommission: 4820, reminded: false },
  { id: "m2", name: "王德发", level: "普通站长", lastActiveDays: 45, totalCommission: 1280, reminded: false },
  { id: "m3", name: "陈明", level: "普通站长", lastActiveDays: 38, totalCommission: 960, reminded: false },
  { id: "m4", name: "赵丽", level: "银牌站长", lastActiveDays: 61, totalCommission: 2340, reminded: true },
]

export default function DormantStationsPage() {
  const [members, setMembers] = useState(dormantMembers)
  const [batchReminded, setBatchReminded] = useState(false)

  const remindOne = (id: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, reminded: true } : m))
  }

  const remindAll = () => {
    setMembers(prev => prev.map(m => ({ ...m, reminded: true })))
    setBatchReminded(true)
    setTimeout(() => setBatchReminded(false), 2000)
  }

  const pendingCount = members.filter(m => !m.reminded).length

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/operator/dashboard" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">沉寂站长预警</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 统计卡 */}
      <div className="px-4 py-4">
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/40 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">超过 30 天无推广动作</p>
              <p className="text-2xl font-bold text-gray-900">{members.length} <span className="text-sm font-normal text-gray-400">位站长</span></p>
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-3 leading-relaxed">
            及时唤醒沉寂站长有助于提升团队整体活跃度与佣金产出，建议定期推送关怀提醒。
          </p>
        </Card>
      </div>

      {/* 沉寂站长列表 */}
      {members.length > 0 ? (
        <div className="px-4 space-y-3">
          {members.map(member => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-400">{member.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">{member.name}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{member.level}</span>
                  </div>
                  <p className="text-xs text-amber-600 mt-0.5">
                    已沉寂 {member.lastActiveDays} 天 · 累计佣金 ¥{member.totalCommission}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={member.reminded ? "outline" : "default"}
                  disabled={member.reminded}
                  onClick={() => remindOne(member.id)}
                  className={cn(!member.reminded && "bg-amber-500 hover:bg-amber-600")}
                >
                  {member.reminded ? (
                    <><Check className="w-3.5 h-3.5 mr-1" />已提醒</>
                  ) : (
                    <><Bell className="w-3.5 h-3.5 mr-1" />提醒</>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Users className="w-8 h-8 text-success" />
          </div>
          <p className="text-gray-900 font-medium">暂无沉寂站长</p>
          <p className="text-sm text-gray-400 mt-1">您的团队都很活跃，继续保持！</p>
        </div>
      )}

      {/* 一键推送 */}
      {pendingCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <Button onClick={remindAll} className="w-full h-11 bg-amber-500 hover:bg-amber-600">
            {batchReminded ? (
              <><Check className="w-4 h-4 mr-2" />已全部推送</>
            ) : (
              <><MessageCircle className="w-4 h-4 mr-2" />一键提醒全部（{pendingCount}）</>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
