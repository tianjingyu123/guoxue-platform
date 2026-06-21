"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Camera, Check, ChevronRight, X, Plus, ImageIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 预置标签库
const tagCategories = [
  { name: "命理术数", tags: ["八字命理", "紫微斗数", "六爻占卜", "奇门遁甲", "梅花易数"] },
  { name: "风水堪舆", tags: ["阳宅风水", "阴宅风水", "办公风水", "商业风水", "家居布局"] },
  { name: "姓名学", tags: ["起名改名", "公司取名", "姓名分析", "数理五格"] },
  { name: "中医养生", tags: ["中医基础", "经络养生", "食疗养生", "气功导引"] },
  { name: "传统文化", tags: ["道家文化", "儒家经典", "佛学智慧", "诗词歌赋", "书法绘画"] },
]

// 省市区数据（简化）
const provinces = ["北京市", "上海市", "广东省", "浙江省", "江苏省", "四川省", "湖北省", "湖南省"]
const cities: Record<string, string[]> = {
  "北京市": ["东城区", "西城区", "朝阳区", "海淀区", "丰台区"],
  "上海市": ["黄浦区", "徐汇区", "长宁区", "静安区", "浦东新区"],
  "广东省": ["广州市", "深圳市", "东莞市", "佛山市", "珠海市"],
  "浙江省": ["杭州市", "宁波市", "温州市", "嘉兴市", "湖州市"],
}

