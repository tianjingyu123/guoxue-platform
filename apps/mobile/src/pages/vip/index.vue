<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">会员</text>
      <text class="v0-route">V0: vip</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-accent/20 via-accent/10 to-transparent pointer-events-none" />
          
          <!--   -->
          <view class="sticky top-0 z-40 bg-transparent safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-lg text-foreground">会员中心</text>
              <Link href="/vip/records" class="text-sm text-primary">
                购买记录
              </Link>
            </view>
          </view>
    
          <DataState
            loading={{ loading }}
            error={{ error }}
            empty={{ !data }}
            skeleton={{ renderSkeleton() }}
            onRetry={{ loadData }}
          >
            {data && (
              <view class="relative z-10 px-4 space-y-6">
                <!--   -->
                <Card class="p-6 bg-gradient-to-br from-accent via-accent/90 to-primary/80 border-0 shadow-xl shadow-accent/20 overflow-hidden relative">
                  <!--   -->
                  <view class="absolute -right-10 -top-10 w-40 h-40 opacity-10">
                    <svg viewBox="0 0 100 100" class="w-full h-full fill-current text-white">
                      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" />
                    </svg>
                  </view>
                  
                  <view class="relative">
                    <view class="flex items-center gap-3 mb-4">
                      <view class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                        <Crown class="w-8 h-8 text-white" />
                      </view>
                      <view class="flex-1">
                        <view class="flex items-center gap-2">
                          <text class="text-xl font-bold text-white">
                            {data.status.level !== 'none' ? data.status.levelName : '热卜国学VIP'}
                          </text>
                          {data.status.level !== 'none' && (
                            <Badge class="bg-white/20 text-white border-0">
                              {{ data.status.level.toUpperCase() }}
                            </Badge>
                          )}
                        </view>
                        <text class="text-sm text-white/70">
                          {data.status.level !== 'none' 
                            ? (data.status.isExpired 
                                ? '会员已过期' 
                                : `有效期至 ${{ data.status.expireAt }}，还剩 ${{ data.status.daysLeft }} 天`)
                            : '解锁全部特权，畅享国学智慧'}
                        </text>
                      </view>
                    </view>
                    
                    <!--   -->
                    <view class="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                      <view class="text-center">
                        <text class="text-2xl font-bold text-white">500+</text>
                        <text class="text-xs text-white/70">免费课程</text>
                      </view>
                      <view class="text-center">
                        <text class="text-2xl font-bold text-white">无限</text>
                        <text class="text-xs text-white/70">AI对话</text>
                      </view>
                      <view class="text-center">
                        <text class="text-2xl font-bold text-white">{{ data.status.points }}</text>
                        <text class="text-xs text-white/70">会员积分</text>
                      </view>
                    </view>
    
                    <!--   -->
                    {data.status.level !== 'none' && (
                      <view class="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                        <text class="text-sm text-white/80">自动续费</text>
                        <Switch
                          :checked={{ data.status.autoRenew }}
                          onCheckedChange={{ handleToggleAutoRenew }}
                          :disabled={{ autoRenewLoading }}
                          class="data-[state=checked]:bg-white/30"
                        />
                      </view>
                    )}
                  </view>
                </Card>
    
                <!--   -->
                <view>
                  <text class="font-semibold text-base text-foreground mb-3">选择等级</text>
                  <view class="flex gap-2 overflow-x-auto pb-2">
                    {data.planGroups.map(group => (
                      <Button
                        key={group.level}
                        variant={selectedLevel === group.level ? 'default' : 'outline'}
                        class={cn(
                          'flex-shrink-0',
                          selectedLevel === group.level && levelColors[group.level]
                        )}
                        @click={() => handleSelectLevel(group.level)}
                      >
                        {{ group.levelName }}
                      </Button>
                    ))}
                  </view>
                  {currentPlanGroup && (
                    <text class="text-sm text-muted-foreground mt-2">{{ currentPlanGroup.description }}</text>
                  )}
                </view>
    
                <!--   -->
                <view>
                  <text class="font-semibold text-base text-foreground mb-3">选择套餐</text>
                  <view class="grid grid-cols-3 gap-3">
                    {currentPlanGroup?.plans.map(plan => (
                      <Card
                        key={plan.id}
                        @click={() => handleSelectPlan(plan)}
                        class={cn(
                          'p-3 cursor-pointer transition-all relative overflow-hidden',
                          selectedPlan?.id === plan.id
                            ? 'border-2 border-accent bg-accent/5'
                            : 'border-border hover:border-accent/50'
                        )}
                      >
                        <!--   -->
                        {plan.popular && (
                          <view class="absolute top-0 right-0 px-2 py-0.5 text-[10px] font-medium rounded-bl-lg bg-accent text-accent-foreground">
                            推荐
                          </view>
                        )}
                        {plan.discount && !plan.popular && (
                          <view class="absolute top-0 right-0 px-2 py-0.5 text-[10px] font-medium rounded-bl-lg bg-destructive text-destructive-foreground">
                            {{ plan.discount }}
                          </view>
                        )}
                        
                        <text class="font-medium text-sm text-foreground text-center">{{ plan.durationName }}</text>
                        <view class="flex items-baseline justify-center gap-0.5 mt-2">
                          <text class="text-xs text-muted-foreground">¥</text>
                          <text class="text-2xl font-bold text-primary">{{ plan.price }}</text>
                        </view>
                        {plan.originalPrice > plan.price && (
                          <text class="text-xs text-muted-foreground line-through text-center mt-1">
                            ¥{{ plan.originalPrice }}
                          </text>
                        )}
                        <text class="text-xs text-accent text-center mt-1">
                          ¥{{ plan.dailyPrice }}/天
                        </text>
                        
                        <!--   -->
                        {selectedPlan?.id === plan.id && (
                          <view class="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                            <Check class="w-3 h-3 text-accent-foreground" />
                          </view>
                        )}
                      </Card>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="font-semibold text-base text-foreground mb-3">会员专属权益</text>
                  <view class="grid grid-cols-2 gap-3">
                    {data.benefits.map((benefit) => {
                      const Icon = benefitIcons[benefit.icon] || Gift
                      const available = benefit.levels.includes(selectedLevel)
                      return (
                        <Card
                          key={benefit.id}
                          class={cn(
                            'p-3',
                            available ? 'bg-accent/5 border-accent/30' : 'opacity-50'
                          )}
                        >
                          <view class="flex items-start gap-3">
                            <view class={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                              available ? 'bg-accent/20' : 'bg-secondary'
                            )}>
                              <Icon class={cn(
                                'w-5 h-5',
                                available ? 'text-accent' : 'text-muted-foreground'
                              )} />
                            </view>
                            <view class="flex-1 min-w-0">
                              <text class="font-medium text-sm text-foreground">{{ benefit.title }}</text>
                              <text class="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {{ benefit.description }}
                              </text>
                            </view>
                          </view>
                        </Card>
                      )
                    })}
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp class="w-4 h-4 text-green-500" />
                    权益对比
                  </text>
                  <MembershipComparison onSelectVIP={() => setShowPaySheet(true)} />
                </view>
    
                <!--   -->
                <view>
                  <text class="font-semibold text-base text-foreground mb-3">会员评价</text>
                  <view class="space-y-3">
                    {[
                      { name: '易*明', avatar: '易', content: '开通年度会员后，学习效率提升很多，课程质量很高！', days: 128 },
                      { name: '张*华', avatar: '张', content: 'AI智能体太好用了，排盘解读很专业，物超所值。', days: 56 },
                    ].map((review, index) => (
                      <Card key={{ index }} class="p-3">
                        <view class="flex items-start gap-3">
                          <view class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                            <text class="text-sm font-medium text-accent">{{ review.avatar }}</text>
                          </view>
                          <view class="flex-1">
                            <view class="flex items-center justify-between">
                              <text class="font-medium text-sm text-foreground">{{ review.name }}</text>
                              <view class="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(i => (
                                  <Star key={i} class="w-3 h-3 fill-accent text-accent" />
                                ))}
                              </view>
                            </view>
                            <text class="text-xs text-muted-foreground mt-1">{{ review.content }}</text>
                            <text class="text-xs text-muted-foreground mt-2">已开通{{ review.days }}天</text>
                          </view>
                        </view>
                      </Card>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="font-semibold text-base text-foreground mb-3">常见问题</text>
                  <Card class="divide-y divide-border">
                    {[
                      { q: '开通后可以退款吗？', a: '会员服务一经开通，暂不支持退款，请确认后购买。' },
                      { q: '会员可以多设备登录吗？', a: '同一账号最多支持3台设备同时登录。' },
                      { q: '会员到期后权益还在吗？', a: '到期后会员权益将失效，但已下载的内容可继续保留。' },
                    ].map((faq, index) => (
                      <view key={{ index }} class="p-3">
                        <text class="font-medium text-sm text-foreground">{{ faq.q }}</text>
                        <text class="text-xs text-muted-foreground mt-1">{{ faq.a }}</text>
                      </view>
                    ))}
                  </Card>
                </view>
              </view>
            )}
          </DataState>
    
          <!--   -->
          {data && selectedPlan && (
            <view class="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb z-50">
              <view class="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
                <view>
                  <view class="flex items-baseline gap-1">
                    <text class="text-sm text-muted-foreground">¥</text>
                    <text class="text-3xl font-bold text-primary">{{ selectedPlan.price }}</text>
                    <text class="text-sm text-muted-foreground">/{{ selectedPlan.durationName }}</text>
                  </view>
                  <text class="text-xs text-muted-foreground line-through">
                    原价 ¥{{ selectedPlan.originalPrice }}
                  </text>
                </view>
                <Button
                  @click={() => setShowPaySheet(true)}
                  class="px-8 h-12 rounded-full bg-gradient-to-r from-accent to-primary text-white font-medium shadow-lg shadow-accent/30"
                >
                  {data.status.level === selectedLevel && !data.status.isExpired ? '续费' : '立即开通'}
                </Button>
              </view>
            </view>
          )}
    
          <!--   -->
          <Sheet open={{ showPaySheet }} onOpenChange={{ setShowPaySheet }}>
            <SheetContent side="bottom" class="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>选择支付方式</SheetTitle>
              </SheetHeader>
              <view class="py-4">
                {selectedPlan && (
                  <view class="text-center mb-4 pb-4 border-b">
                    <text class="text-sm text-muted-foreground">{{ selectedPlan.levelName }} · {{ selectedPlan.durationName }}</text>
                    <text class="text-3xl font-bold text-primary mt-1">
                      <text class="text-lg">¥</text>{{ selectedPlan.price }}
                    </text>
                  </view>
                )}
                
                <RadioGroup value={{ paymentMethod }} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <view class="space-y-3">
                    <Label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="wechat" />
                      <view class="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">微</view>
                      <text>微信支付</text>
                    </Label>
                    <Label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="alipay" />
                      <view class="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">支</view>
                      <text>支付宝</text>
                    </Label>
                    <Label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="balance" />
                      <view class="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-white text-xs font-bold">余</view>
                      <text>余额支付</text>
                    </Label>
                  </view>
                </RadioGroup>
    
                <Button 
                  class="w-full mt-6" 
                  size="lg"
                  @click={{ handlePurchase }}
                  :disabled={{ purchasing }}
                >
                  {purchasing ? '处理中...' : '确认支付'}
                </Button>
              </view>
            </SheetContent>
          </Sheet>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const benefitIcons: Record<string, React.ComponentType<{ className?: string }>> = {
const levelColors: Record<VipLevel, string> = {

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>