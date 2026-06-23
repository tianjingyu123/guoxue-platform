'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, CreditCard, Star, Trash2, MoreVertical, X, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataState } from '@/components/data-state'
import { getBankCards, addBankCard, deleteBankCard, setDefaultBankCard, sendBankCardVerifyCode } from '@/lib/api/bank-cards'
import { SUPPORTED_BANKS } from '@/lib/types/bank-cards'
import type { BankCard } from '@/lib/types/bank-cards'

export default function BankCardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<BankCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 添加银行卡表单
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [formData, setFormData] = useState({
    cardNumber: '',
    holderName: '',
    bankCode: '',
    idCard: '',
    phone: '',
    verifyCode: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  // 删除确认
  const [deleteCard, setDeleteCard] = useState<BankCard | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 加载银行卡列表
  const loadCards = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getBankCards()
      if (res.code === 200) {
        setCards(res.data.list)
      } else {
        setError(res.message)
      }
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCards()
  }, [])

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 发送验证码
  const handleSendCode = async () => {
    if (!formData.phone || countdown > 0) return
    
    const res = await sendBankCardVerifyCode(formData.phone)
    if (res.code === 200) {
      setCountdown(60)
    }
  }

  // 格式化卡号输入
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const groups = numbers.match(/.{1,4}/g) || []
    return groups.join(' ').substring(0, 23)
  }

  // 添加银行卡
  const handleAddCard = async () => {
    if (!formData.cardNumber || !formData.holderName || !formData.bankCode || 
        !formData.idCard || !formData.phone || !formData.verifyCode) {
      return
    }

    setSubmitting(true)
    try {
      const res = await addBankCard({
        ...formData,
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
      })
      if (res.code === 200) {
        setCards([...cards, res.data])
        setShowAddSheet(false)
        setFormData({ cardNumber: '', holderName: '', bankCode: '', idCard: '', phone: '', verifyCode: '' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // 删除银行卡
  const handleDelete = async () => {
    if (!deleteCard) return
    
    setDeleting(true)
    try {
      const res = await deleteBankCard(deleteCard.id)
      if (res.code === 200) {
        setCards(cards.filter(c => c.id !== deleteCard.id))
        setDeleteCard(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  // 设为默认
  const handleSetDefault = async (cardId: number) => {
    const res = await setDefaultBankCard(cardId)
    if (res.code === 200) {
      setCards(cards.map(c => ({ ...c, isDefault: c.id === cardId })))
    }
  }

  // 获取银行主题色
  const getBankColor = (bankCode: string) => {
    const bank = SUPPORTED_BANKS.find(b => b.code === bankCode)
    return bank?.color || '#C41E3A'
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-[#8B4513]" />
          </button>
          <h1 className="text-lg font-semibold text-[#8B4513]">银行卡管理</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 space-y-4">
        <DataState
          loading={loading}
          error={error}
          empty={cards.length === 0}
          emptyMessage="暂未绑定银行卡"
          emptyIcon={<CreditCard className="w-12 h-12 text-[#C9A96E]/50" />}
          skeleton={
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
              ))}
            </div>
          }
        >
          {/* 银行卡列表 */}
          <div className="space-y-4">
            {cards.map(card => (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-xl shadow-sm"
                style={{ background: `linear-gradient(135deg, ${getBankColor(card.bank.code)} 0%, ${getBankColor(card.bank.code)}cc 100%)` }}
              >
                {/* 装饰图案 */}
                <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/10 -mr-10 -mt-10" />
                <div className="absolute right-8 bottom-0 w-20 h-20 rounded-full bg-white/5 -mb-8" />
                
                <div className="relative p-4">
                  {/* 银行信息 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{card.bank.name}</div>
                        <div className="text-white/70 text-xs">{card.cardType === 'debit' ? '储蓄卡' : '信用卡'}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {card.isDefault && (
                        <span className="px-2 py-0.5 bg-[#C9A96E] text-white text-xs rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          默认
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-white/10 rounded">
                            <MoreVertical className="w-4 h-4 text-white/80" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!card.isDefault && (
                            <DropdownMenuItem onClick={() => handleSetDefault(card.id)}>
                              <Star className="w-4 h-4 mr-2" />
                              设为默认
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-500"
                            onClick={() => setDeleteCard(card)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            解除绑定
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* 卡号 */}
                  <div className="text-white text-xl tracking-widest font-mono">
                    {card.cardNumber}
                  </div>

                  {/* 持卡人 */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-white/70 text-sm">{card.holderName}</div>
                    <div className="text-white/50 text-xs">绑定于 {card.bindTime}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataState>

        {/* 添加银行卡按钮 */}
        <button
          onClick={() => setShowAddSheet(true)}
          className="w-full py-4 border-2 border-dashed border-[#C9A96E]/30 rounded-xl flex items-center justify-center gap-2 text-[#C9A96E] hover:border-[#C9A96E]/50 hover:bg-[#C9A96E]/5 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>添加银行卡</span>
        </button>

        {/* 提示信息 */}
        <div className="text-center text-xs text-[#8B4513]/60 py-2">
          为保障资金安全，请绑定本人实名银行卡
        </div>
      </div>

      {/* 添加银行卡弹窗 */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-[#FAF8F5]">
          <SheetHeader className="border-b border-[#C9A96E]/20 pb-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setShowAddSheet(false)} className="p-2 -ml-2">
                <X className="w-5 h-5 text-[#8B4513]" />
              </button>
              <SheetTitle className="text-[#8B4513]">添加银行卡</SheetTitle>
              <div className="w-9" />
            </div>
          </SheetHeader>

          <div className="py-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
            {/* 银行卡号 */}
            <div className="space-y-2">
              <Label className="text-[#8B4513]">银行卡号</Label>
              <Input
                placeholder="请输入银行卡号"
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })}
                className="bg-white border-[#C9A96E]/30 focus:border-[#C9A96E] text-lg tracking-wider"
                maxLength={23}
              />
            </div>

            {/* 开户银行 */}
            <div className="space-y-2">
              <Label className="text-[#8B4513]">开户银行</Label>
              <Select value={formData.bankCode} onValueChange={(value) => setFormData({ ...formData, bankCode: value })}>
                <SelectTrigger className="bg-white border-[#C9A96E]/30 focus:border-[#C9A96E]">
                  <SelectValue placeholder="请选择开户银行" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_BANKS.map(bank => (
                    <SelectItem key={bank.code} value={bank.code}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" style={{ color: bank.color }} />
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 持卡人姓名 */}
            <div className="space-y-2">
              <Label className="text-[#8B4513]">持卡人姓名</Label>
              <Input
                placeholder="请输入持卡人姓名"
                value={formData.holderName}
                onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                className="bg-white border-[#C9A96E]/30 focus:border-[#C9A96E]"
              />
            </div>

            {/* 身份证号 */}
            <div className="space-y-2">
              <Label className="text-[#8B4513]">身份证号</Label>
              <Input
                placeholder="请输入身份证号"
                value={formData.idCard}
                onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                className="bg-white border-[#C9A96E]/30 focus:border-[#C9A96E]"
                maxLength={18}
              />
            </div>

            {/* 预留手机号 */}
            <div className="space-y-2">
              <Label className="text-[#8B4513]">预留手机号</Label>
              <Input
                placeholder="请输入银行预留手机号"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                className="bg-white border-[#C9A96E]/30 focus:border-[#C9A96E]"
                maxLength={11}
              />
            </div>

            {/* 验证码 */}
            <div className="space-y-2">
              <Label className="text-[#8B4513]">验证码</Label>
              <div className="flex gap-3">
                <Input
                  placeholder="请输入验证码"
                  value={formData.verifyCode}
                  onChange={(e) => setFormData({ ...formData, verifyCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="flex-1 bg-white border-[#C9A96E]/30 focus:border-[#C9A96E]"
                  maxLength={6}
                />
                <Button
                  variant="outline"
                  className="w-28 border-[#C9A96E] text-[#C9A96E] shrink-0"
                  disabled={!formData.phone || formData.phone.length !== 11 || countdown > 0}
                  onClick={handleSendCode}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </div>
            </div>

            {/* 安全提示 */}
            <div className="bg-[#C9A96E]/10 rounded-lg p-3 text-xs text-[#8B4513]/70">
              <p>为保障您的资金安全，请确保：</p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>银行卡为本人实名认证的储蓄卡</li>
                <li>手机号为银行预留手机号</li>
                <li>身份信息与银行开户信息一致</li>
              </ul>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#FAF8F5] border-t border-[#C9A96E]/20">
            <Button
              className="w-full bg-[#C41E3A] hover:bg-[#A01830] text-white h-12 text-base"
              disabled={!formData.cardNumber || !formData.holderName || !formData.bankCode || 
                       !formData.idCard || !formData.phone || !formData.verifyCode || submitting}
              onClick={handleAddCard}
            >
              {submitting ? '绑定中...' : '确认绑定'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteCard} onOpenChange={() => setDeleteCard(null)}>
        <AlertDialogContent className="bg-[#FAF8F5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#8B4513]">解除绑定</AlertDialogTitle>
            <AlertDialogDescription>
              确定要解除绑定 {deleteCard?.bank.name}（尾号 {deleteCard?.cardNumberLast4}）吗？解除后将无法使用该卡进行提现。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#C9A96E]/30">取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C41E3A] hover:bg-[#A01830]"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '解除中...' : '确认解除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
