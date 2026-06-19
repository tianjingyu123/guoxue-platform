"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Gift, Link2, Copy, Check, QrCode, Search, 
  User, Clock, Award, Layers, Send, Plus, X, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// 名额数据
const quotaData = {
  total: 6,
  used: 1,      // 自用
  sold: 3,      // 已售
  gifted: 0,    // 已赠送
  available: 2, // 可用
  price: 999,   // 售价
}

// 名额记录
const quotaRecords = [
  { id: 1, type: "self", name: "自用开站", date: "2024-01-01", status: "active" },
  { id: 2, type: "sold", name: "张***", phone: "138****8888", date: "2024-02-15", amount: 999, status: "active" },
  { id: 3, type: "sold", name: "李***", phone: "139****9999", date: "2024-03-20", amount: 999, status: "active" },
  { id: 4, type: "sold", name: "王***", phone: "137****7777", date: "2024-05-10", amount: 999, status: "active" },
]

export default function OperatorQuotaPage() {
  const [activeTab, setActiveTab] = useState("manage")
  const [copied, setCopied] = useState(false)
  const [showGiftDialog, setShowGiftDialog] = useState(false)
  const [giftPhone, setGiftPhone] = useState("")
  const [giftName, setGiftName] = useState("")
  const [searchResult, setSearchResult] = useState<{ name: string; avatar: string; phone: string } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  
  const saleLink = `https://rebu.com/join/station?ref=OP12345&price=${quotaData.price}`
  
  const handleCopy = () => {
    navigator.clipboard.writeText(saleLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleSearch = () => {
    if (!giftPhone || giftPhone.length < 11) return
    setIsSearching(true)
    // 模拟搜索
    setTimeout(() => {
      setSearchResult({
        name: "张三丰",
        avatar: "",
        phone: giftPhone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
      })
      setIsSearching(false)
    }, 1000)
  }
  
  const handleGift = () => {
    // 处理赠送逻辑
    setShowGiftDialog(false)
    setGiftPhone("")
    setSearchResult(null)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-operator text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/operator/dashboard" className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">名额管理</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* 名额概览 */}
      <div className="px-4 mt-4">
        <Card className="p-4 bg-gradient-to-br from-operator to-operator text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Layers className="w-4 h-4" />
              分站名额
            </h3>
            <Badge className="bg-white/20 text-white border-0">
              ¥{quotaData.price}/个
            </Badge>
          </div>
          
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-2 bg-white/10 rounded-lg">
              <p className="text-xl font-bold">{quotaData.total}</p>
              <p className="text-[10px] text-white/70">总名额</p>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <p className="text-xl font-bold">{quotaData.used}</p>
              <p className="text-[10px] text-white/70">自用</p>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <p className="text-xl font-bold text-success">{quotaData.sold}</p>
              <p className="text-[10px] text-white/70">已售</p>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <p className="text-xl font-bold text-gold">{quotaData.gifted}</p>
              <p className="text-[10px] text-white/70">已赠</p>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <p className="text-xl font-bold text-gold">{quotaData.available}</p>
              <p className="text-[10px] text-white/70">可用</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <p className="text-sm">
              已售名额收入：<span className="font-bold text-success">¥{quotaData.sold * quotaData.price}</span>
            </p>
          </div>
        </Card>
      </div>

      {/* 操作区 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3">分配名额</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {/* 分享销售链接 */}
            <button 
              onClick={() => setShowQrDialog(true)}
              className="p-4 bg-gradient-to-br from-success/10 to-success/5 border border-success/30 rounded-xl text-left hover:bg-success/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center mb-2">
                <Link2 className="w-5 h-5 text-success" />
              </div>
              <p className="font-medium text-sm">分享购买链接</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">用户付费¥{quotaData.price}购买</p>
            </button>
            
            {/* 免费赠送 */}
            <button 
              onClick={() => quotaData.available > 0 && setShowGiftDialog(true)}
              className={cn(
                "p-4 border rounded-xl text-left transition-colors",
                quotaData.available > 0 
                  ? "bg-gradient-to-br from-gold/10 to-gold/5 border-gold/30 hover:bg-gold/10"
                  : "bg-muted/50 border-muted cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-2",
                quotaData.available > 0 ? "bg-gold/20" : "bg-muted"
              )}>
                <Gift className={cn("w-5 h-5", quotaData.available > 0 ? "text-gold" : "text-muted-foreground")} />
              </div>
              <p className={cn("font-medium text-sm", quotaData.available === 0 && "text-muted-foreground")}>
                免费赠送
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {quotaData.available > 0 ? `剩余${quotaData.available}个可赠送` : "暂无可用名额"}
              </p>
            </button>
          </div>
        </Card>
      </div>

      {/* Tab切换 */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-10">
            <TabsTrigger value="manage">名额记录</TabsTrigger>
            <TabsTrigger value="rules">使用规则</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 名额记录 */}
      {activeTab === "manage" && (
        <div className="px-4 mt-4 space-y-3">
          {quotaRecords.map(record => (
            <Card key={record.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  record.type === "self" ? "bg-operator/10" : 
                  record.type === "sold" ? "bg-success/10" : "bg-gold/10"
                )}>
                  {record.type === "self" ? (
                    <Award className="w-5 h-5 text-operator" />
                  ) : record.type === "sold" ? (
                    <User className="w-5 h-5 text-success" />
                  ) : (
                    <Gift className="w-5 h-5 text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{record.name}</p>
                    <Badge className={cn(
                      "text-[10px]",
                      record.type === "self" ? "bg-operator/10 text-operator" :
                      record.type === "sold" ? "bg-success/10 text-success" :
                      "bg-gold/10 text-gold"
                    )}>
                      {record.type === "self" ? "自用" : record.type === "sold" ? "已售" : "已赠"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {record.phone && `${record.phone} · `}{record.date}
                  </p>
                </div>
                {record.type === "sold" && record.amount && (
                  <div className="text-right">
                    <p className="font-bold text-success">+¥{record.amount}</p>
                    <p className="text-[10px] text-muted-foreground">收入</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
          
          {quotaData.available > 0 && (
            <Card className="p-4 border-dashed border-2 border-muted text-center text-muted-foreground">
              <p className="text-sm">剩余 {quotaData.available} 个名额待分配</p>
            </Card>
          )}
        </div>
      )}

      {/* 使用规则 */}
      {activeTab === "rules" && (
        <div className="px-4 mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-operator/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-operator">1</span>
                </div>
                <div>
                  <p className="font-medium text-sm">名额来源</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    成为运营商时获赠6个分站名额，其中1个自用，5个可分配给他人
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-success">2</span>
                </div>
                <div>
                  <p className="font-medium text-sm">分享销售</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    分享购买链接，用户支付¥{quotaData.price}后自动开通站长权益，款项100%归您所有
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-gold">3</span>
                </div>
                <div>
                  <p className="font-medium text-sm">免费赠送</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    可选择免费赠送给指定用户，用于团队激励或合作伙伴
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-info">4</span>
                </div>
                <div>
                  <p className="font-medium text-sm">团队奖励</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    通过您分配的名额开通的站长，其产生的入圈分佣，您额外获得5%管理奖励
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>名额一经分配无法收回，请谨慎操作。如需更多名额，可联系平台客服购买。</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 分享链接弹窗 */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>分享购买链接</DialogTitle>
            <DialogDescription>
              用户通过此链接购买后自动成为您团队的站长
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 链接 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-secondary/50 rounded-lg text-xs break-all">
                {saleLink}
              </div>
            </div>
            
            {/* 二维码占位 */}
            <div className="aspect-square max-w-[200px] mx-auto bg-secondary/50 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">购买二维码</p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium">购买价格：<span className="text-primary">¥{quotaData.price}</span></p>
              <p className="text-xs text-muted-foreground mt-1">款项100%归您所有</p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              复制链接
            </Button>
            <Button className="flex-1 bg-operator hover:bg-operator/90">
              <Send className="w-4 h-4 mr-2" />
              分享
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 免费赠送弹窗 */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>免费赠送名额</DialogTitle>
            <DialogDescription>
              输入用户手机号，将站长名额免费赠送给TA
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 搜索用户 */}
            <div>
              <label className="text-sm font-medium mb-2 block">用户手机号</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="请输入手机号"
                  value={giftPhone}
                  onChange={(e) => setGiftPhone(e.target.value)}
                  maxLength={11}
                />
                <Button 
                  variant="outline" 
                  onClick={handleSearch}
                  disabled={isSearching || giftPhone.length < 11}
                >
                  {isSearching ? "搜索中..." : "搜索"}
                </Button>
              </div>
            </div>
            
            {/* 搜索结果 */}
            {searchResult && (
              <div className="p-4 bg-secondary/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{searchResult.name}</p>
                    <p className="text-xs text-muted-foreground">{searchResult.phone}</p>
                  </div>
                  <Badge className="bg-success/10 text-success">已找到</Badge>
                </div>
                
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground mb-1 block">赠送备注（选填）</label>
                  <Input 
                    placeholder="例如：合作伙伴激励"
                    value={giftName}
                    onChange={(e) => setGiftName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>赠送后名额无法收回，对方将立即获得1年站长权益</span>
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowGiftDialog(false)}>
              取消
            </Button>
            <Button 
              className="flex-1 bg-gold hover:bg-gold/90"
              disabled={!searchResult}
              onClick={handleGift}
            >
              <Gift className="w-4 h-4 mr-2" />
              确认赠送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
