"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/common/back-button"
import { Check, Sparkles, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getRechargeOptions, createRechargeOrder } from "@/lib/api/wallet"
import type { RechargeOption } from "@/lib/types/wallet"

// 支付方式
const paymentMethods = [
  { id: "wechat", name: "微信支付", badge: "微", badgeColor: "bg-green-500" },
  { id: "alipay", name: "支付宝", badge: "支", badgeColor: "bg-blue-500" },
  { id: "unionpay", name: "云闪付", badge: "云", badgeColor: "bg-red-500" },
  { id: "huifu", name: "汇付天下", badge: "汇", badgeColor: "bg-orange-500" },
]

export default function RechargePage() {
  const [options, setOptions] = useState<RechargeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("wechat")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载充值档位
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await getRechargeOptions()
        if (res.code === 200 && res.data) {
          setOptions(res.data)
          // 默认选中推荐档位
          const popularOption = res.data.find(o => o.popular)
          if (popularOption) {
            setSelectedOption(popularOption.coins)
          } else if (res.data.length > 0) {
            setSelectedOption(res.data[0].coins)
          }
        }
      } catch (error) {
        console.error('加载充值档位失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadOptions()
  }, [])

  // 计算当前选中的金额
  const getSelectedAmount = () => {
    if (customAmount) {
      return parseInt(customAmount) || 0
    }
    const option = options.find(o => o.coins === selectedOption)
    return option?.price || 0
  }

  // 计算获得的币数
  const getCoins = () => {
    if (customAmount) {
      const amount = parseInt(customAmount) || 0
      return amount * 10
    }
    const option = options.find(o => o.coins === selectedOption)
    return option ? option.coins + option.bonus : 0
  }

  // 处理档位选择
  const handleOptionSelect = (coins: number) => {
    setSelectedOption(coins)
    setCustomAmount("")
  }

  // 处理自定义金额输入
  const handleCustomAmountChange = (value: string) => {
    if (/^\d*$/.test(value)) {
      setCustomAmount(value)
      if (value) {
        setSelectedOption(null)
      }
    }
  }

  // 处理充值提交
  const handleSubmit = async () => {
    const amount = getSelectedAmount()
    if (amount <= 0) return
    
    setIsSubmitting(true)
    try {
      const res = await createRechargeOrder({
        amount,
        paymentMethod: paymentMethod as 'wechat' | 'alipay' | 'unionpay' | 'huifu',
      })
      
      if (res.code === 200 && res.data) {
        // 跳转到支付结果页
        window.location.href = `/payment/result?orderId=${res.data.orderId}&status=success`
      }
    } catch (error) {
      console.error('创建充值订单失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAmount = getSelectedAmount()
  const totalCoins = getCoins()

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <BackButton fallbackPath="/wallet" />
          <h1 className="font-semibold text-base text-foreground">充值国学币</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 说明文字 */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            国学币与人民币比例为 <span className="text-accent font-medium">10:1</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            充值后可用于购买课程、加入圈子、打赏、付费问答等
          </p>
        </div>

        {/* 预设充值档位 */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">选择充值金额</h2>
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <Card key={i} className="p-3 animate-pulse">
                  <div className="h-7 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {options.map((option) => (
                <Card
                  key={option.coins}
                  onClick={() => handleOptionSelect(option.coins)}
                  className={cn(
                    "relative p-3 cursor-pointer transition-all text-center",
                    selectedOption === option.coins
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border hover:border-accent/50"
                  )}
                >
                  {/* 推荐标签 */}
                  {option.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
                      推荐
                    </div>
                  )}
                  
                  {/* 赠送标签 */}
                  {option.bonus > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-accent text-white text-[9px] font-medium rounded-full flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      +{option.bonus}
                    </div>
                  )}

                  {/* 币数 */}
                  <div className={cn(
                    "text-xl font-bold",
                    selectedOption === option.coins ? "text-accent" : "text-foreground"
                  )}>
                    {option.coins + option.bonus}
                    <span className="text-xs font-normal ml-0.5">币</span>
                  </div>

                  {/* 价格 */}
                  <div className="text-sm text-muted-foreground mt-1">
                    ¥{option.price}
                  </div>

                  {/* 选中指示器 */}
                  {selectedOption === option.coins && (
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 自定义金额 */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">自定义金额</h2>
          <Card className={cn(
            "p-4 transition-all",
            customAmount ? "border-accent ring-1 ring-accent" : "border-border"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-foreground">¥</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="输入其他金额（整数）"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="flex-1 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
              {customAmount && (
                <div className="text-sm text-accent">
                  = {parseInt(customAmount) * 10} 币
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              最低充值金额 ¥1，最高单次充值 ¥50000
            </p>
          </Card>
        </div>

        {/* 支付方式 */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">支付方式</h2>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <Card
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "p-4 cursor-pointer transition-all flex items-center justify-between",
                  paymentMethod === method.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold", method.badgeColor)}>{method.badge}</span>
                  <span className="font-medium text-foreground">{method.name}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  paymentMethod === method.id
                    ? "border-accent bg-accent"
                    : "border-muted-foreground/30"
                )}>
                  {paymentMethod === method.id && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 充值说明 */}
        <Card className="p-4 bg-secondary/30 border-border">
          <h3 className="text-sm font-medium text-foreground mb-2">充值说明</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>国学币为平台虚拟货币，仅限在本平台内使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>充值后不支持退款，请确认后再进行充值</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>赠送的国学币有效期为充值后365天</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>如有疑问，请联系客服处理</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          {/* 充值预览 */}
          {selectedAmount > 0 && (
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground">本次充值</span>
              <div className="text-right">
                <span className="text-accent font-bold text-lg">{totalCoins}</span>
                <span className="text-muted-foreground ml-1">国学币</span>
              </div>
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={selectedAmount <= 0 || isSubmitting}
            className={cn(
              "w-full py-3.5 rounded-xl font-medium text-base transition-all flex items-center justify-center gap-2",
              selectedAmount > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                支付中...
              </>
            ) : selectedAmount > 0 ? (
              `确认充值 ¥${selectedAmount}`
            ) : (
              "请选择充值金额"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
