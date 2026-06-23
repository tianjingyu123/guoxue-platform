"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Camera, Plus, X, Save, Send, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const categories = [
  { id: "guoxue", name: "国学课程", fee: "5%" },
  { id: "guji", name: "古籍图书", fee: "3%" },
  { id: "wenchuang", name: "文创用品", fee: "5%" },
  { id: "wenfang", name: "文房四宝", fee: "5%" },
  { id: "chadao", name: "茶道用品", fee: "5%" },
  { id: "mingli", name: "命理咨询", fee: "10%" },
  { id: "fengshui", name: "风水服务", fee: "10%" },
  { id: "shufa", name: "书法字画", fee: "8%" },
]

function ProductEditContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get("id")
  const isEdit = !!productId
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    images: [] as string[],
    title: "",
    subtitle: "",
    description: "",
    price: "",
    originalPrice: "",
    stock: "",
    category: "",
    tags: [] as string[],
    isVirtual: false,
    allowRefund: true,
    limitPerPerson: "",
  })
  const [newTag, setNewTag] = useState("")
  
  useEffect(() => {
    if (isEdit) {
      setFormData({
        images: ["1", "2"],
        title: "滴天髓精解",
        subtitle: "命理学经典著作精装版",
        description: "详细描述内容...",
        price: "68",
        originalPrice: "98",
        stock: "156",
        category: "guji",
        tags: ["命理", "八字", "经典"],
        isVirtual: false,
        allowRefund: true,
        limitPerPerson: "",
      })
    }
  }, [isEdit])
  
  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag) && formData.tags.length < 5) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }))
      setNewTag("")
    }
  }
  
  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }
  
  const handleSaveDraft = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }
  
  const handlePublish = async () => {
    if (!formData.title || !formData.price || !formData.stock || !formData.category) {
      alert("请填写必填项")
      return
    }
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    router.push("/merchant/products")
  }

  const selectedCategory = categories.find(c => c.id === formData.category)

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link href="/merchant/products" className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{isEdit ? "编辑商品" : "发布商品"}</h1>
        </div>
      </header>
      
      <div className="p-4 space-y-4">
        {/* 商品图片 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">商品图片</h2>
            <span className="text-xs text-muted-foreground">最多9张，首图为封面</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {formData.images.map((_, index) => (
              <div key={index} className="aspect-square rounded-lg bg-muted relative overflow-hidden border-2 border-dashed border-border">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))} 
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {index === 0 && (
                  <Badge className="absolute bottom-1 left-1 text-[10px]">封面</Badge>
                )}
              </div>
            ))}
            {formData.images.length < 9 && (
              <button 
                onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, String(prev.images.length + 1)] }))}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">添加图片</span>
              </button>
            )}
          </div>
        </Card>
        
        {/* 基本信息 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">基本信息</h2>
          
          <div className="space-y-2">
            <Label>商品名称 <span className="text-destructive">*</span></Label>
            <Input 
              placeholder="请输入商品名称（最多60字）" 
              value={formData.title} 
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} 
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground text-right">{formData.title.length}/60</p>
          </div>
          
          <div className="space-y-2">
            <Label>商品卖点</Label>
            <Input 
              placeholder="简要描述商品特点（最多30字）" 
              value={formData.subtitle} 
              onChange={e => setFormData(prev => ({ ...prev, subtitle: e.target.value }))} 
              maxLength={30}
            />
          </div>
          
          <div className="space-y-2">
            <Label>商品详情</Label>
            <Textarea 
              placeholder="详细描述商品信息、规格、使用方法等" 
              value={formData.description} 
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              rows={5}
            />
          </div>
        </Card>
        
        {/* 价格库存 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">价格库存</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>售价 <span className="text-destructive">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={formData.price} 
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))} 
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>原价（划线价）</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={formData.originalPrice} 
                  onChange={e => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))} 
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>库存 <span className="text-destructive">*</span></Label>
              <Input 
                type="number" 
                placeholder="请输入库存数量" 
                value={formData.stock} 
                onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>限购数量</Label>
              <Input 
                type="number" 
                placeholder="不限制" 
                value={formData.limitPerPerson} 
                onChange={e => setFormData(prev => ({ ...prev, limitPerPerson: e.target.value }))}
              />
            </div>
          </div>
        </Card>
        
        {/* 分类与标签 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">分类与标签</h2>
          
          <div className="space-y-2">
            <Label>商品分类 <span className="text-destructive">*</span></Label>
            <Select value={formData.category} onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="请选择商品分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{cat.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">佣金{cat.fee}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                该分类平台收取 {selectedCategory.fee} 技术服务费
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>商品标签（最多5个）</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="输入标签后回车添加" 
                value={newTag} 
                onChange={e => setNewTag(e.target.value)} 
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} 
                className="flex-1"
              />
              <Button variant="outline" onClick={addTag} disabled={formData.tags.length >= 5}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
        
        {/* 其他设置 */}
        <Card className="p-4 space-y-4">
          <h2 className="font-medium">其他设置</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>虚拟商品</Label>
              <p className="text-xs text-muted-foreground mt-0.5">虚拟商品无需发货</p>
            </div>
            <Switch 
              checked={formData.isVirtual}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, isVirtual: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>支持退款</Label>
              <p className="text-xs text-muted-foreground mt-0.5">买家可申请退款退货</p>
            </div>
            <Switch 
              checked={formData.allowRefund}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, allowRefund: checked }))}
            />
          </div>
        </Card>
      </div>
      
      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handleSaveDraft} 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            保存草稿
          </Button>
          <Button 
            className="flex-1" 
            onClick={handlePublish} 
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {isEdit ? "保存修改" : "立即发布"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProductEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ProductEditContent />
    </Suspense>
  )
}
