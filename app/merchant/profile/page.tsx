"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Camera, Store, Phone, MapPin, Clock, ChevronRight, Save, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const shopData = {
  logo: "",
  name: "墨香阁文化",
  slogan: "传承国学经典，弘扬传统文化",
  description: "墨香阁专注于国学文化传播，提供命理、风水、书法等传统文化产品和服务。我们致力于让更多人了解和热爱中华优秀传统文化。",
  phone: "400-888-8888",
  address: "北京市朝阳区建国路88号",
  businessHours: "09:00-21:00",
  isOpen: true,
  autoReply: true,
  autoReplyContent: "您好，欢迎光临墨香阁！有什么可以帮您的吗？",
}

export default function ProfilePage() {
  const [formData, setFormData] = useState(shopData)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSaving(false)
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/merchant/dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">店铺设置</h1>
          </div>
          <Link href="/merchant/shop-preview">
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              预览
            </Button>
          </Link>
        </div>
      </header>
      
      <div className="p-4 space-y-4">
        {/* 店铺Logo */}
        <Card className="p-4">
          <h2 className="font-medium mb-4">店铺形象</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                <Store className="w-10 h-10 text-muted-foreground" />
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">店铺Logo</p>
              <p className="text-xs text-muted-foreground mt-1">建议尺寸200x200px，支持JPG、PNG格式</p>
            </div>
          </div>
        </Card>
        
        {/* 基本信息 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">基本信息</h2>
          
          <div className="space-y-2">
            <Label>店铺名称</Label>
            <Input 
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="请输入店铺名称"
              maxLength={20}
            />
          </div>
          
          <div className="space-y-2">
            <Label>店铺口号</Label>
            <Input 
              value={formData.slogan}
              onChange={e => setFormData(prev => ({ ...prev, slogan: e.target.value }))}
              placeholder="一句话介绍您的店铺"
              maxLength={30}
            />
          </div>
          
          <div className="space-y-2">
            <Label>店铺简介</Label>
            <Textarea 
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="详细介绍您的店铺"
              rows={4}
            />
          </div>
        </Card>
        
        {/* 联系方式 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">联系方式</h2>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              联系电话
            </Label>
            <Input 
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="请输入联系电话"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              店铺地址
            </Label>
            <Input 
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="请输入店铺地址（选填）"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              营业时间
            </Label>
            <Input 
              value={formData.businessHours}
              onChange={e => setFormData(prev => ({ ...prev, businessHours: e.target.value }))}
              placeholder="例如: 09:00-21:00"
            />
          </div>
        </Card>
        
        {/* 营业设置 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">营业设置</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>店铺营业状态</Label>
              <p className="text-xs text-muted-foreground mt-0.5">关闭后买家将无法下单</p>
            </div>
            <Switch 
              checked={formData.isOpen}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, isOpen: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>自动回复</Label>
              <p className="text-xs text-muted-foreground mt-0.5">买家首次咨询时自动回复</p>
            </div>
            <Switch 
              checked={formData.autoReply}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, autoReply: checked }))}
            />
          </div>
          
          {formData.autoReply && (
            <div className="space-y-2">
              <Label>自动回复内容</Label>
              <Textarea 
                value={formData.autoReplyContent}
                onChange={e => setFormData(prev => ({ ...prev, autoReplyContent: e.target.value }))}
                placeholder="请输入自动回复内容"
                rows={3}
              />
            </div>
          )}
        </Card>
        
        {/* 其他设置 */}
        <Card className="p-4">
          <Link href="/merchant/edit-application" className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">修改入驻资料</p>
              <p className="text-xs text-muted-foreground mt-0.5">修改营业执照、法人信息等</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </Card>
      </div>
      
      {/* 底部保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存修改
        </Button>
      </div>
    </div>
  )
}