export default function ProfileEditPage() {
  const [formData, setFormData] = useState({
    avatar: "",
    nickname: "易学爱好者",
    bio: "探索命理奥秘，传承国学智慧",
    gender: "male" as "male" | "female" | "unknown",
    birthday: "1990-01-01",
    province: "广东省",
    city: "深圳市",
    tags: ["八字命理", "紫微斗数"],
  })
  
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showGenderPicker, setShowGenderPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTagToggle = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
    } else if (formData.tags.length < 5) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    }
  }

  const genderOptions = [
    { value: "male", label: "男" },
    { value: "female", label: "女" },
    { value: "unknown", label: "未设置" },
  ]

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">编辑资料</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-all",
              saved 
                ? "bg-green-500/20 text-green-500" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isSaving ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              </span>
            ) : saved ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" /> 已保存
              </span>
            ) : "保存"}
          </button>
        </div>
      </header>

      {/* 头像编辑区 */}
      <div className="flex flex-col items-center py-8 bg-gradient-to-b from-secondary/50 to-background">
        <div className="relative">
          <Avatar className="w-24 h-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={formData.avatar} alt={formData.nickname} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {formData.nickname[0]}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setShowAvatarMenu(true)}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
          >
            <Camera className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">点击更换头像</p>
      </div>

      {/* 表单区 */}
      <div className="px-4 space-y-4">
        {/* 昵称 */}
        <Card className="p-4">
          <label className="text-xs text-muted-foreground mb-2 block">昵称</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value.slice(0, 20) }))}
              placeholder="请输入昵称"
              className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50"
              maxLength={20}
            />
            <span className="text-xs text-muted-foreground">{formData.nickname.length}/20</span>
          </div>
        </Card>

        {/* 简介 */}
        <Card className="p-4">
          <label className="text-xs text-muted-foreground mb-2 block">简介</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 100) }))}
            placeholder="介绍一下自己吧"
            rows={3}
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50 resize-none"
            maxLength={100}
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">{formData.bio.length}/100</span>
          </div>
        </Card>

        {/* 性别 */}
        <Card 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setShowGenderPicker(true)}
        >
          <span className="text-sm text-foreground">性别</span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">
              {formData.gender === "male" ? "男" : formData.gender === "female" ? "女" : "未设置"}
            </span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Card>

        {/* 生日 */}
        <Card 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setShowDatePicker(true)}
        >
          <span className="text-sm text-foreground">生日</span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">{formData.birthday || "未设置"}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Card>

        {/* 所在地 */}
        <Card 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setShowLocationPicker(true)}
        >
          <span className="text-sm text-foreground">所在地</span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">
              {formData.province && formData.city ? `${formData.province} ${formData.city}` : "未设置"}
            </span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Card>

        {/* 标签管理 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-foreground">兴趣标签</label>
            <span className="text-xs text-muted-foreground">{formData.tags.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="pl-2.5 pr-1.5 py-1 bg-primary/10 text-primary border-0 flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {formData.tags.length < 5 && (
              <button
                onClick={() => setShowTagPicker(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-3 h-3" /> 添加标签
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* 头像选择菜单 */}
      {showAvatarMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowAvatarMenu(false)}>
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 space-y-2">
              <button className="w-full py-4 text-center text-foreground hover:bg-secondary rounded-xl transition-colors">
                拍照
              </button>
              <button className="w-full py-4 text-center text-foreground hover:bg-secondary rounded-xl transition-colors">
                从相册选择
              </button>
              <button className="w-full py-4 text-center text-foreground hover:bg-secondary rounded-xl transition-colors">
                查看大图
              </button>
            </div>
            <div className="border-t border-border">
              <button 
                onClick={() => setShowAvatarMenu(false)}
                className="w-full py-4 text-center text-muted-foreground hover:bg-secondary transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 性别选择器 */}
      {showGenderPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowGenderPicker(false)}>
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <h3 className="text-center font-medium text-foreground">选择性别</h3>
            </div>
            <div className="p-4 space-y-2">
              {genderOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, gender: option.value as any }))
                    setShowGenderPicker(false)
                  }}
                  className={cn(
                    "w-full py-4 text-center rounded-xl transition-colors flex items-center justify-center gap-2",
                    formData.gender === option.value 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {option.label}
                  {formData.gender === option.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <div className="border-t border-border">
              <button 
                onClick={() => setShowGenderPicker(false)}
                className="w-full py-4 text-center text-muted-foreground hover:bg-secondary transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日期选择器 */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowDatePicker(false)}>
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setShowDatePicker(false)} className="text-muted-foreground">取消</button>
              <h3 className="font-medium text-foreground">选择生日</h3>
              <button 
                onClick={() => setShowDatePicker(false)} 
                className="text-primary font-medium"
              >
                确定
              </button>
            </div>
            <div className="p-4">
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                className="w-full p-4 bg-secondary rounded-xl text-foreground text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* 地区选择器 */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowLocationPicker(false)}>
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setShowLocationPicker(false)} className="text-muted-foreground">取消</button>
              <h3 className="font-medium text-foreground">选择所在地</h3>
              <button 
                onClick={() => setShowLocationPicker(false)} 
                className="text-primary font-medium"
              >
                确定
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">省份</label>
                <div className="h-48 overflow-y-auto space-y-1">
                  {provinces.map(province => (
                    <button
                      key={province}
                      onClick={() => setFormData(prev => ({ ...prev, province, city: "" }))}
                      className={cn(
                        "w-full py-2 px-3 text-left text-sm rounded-lg transition-colors",
                        formData.province === province 
                          ? "bg-primary/10 text-primary" 
                          : "text-foreground hover:bg-secondary"
                      )}
                    >
                      {province}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">城市</label>
                <div className="h-48 overflow-y-auto space-y-1">
                  {(cities[formData.province] || []).map(city => (
                    <button
                      key={city}
                      onClick={() => setFormData(prev => ({ ...prev, city }))}
                      className={cn(
                        "w-full py-2 px-3 text-left text-sm rounded-lg transition-colors",
                        formData.city === city 
                          ? "bg-primary/10 text-primary" 
                          : "text-foreground hover:bg-secondary"
                      )}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 标签选择器 */}
      {showTagPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowTagPicker(false)}>
          <div 
            className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[70vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <button onClick={() => setShowTagPicker(false)} className="text-muted-foreground">取消</button>
              <h3 className="font-medium text-foreground">选择标签 ({formData.tags.length}/5)</h3>
              <button 
                onClick={() => setShowTagPicker(false)} 
                className="text-primary font-medium"
              >
                完成
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {tagCategories.map(category => (
                <div key={category.name} className="mb-6">
                  <h4 className="text-sm font-medium text-foreground mb-3">{category.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        disabled={!formData.tags.includes(tag) && formData.tags.length >= 5}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-colors",
                          formData.tags.includes(tag)
                            ? "bg-primary text-primary-foreground"
                            : formData.tags.length >= 5
                              ? "bg-secondary text-muted-foreground/50 cursor-not-allowed"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
