'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, AlertCircle, CheckCircle, Coins, Tag, Clock, Globe, Lock,
  ChevronRight, Flame
} from 'lucide-react'
import { bountyApi } from '@/lib/api'
import { useCoinBalance } from '@/hooks/use-coin-balance'
import { InsufficientBalanceDialog } from '@/components/wallet/insufficient-balance-dialog'

const AMOUNT_PRESETS = [10, 20, 50, 100, 200, 500]
const EXPIRE_OPTIONS = [
  { value: 3, label: '3天', desc: '快速解答' },
  { value: 7, label: '7天', desc: '推荐' },
  { value: 14, label: '14天', desc: '复杂问题' },
  { value: 30, label: '30天', desc: '长期悬赏' },
]
const CATEGORY_OPTIONS = [
  '易经周易', '风水堪舆', '八字命理', '梅花易数', '六爻预测',
  '紫微斗数', '面相手相', '奇门遁甲', '太乙神数', '其他'
]

export default function CreateBountyPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [selectedAmount, setSelectedAmount] = useState(50)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [expireDays, setExpireDays] = useState(7)
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [showPayConfirm, setShowPayConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { balance, isEnough } = useCoinBalance()
  const [showInsufficient, setShowInsufficient] = useState(false)

  const finalAmount = isCustom ? (parseInt(customAmount) || 0) : selectedAmount

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = '请填写悬赏标题'
    else if (title.length < 10) newErrors.title = '标题至少10个字'
    if (!description.trim()) newErrors.description = '请填写问题描述'
    else if (description.length < 20) newErrors.description = '描述至少20个字'
    if (finalAmount < 10) newErrors.amount = '最低悬赏金额为10国学币'
    if (finalAmount > 10000) newErrors.amount = '最高悬赏金额为10000国学币'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setShowPayConfirm(true)
  }

  const handleConfirmPay = async () => {
    // 国学币余额不足时引导充值
    if (!isEnough(finalAmount)) {
      setShowPayConfirm(false)
      setShowInsufficient(true)
      return
    }
    setLoading(true)
    try {
      await bountyApi.create({
        title,
        description,
        content,
        amount: finalAmount,
        category,
        tags,
        expireDays,
      })
      router.push('/bounty')
    } catch {
      // handle error
    } finally {
      setLoading(false)
      setShowPayConfirm(false)
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-base font-semibold text-[#2C2C2C]" style={{ fontFamily: 'Noto Serif SC, serif' }}>
            发布悬赏
          </h1>
          <div className="w-7" />
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-36">
        {/* Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <Flame className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">发布须知</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              悬赏发布后将冻结对应国学币，采纳满意答案后自动结算。若无满意回答，到期后退回钱包。
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-[#2C2C2C] mb-3">
            悬赏标题 <span className="text-[#C41E3A]">*</span>
          </label>
          <input
            className={`w-full text-sm bg-[#FAF8F5] rounded-xl px-3 py-3 outline-none border ${errors.title ? 'border-red-400' : 'border-transparent focus:border-[#C9A96E]'} transition-colors`}
            placeholder="请用一句话概括你的问题（10-50字）"
            value={title}
            maxLength={50}
            onChange={e => {
              setTitle(e.target.value)
              if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
            }}
          />
          <div className="flex justify-between items-center mt-2">
            {errors.title ? (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.title}
              </span>
            ) : <span />}
            <span className="text-xs text-[#999]">{title.length}/50</span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-[#2C2C2C] mb-3">
            问题描述 <span className="text-[#C41E3A]">*</span>
          </label>
          <textarea
            className={`w-full text-sm bg-[#FAF8F5] rounded-xl px-3 py-3 outline-none border resize-none ${errors.description ? 'border-red-400' : 'border-transparent focus:border-[#C9A96E]'} transition-colors`}
            rows={4}
            placeholder="详细描述你的问题，提供更多背景信息有助于获得更好的回答（20-500字）"
            value={description}
            maxLength={500}
            onChange={e => {
              setDescription(e.target.value)
              if (errors.description) setErrors(prev => ({ ...prev, description: '' }))
            }}
          />
          <div className="flex justify-between items-center mt-2">
            {errors.description ? (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.description}
              </span>
            ) : <span />}
            <span className="text-xs text-[#999]">{description.length}/500</span>
          </div>
        </div>

        {/* Supplementary content */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-[#2C2C2C] mb-1">补充说明</label>
          <p className="text-xs text-[#999] mb-3">可提供出生日期、地点等具体信息（选填）</p>
          <textarea
            className="w-full text-sm bg-[#FAF8F5] rounded-xl px-3 py-3 outline-none border border-transparent focus:border-[#C9A96E] transition-colors resize-none"
            rows={3}
            placeholder="补充具体信息..."
            value={content}
            maxLength={500}
            onChange={e => setContent(e.target.value)}
          />
        </div>

        {/* Amount */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-[#2C2C2C] mb-3">
            悬赏金额 <span className="text-[#C41E3A]">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {AMOUNT_PRESETS.map(amount => (
              <button
                key={amount}
                onClick={() => { setSelectedAmount(amount); setIsCustom(false); setErrors(prev => ({ ...prev, amount: '' })) }}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  !isCustom && selectedAmount === amount
                    ? 'bg-[#C41E3A] border-[#C41E3A] text-white'
                    : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#2C2C2C] hover:border-[#C41E3A]'
                }`}
              >
                {amount} 币
              </button>
            ))}
          </div>
          <button
            onClick={() => { setIsCustom(true); setErrors(prev => ({ ...prev, amount: '' })) }}
            className={`w-full py-3 rounded-xl text-sm border transition-all ${
              isCustom
                ? 'bg-[#C41E3A]/5 border-[#C41E3A] text-[#C41E3A]'
                : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#666]'
            }`}
          >
            自定义金额
          </button>
          {isCustom && (
            <div className={`mt-2 flex items-center bg-[#FAF8F5] rounded-xl px-3 py-3 border ${errors.amount ? 'border-red-400' : 'border-transparent focus-within:border-[#C9A96E]'} transition-colors`}>
              <input
                type="number"
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder="请输入国学币数量（10-10000）"
                value={customAmount}
                min={10}
                max={10000}
                onChange={e => setCustomAmount(e.target.value)}
              />
              <span className="text-[#999] text-sm ml-2">国学币</span>
            </div>
          )}
          {errors.amount && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" />{errors.amount}
            </p>
          )}
        </div>

        {/* Expire */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-[#2C2C2C] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C9A96E]" />
            有效期
          </label>
          <div className="grid grid-cols-4 gap-2">
            {EXPIRE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setExpireDays(opt.value)}
                className={`py-3 rounded-xl text-center border transition-all ${
                  expireDays === opt.value
                    ? 'bg-[#C41E3A]/5 border-[#C41E3A] text-[#C41E3A]'
                    : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#2C2C2C]'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-[#999] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Category & Tags */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-[#2C2C2C] mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#C9A96E]" />
            分类标签（选填）
          </label>
          {/* Category */}
          <div className="flex flex-wrap gap-2 mb-3">
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat === category ? '' : cat)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  category === cat
                    ? 'bg-[#C41E3A] border-[#C41E3A] text-white'
                    : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#666]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                  className="px-3 py-1.5 rounded-full text-xs bg-[#C9A96E]/10 text-[#C9A96E] border border-[#C9A96E]/30 cursor-pointer"
                >
                  #{tag} ×
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm bg-[#FAF8F5] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C9A96E] transition-colors"
              placeholder={`添加标签（最多5个，回车确认）`}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              disabled={tags.length >= 5}
            />
            <button
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 5}
              className="px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E3DB] rounded-xl text-sm text-[#666] disabled:opacity-40"
            >
              添加
            </button>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="w-9 h-9 bg-[#FAF8F5] rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#999]" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-[#2C2C2C]">{isPublic ? '公开悬赏' : '定向悬赏'}</p>
                <p className="text-xs text-[#999]">
                  {isPublic ? '所有人均可查看并回答' : '仅特定答主可查看'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-[#C41E3A]' : 'bg-[#E8E3DB]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 pt-3 pb-safe-or-4">
        {/* Summary */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-[#999]">
            悬赏金额将被冻结，采纳后结算
          </span>
          <div className="flex items-center gap-1">
            <Coins className="w-4 h-4 text-[#C9A96E]" />
            <span className="text-base font-bold text-[#C41E3A]">{finalAmount} 国学币</span>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full py-3.5 bg-[#C41E3A] text-white rounded-2xl text-sm font-semibold"
        >
          发布悬赏
        </button>
      </div>

      {/* Pay Confirm Modal */}
      {showPayConfirm && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPayConfirm(false)} />
          <div className="relative w-full bg-white rounded-t-3xl px-6 pt-6 pb-safe-or-8 animate-in slide-in-from-bottom">
            <div className="w-10 h-1 bg-[#E8E3DB] rounded-full mx-auto mb-6" />
            <h3 className="text-center text-lg font-bold text-[#2C2C2C] mb-2" style={{ fontFamily: 'Noto Serif SC, serif' }}>
              确认支付
            </h3>
            <p className="text-center text-sm text-[#999] mb-6">
              支付成功后将发布悬赏，悬赏金额将被冻结
            </p>

            {/* Summary */}
            <div className="bg-[#FAF8F5] rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#999]">悬赏标题</span>
                <span className="text-[#2C2C2C] font-medium text-right max-w-[60%] line-clamp-1">{title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#999]">有效期</span>
                <span className="text-[#2C2C2C]">{expireDays}天</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#999]">可见范围</span>
                <span className="text-[#2C2C2C]">{isPublic ? '公开' : '定向'}</span>
              </div>
              <div className="border-t border-[#E8E3DB] pt-3 flex justify-between">
                <span className="text-sm font-medium text-[#2C2C2C]">悬赏金额</span>
                <span className="text-xl font-bold text-[#C41E3A]">{finalAmount} 国学币</span>
              </div>
            </div>

            <button
              onClick={handleConfirmPay}
              disabled={loading}
              className="w-full py-4 bg-[#C41E3A] text-white rounded-2xl text-sm font-semibold disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  确认支付 {finalAmount} 国学币
                </>
              )}
            </button>
            <button
              onClick={() => setShowPayConfirm(false)}
              className="w-full py-3 text-sm text-[#999] mt-2"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <InsufficientBalanceDialog
        open={showInsufficient}
        onClose={() => setShowInsufficient(false)}
        required={finalAmount}
        balance={balance ?? 0}
      />
    </div>
  )
}
