"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, Upload, AlertCircle, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const existingData = {
  shopName: "墨香阁文化",
  shopType: "企业店铺",
  businessLicense: "已上传",
  legalPerson: "张三",
  idCardFront: "已上传",
  idCardBack: "已上传",
  contactName: "张三",
  contactPhone: "13888888888",
  contactEmail: "zhangsan@example.com",
  categories: ["命理咨询", "古籍图书"],
}

export default function EditApplicationPage() {
  const router = useRouter()
  const [formData, setFormData] = useState(existingData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    router.push("/merchant/application-status")
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link href="/merchant/profile" className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">修改入驻资料</h1>
        </div>
      </header>
      
      {/* 提示信息 */}
      <div className="p-4">
        <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p>修改入驻资料需要重新审核，审核期间店铺正常营业。</p>
              <p className="mt-1">部分敏感信息修改后可能影响店铺信用评级。</p>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="px-4 space-y-4">
        {/* 店铺信息 */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">店铺信息</h2>
            <Badge variant="secondary" className="text-xs">{formData.shopType}</Badge>
          </div>
          
          <div className="space-y-2">
            <Label>店铺名称</Label>
            <Input 
              value={formData.shopName}
              onChange={e => setFormData(prev => ({ ...prev, shopName: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">店铺名称每年只能修改1次</p>
          </div>
        </Card>
        
        {/* 资质材料 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">资质材料</h2>
          
          <div className="space-y-2">
            <Label>营业执照</Label>
            <div className="flex items-center gap-3">
              <div className="w-24 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                <div className="text-center">
                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                  <span className="text-[10px] text-muted-foreground">已上传</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                重新上传
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>法人身份证</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-[3/2] rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                <div className="text-center">
                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                  <span className="text-xs text-muted-foreground">人像面</span>
                </div>
              </div>
              <div className="aspect-[3/2] rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                <div className="text-center">
                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                  <span className="text-xs text-muted-foreground">国徽面</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                重新上传
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>法人姓名</Label>
            <Input 
              value={formData.legalPerson}
              onChange={e => setFormData(prev => ({ ...prev, legalPerson: e.target.value }))}
            />
          </div>
        </Card>
        
        {/* 联系人信息 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">联系人信息</h2>
          
          <div className="space-y-2">
            <Label>联系人姓名</Label>
            <Input 
              value={formData.contactName}
              onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>联系电话</Label>
            <Input 
              value={formData.contactPhone}
              onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>联系邮箱</Label>
            <Input 
              type="email"
              value={formData.contactEmail}
              onChange={e => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
            />
          </div>
        </Card>
        
        {/* 经营类目 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">经营类目</h2>
          <div className="flex flex-wrap gap-2">
            {formData.categories.map(cat => (
              <Badge key={cat} variant="secondary">{cat}</Badge>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full">
            修改经营类目
          </Button>
          <p className="text-xs text-muted-foreground">新增类目可能需要提供额外资质</p>
        </Card>
      </div>
      
      {/* 底部提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          提交修改申请
        </Button>
      </div>
    </div>
  )
}
