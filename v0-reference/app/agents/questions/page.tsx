'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FAQ {
  id: string
  category: string
  question: string
  answer: string
}

const faqs: FAQ[] = [
  { id: '1', category: '使用说明', question: 'AI 助手的回答准确吗？', answer: '我们的 AI 助手基于大量命理学经典文献训练，能够提供专业的命理分析。但命理学本身具有一定的参考性，建议您结合自身实际情况综合判断，不宜过度依赖。' },
  { id: '2', category: '使用说明', question: '如何获得更准确的分析？', answer: '提供尽可能详细的信息，包括准确的出生年月日时（农历/公历）、出生地点等。信息越详细，分析结果越精准。' },
  { id: '3', category: '使用说明', question: '每次对话的内容会保存吗？', answer: '是的，您的所有对话记录都会保存在「对话历史」中，您可以随时查看历史记录。如需删除，可在历史页面中单独删除或一键清空。' },
  { id: '4', category: '收费说明', question: 'AI 助手是免费的吗？', answer: '基础功能提供一定数量的免费对话额度。VIP 会员可享受不限次数的对话，以及更高级的分析功能。开通 VIP 请前往「会员中心」。' },
  { id: '5', category: '收费说明', question: '免费额度用完后怎么办？', answer: '免费额度用完后可以选择：①开通 VIP 会员获得无限对话；②单次购买对话包；③等待每日免费额度自动恢复（每天凌晨重置）。' },
  { id: '6', category: '隐私安全', question: '我的八字信息安全吗？', answer: '我们严格遵守《个人信息保护法》，您的八字等个人信息仅用于本平台的命理分析，不会泄露给第三方。您可以在隐私设置中管理您的数据。' },
  { id: '7', category: '功能介绍', question: 'AI 助手能做什么分析？', answer: '当前支持：八字命局分析、流年运势、大运走势、婚姻感情、事业财运、紫微斗数解读、奇门遁甲起局、风水布局建议等。' },
  { id: '8', category: '功能介绍', question: '可以和专家对话吗？', answer: '是的！除了 AI 助手，您还可以在「专家咨询」页面预约真人专家进行一对一咨询，享受更个性化的服务。' },
]

const CATEGORIES = [...new Set(faqs.map(f => f.category))]

export default function AgentsQuestionsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('全部')

  const filtered = faqs.filter(f => {
    const matchCategory = activeCategory === '全部' || f.category === activeCategory
    const matchSearch = !search || f.question.includes(search) || f.answer.includes(search)
    return matchCategory && matchSearch
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">常见问题</h1>
      </header>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索问题" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {['全部', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeCategory === cat ? 'bg-primary text-white' : 'bg-muted text-foreground')}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <HelpCircle className="w-10 h-10 opacity-30 mb-3" />
            <p className="text-sm">未找到相关问题</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(faq => (
              <div key={faq.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <HelpCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-foreground">{faq.question}</span>
                  </div>
                  {openId === faq.id
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {openId === faq.id && (
                  <div className="px-4 pb-4 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed pt-3">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
