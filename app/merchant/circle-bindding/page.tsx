'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronRight, Search, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Mock data - 可用圈子列表
const mockCircles = [
  { id: '1', name: '八字算命爱好者', category: '算命', members: 1250, bound: false },
  { id: '2', name: '紫微斗数研究', category: '占卜', members: 980, bound: true },
  { id: '3', name: '道教文化传承', category: '道教', members: 650, bound: false },
  { id: '4', name: '中医养生圈', category: '健康', members: 2100, bound: false },
  { id: '5', name: '古籍收藏交流', category: '文化', members: 380, bound: false },
  { id: '6', name: '国学经典讨论', category: '国学', members: 1520, bound: false },
]

export default function CircleBindingPage() {
  const router = useRouter()
  const [circles, setCircles] = useState(mockCircles)
  const [searchText, setSearchText] = useState('')
  const [selectedCircles, setSelectedCircles] = useState<string[]>(
    mockCircles.filter(c => c.bound).map(c => c.id)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredCircles = circles.filter(circle =>
    circle.name.toLowerCase().includes(searchText.toLowerCase()) ||
    circle.category.toLowerCase().includes(searchText.toLowerCase())
  )

  const handleToggleCircle = (id: string) => {
    setSelectedCircles(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Mock submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    // Show success toast
    router.push('/merchant/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">绑定圈子</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-24">
        {/* 说明 */}
        <div className="mx-4 mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <h3 className="font-semibold text-foreground mb-1">圈子绑定说明</h3>
          <p className="text-sm text-muted-foreground">
            绑定圈子后，您可以在该圈子中发布内容、与圈主进行合作。请选择您希望合作的圈子。
          </p>
        </div>

        {/* 搜索 */}
        <div className="mx-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索圈子名称或分类"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 圈子列表 */}
        <div className="mx-4 mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            可绑定圈子 ({filteredCircles.length})
          </h2>
          <div className="space-y-2">
            {filteredCircles.map(circle => (
              <button
                key={circle.id}
                onClick={() => handleToggleCircle(circle.id)}
                className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
                  selectedCircles.includes(circle.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedCircles.includes(circle.id)
                      ? 'bg-primary text-white'
                      : 'bg-muted'
                  }`}>
                    {selectedCircles.includes(circle.id) ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Users className="w-6 h-6 text-foreground/60" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{circle.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                        {circle.category}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {circle.members} 人
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-foreground/40 transition-transform ${
                  selectedCircles.includes(circle.id) ? 'text-primary' : ''
                }`} />
              </button>
            ))}
          </div>

          {filteredCircles.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">未找到匹配的圈子</div>
            </Card>
          )}
        </div>

        {/* 统计 */}
        {selectedCircles.length > 0 && (
          <div className="mx-4 mt-6 p-4 bg-muted/50 rounded-xl">
            <div className="text-sm text-muted-foreground mb-2">
              已选择 {selectedCircles.length} 个圈子
            </div>
            <div className="space-y-1">
              {circles
                .filter(c => selectedCircles.includes(c.id))
                .map(c => (
                  <div key={c.id} className="text-sm text-foreground">
                    • {c.name}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            返回
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCircles.length === 0}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? '提交中...' : '确认绑定'}
          </Button>
        </div>
      </div>
    </div>
  )
}
