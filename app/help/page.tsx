"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Search, ChevronRight, ChevronDown, BookOpen, CreditCard, Users, GraduationCap, Store, UserCog, MessageCircle, HelpCircle, Flame, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AISearchButton, AISearchModal, useAISearch } from "@/components/ai-search"

// 问题分类
const categories = [
  { id: "guide", name: "用户指南", icon: BookOpen, color: "text-blue-500", bgColor: "bg-blue-500/10", desc: "新手入门、排盘使用" },
  { id: "payment", name: "支付与订单", icon: CreditCard, color: "text-green-500", bgColor: "bg-green-500/10", desc: "购买、支付、发票" },
  { id: "circle", name: "圈主指南", icon: Users, color: "text-purple-500", bgColor: "bg-purple-500/10", desc: "创建圈子、发布内容" },
  { id: "teacher", name: "讲师指南", icon: GraduationCap, color: "text-orange-500", bgColor: "bg-orange-500/10", desc: "上传课程、学员数据" },
  { id: "station", name: "站长指南", icon: Store, color: "text-pink-500", bgColor: "bg-pink-500/10", desc: "推广方法、团队管理" },
  { id: "account", name: "账号问题", icon: UserCog, color: "text-cyan-500", bgColor: "bg-cyan-500/10", desc: "密码、认证、注销" },
]

// 热门问题
const hotQuestions = [
  {
    id: 1,
    question: "如何使用八字排盘功能？",
    answer: "进入首页，点击底部导航栏中央的「排盘工具」按钮，选择「八字排盘」，输入出生日期、时间和性别，系统将自动生成您的八字命盘。会员用户可享受更详细的AI智能分析服务。",
    category: "用户指南",
    hot: true,
  },
  {
    id: 2,
    question: "国学币如何充值？",
    answer: "进入「我的」-「钱包」页面，点击「充值」按钮，选择预设档位或输入自定义金额，支持微信和支付宝支付。国学币与人民币比例为10:1，部分档位还有额外赠送。",
    category: "支付与订单",
    hot: true,
  },
  {
    id: 3,
    question: "如何创建自己的圈子？",
    answer: "您需要先完成实名认证，然后进入「我的」-「身份管理」，申请成为圈主。审核通过后，在「圈子」页面点击「创建圈子」，填写圈子名称、简介、封面图等信息即可。",
    category: "圈主指南",
    hot: true,
  },
  {
    id: 4,
    question: "课程购买后可以退款吗？",
    answer: "虚拟商品（课程、电子书等）一经购买，原则上不支持退款。如遇特殊情况（如内容与描述严重不符），可联系客服申请退款，平台将在7个工作日内审核处理。",
    category: "支付与订单",
  },
  {
    id: 5,
    question: "如何成为平台讲师？",
    answer: "进入「我的」-「身份管理」，点击「申请成为讲师」，提交个人资质证明、从业经历、代表作品等材料。审核周期约3-5个工作日，审核通过后即可上传课程。",
    category: "讲师指南",
  },
  {
    id: 6,
    question: "收益如何提现？",
    answer: "进入「我的」-「收益管理」-「申请提现」，输入提现金额（最低100元），选择提现方式（微信/支付宝/银行卡）。提现申请将在T+1至T+3个工作日内到账。",
    category: "圈主指南",
  },
  {
    id: 7,
    question: "如何修改登录密码？",
    answer: "进入「我的」-「设置」-「账号与安全」-「登录密码」，验证当前手机号后，输入新密码并确认即可完成修改。",
    category: "账号问题",
  },
  {
    id: 8,
    question: "如何开具发票？",
    answer: "订单支付成功后，进入「我的」-「我的订单」，找到对应订单，点击「申请发票」，填写发票抬头、税号等信息。电子发票将在3个工作日内发送至您的邮箱。",
    category: "支付与订单",
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const aiSearch = useAISearch()

  // 过滤问题
  const filteredQuestions = hotQuestions.filter(q => {
    const matchSearch = searchQuery === "" || 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = selectedCategory === null || q.category === categories.find(c => c.id === selectedCategory)?.name
    return matchSearch && matchCategory
  })

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* AI搜索弹窗 */}
      <AISearchModal isOpen={aiSearch.isOpen} onClose={aiSearch.close} placeholder="问我任何使用问题..." />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">帮助中心</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 搜索框 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="输入问题关键词，快速查找答案"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <AISearchButton onClick={aiSearch.open} />
        </div>

        {/* 问题分类 */}
        {searchQuery === "" && (
          <div>
            <h2 className="font-semibold text-sm text-foreground mb-3">问题分类</h2>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                      isSelected 
                        ? "bg-primary/10 ring-1 ring-primary/30" 
                        : "bg-card hover:bg-secondary"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cat.bgColor)}>
                      <Icon className={cn("w-5 h-5", cat.color)} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-foreground">{cat.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                清除筛选
              </button>
            )}
          </div>
        )}

        {/* 热门问题 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-sm text-foreground">
              {searchQuery ? "搜索结果" : selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "常见问题"}
            </h2>
            {!searchQuery && !selectedCategory && (
              <Flame className="w-4 h-4 text-orange-500" />
            )}
          </div>

          {filteredQuestions.length > 0 ? (
            <div className="space-y-2">
              {filteredQuestions.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "overflow-hidden transition-all",
                    expandedId === item.id ? "bg-secondary/50" : "bg-card"
                  )}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    <HelpCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground line-clamp-2">
                          {item.question}
                        </p>
                        {item.hot && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-500 border-0 shrink-0">
                            热门
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                        expandedId === item.id && "rotate-180"
                      )} 
                    />
                  </button>
                  
                  {expandedId === item.id && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="pl-8 pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-muted-foreground">这个回答有帮助吗？</span>
                          <button className="text-xs text-primary hover:underline">有帮助</button>
                          <button className="text-xs text-muted-foreground hover:text-foreground">没有帮助</button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">没有找到相关问题</p>
              <p className="text-xs text-muted-foreground">��试其他关键词，或联系客服获取帮助</p>
            </div>
          )}
        </div>

        {/* 更多帮助 */}
        <div>
          <h2 className="font-semibold text-sm text-foreground mb-3">更多帮助</h2>
          <div className="space-y-2">
            <Link href="/feedback">
              <Card className="p-4 flex items-center justify-between bg-card hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">意见反馈</p>
                    <p className="text-xs text-muted-foreground">提交建议或报告问题</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Card>
            </Link>
            <Link href="/about">
              <Card className="p-4 flex items-center justify-between bg-card hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">使用教程</p>
                    <p className="text-xs text-muted-foreground">图文视频新手指引</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* 底部联系客服 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto">
          <Link href="/agent/customer-service">
            <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
              <MessageCircle className="w-5 h-5" />
              联系在线客服
            </button>
          </Link>
          <p className="text-xs text-muted-foreground text-center mt-2">
            工作时间：每日 9:00-22:00
          </p>
        </div>
      </div>
    </div>
  )
}
