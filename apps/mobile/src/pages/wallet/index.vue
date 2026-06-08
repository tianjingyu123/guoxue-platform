<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">钱包</text>
      <text class="v0-route">V0: wallet</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">我的钱包</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            {loading ? (
              <Card class="p-6">
                <view class="text-center mb-6">
                  <Skeleton class="h-4 w-20 mx-auto mb-2" />
                  <Skeleton class="h-10 w-32 mx-auto mb-2" />
                  <Skeleton class="h-4 w-16 mx-auto" />
                </view>
                <view class="flex justify-center gap-8 pt-4 border-t border-border/50">
                  <Skeleton class="h-12 w-20" />
                  <Skeleton class="h-12 w-20" />
                </view>
              </Card>
            ) : walletInfo ? (
              <Card class="relative overflow-hidden bg-gradient-to-br from-accent/20 via-accent/10 to-primary/5 border-accent/20">
                <!--   -->
                <view class="absolute -right-10 -top-10 w-40 h-40 opacity-5">
                  <Coins class="w-full h-full" />
                </view>
                <view class="absolute -left-8 -bottom-8 w-32 h-32 opacity-5">
                  <Sparkles class="w-full h-full" />
                </view>
                
                <view class="relative z-10 p-6">
                  <!--   -->
                  <view class="text-center mb-6">
                    <text class="text-sm text-muted-foreground mb-2">国学币余额</text>
                    <view class="flex items-baseline justify-center gap-1">
                      <Coins class="w-8 h-8 text-accent" />
                      <text class="text-4xl font-bold text-accent">{{ walletInfo.balance.toLocaleString() }}</text>
                      <text class="text-lg text-accent/80">币</text>
                    </view>
                    <text class="text-sm text-muted-foreground mt-2">
                      ≈ ¥{{ walletInfo.rmb.toFixed(2) }}
                    </text>
                  </view>
    
                  <!--   -->
                  <view class="flex items-center justify-center gap-6 mb-4">
                    <Link href="/points" class="flex items-center gap-1.5 text-sm">
                      <Star class="w-4 h-4 text-yellow-500" />
                      <text class="text-muted-foreground">积分</text>
                      <text class="font-medium text-foreground">{{ walletInfo.points.toLocaleString() }}</text>
                    </Link>
                    <view class="w-px h-4 bg-border" />
                    <view class="flex items-center gap-1.5 text-sm">
                      <TrendingUp class="w-4 h-4 text-green-500" />
                      <text class="text-muted-foreground">成长值</text>
                      <text class="font-medium text-foreground">{{ walletInfo.growthValue.toLocaleString() }}</text>
                    </view>
                  </view>
    
                  <!--   -->
                  <view class="mb-4">
                    <view class="flex items-center justify-between text-xs mb-1">
                      <text class="text-muted-foreground">LV.{{ walletInfo.level }}</text>
                      <text class="text-muted-foreground">LV.{{ walletInfo.level + 1 }}</text>
                    </view>
                    <view class="h-1.5 bg-border/50 rounded-full overflow-hidden">
                      <view 
                        class="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all"
                        :style=" width: `${{ (walletInfo.growthValue / walletInfo.nextLevelGrowth) * 100 }}%` }}
                      />
                    </view>
                    <text class="text-xs text-muted-foreground mt-1 text-center">
                      还需 {{ (walletInfo.nextLevelGrowth - walletInfo.growthValue).toLocaleString() }} 成长值升级
                    </text>
                  </view>
    
                  <!--   -->
                  <view class="flex items-center justify-center gap-8 pt-4 border-t border-border/50">
                    <view class="text-center">
                      <text class="text-xs text-muted-foreground">累计充值</text>
                      <text class="text-sm font-medium text-foreground mt-0.5">{{ walletInfo.totalRecharge }}币</text>
                    </view>
                    <view class="w-px h-8 bg-border/50" />
                    <view class="text-center">
                      <text class="text-xs text-muted-foreground">累计消费</text>
                      <text class="text-sm font-medium text-foreground mt-0.5">{{ walletInfo.totalSpent }}币</text>
                    </view>
                  </view>
                </view>
              </Card>
            ) : null}
    
            <!--   -->
            <view class="flex gap-3">
              <Button 
                class="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                @click={() => setShowRecharge(true)}
              >
                <CreditCard class="w-5 h-5 mr-2" />
                充值
              </Button>
              <Link href="/wallet/transactions" class="flex-1">
                <Button variant="outline" class="w-full h-12 border-border text-foreground hover:bg-secondary">
                  交易明细
                  <ChevronRight class="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </view>
    
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-semibold text-foreground">近期交易</text>
                <Link href="/wallet/transactions" class="text-sm text-primary hover:underline flex items-center">
                  全部记录
                  <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
    
              {loading ? (
                <view class="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <view key={i} class="flex items-center gap-3 py-2">
                      <Skeleton class="w-10 h-10 rounded-full" />
                      <view class="flex-1">
                        <Skeleton class="h-4 w-32 mb-1" />
                        <Skeleton class="h-3 w-20" />
                      </view>
                      <Skeleton class="h-4 w-16" />
                    </view>
                  ))}
                </view>
              ) : transactions.length > 0 ? (
                <view class="space-y-3">
                  
    <view v-for="(item, index) in transactions" :key="index"> {
                    const Icon = getIcon(item.icon)
                    const isPositive = item.amount > 0
                    
                    return (
                      <view key={item.id} class="flex items-center gap-3 py-2">
                        <view class={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          item.type === "recharge" && "bg-green-500/10",
                          item.type === "spend" && "bg-primary/10",
                          item.type === "bonus" && "bg-accent/10",
                          item.type === "refund" && "bg-blue-500/10",
                          item.type === "income" && "bg-green-500/10",
                          item.type === "withdraw" && "bg-orange-500/10"
                        )}>
                          <Icon class={cn(
                            "w-5 h-5",
                            item.type === "recharge" && "text-green-500",
                            item.type === "spend" && "text-primary",
                            item.type === "bonus" && "text-accent",
                            item.type === "refund" && "text-blue-500",
                            item.type === "income" && "text-green-500",
                            item.type === "withdraw" && "text-orange-500"
                          )} />
                        </view>
                        
                        <view class="flex-1 min-w-0">
                          <text class="text-sm font-medium text-foreground truncate">{{ item.title }}</text>
                          <text class="text-xs text-muted-foreground">{{ item.time }}</text>
                        </view>
                        
                        <text class={cn(
                          "text-sm font-semibold",
                          isPositive ? "text-green-500" : "text-primary"
                        )}>
                          {isPositive ? "+" : ""}{{ item.amount }}币
                        </text>
                      </view>
                    )
                  })}
                </view>
              ) : (
                <view class="py-8 text-center">
                  <Coins class="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
                  <text class="text-sm text-muted-foreground">暂无交易记录</text>
                </view>
              )}
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-medium text-foreground mb-3">充值说明</text>
              <view class="space-y-2 text-sm text-muted-foreground">
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>1元人民币 = 10国学币</text>
                </view>
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>国学币可用于购买课程、商品、加入圈子等</text>
                </view>
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>充值后国学币不可提现，请按需充值</text>
                </view>
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>大额充值享受额外赠送，详见充值页面</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          {showRecharge && (
            <view class="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
              <view 
                class="absolute inset-0" 
                @click={() => { setShowRecharge(false); setSelectedOption(null) }}
              />
              <view class="relative w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <!--   -->
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <text class="font-semibold text-lg text-foreground">充值国学币</text>
                  <view class="v0-btn" 
                    @click={() => { setShowRecharge(false); setSelectedOption(null) }}
                    class="p-1 rounded-full hover:bg-secondary transition-colors"
                  >
                    <text class="text-muted-foreground text-xl leading-none">&times;</text>
                  </view>
                </view>
    
                <!--   -->
                <view class="p-4">
                  <view class="grid grid-cols-3 gap-3">
                    
    <view v-for="(option, index) in rechargeOptions" :key="index"> (
                      <view class="v0-btn"
                        key={{ index }}
                        @click={() => setSelectedOption(index)}
                        class={cn(
                          "relative p-3 rounded-xl border-2 transition-all",
                          selectedOption === index
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 bg-card"
                        )}
                      >
                        {option.popular && (
                          <Badge class="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5">
                            推荐
                          </Badge>
                        )}
                        <view class="flex items-center justify-center gap-1 mb-1">
                          <Coins class="w-4 h-4 text-accent" />
                          <text class="font-bold text-foreground">{{ option.coins }}</text>
                        </view>
                        <text class="text-sm text-primary font-medium">¥{{ option.price }}</text>
                        {option.bonus > 0 && (
                          <text class="text-xs text-accent mt-1">送{{ option.bonus }}币</text>
                        )}
                      </view>
                    ))}
                  </view>
    
                  <!--   -->
                  {selectedOption !== null && (
                    <view class="mt-4 p-3 bg-secondary/50 rounded-lg">
                      <view class="flex items-center justify-between text-sm">
                        <text class="text-muted-foreground">充值金额</text>
                        <text class="text-foreground">¥{{ rechargeOptions[selectedOption].price }}</text>
                      </view>
                      <view class="flex items-center justify-between text-sm mt-2">
                        <text class="text-muted-foreground">获得国学币</text>
                        <text class="text-accent font-medium">
                          {{ rechargeOptions[selectedOption].coins + rechargeOptions[selectedOption].bonus }}币
                          {rechargeOptions[selectedOption].bonus > 0 && (
                            <text class="text-xs ml-1">(含赠送{{ rechargeOptions[selectedOption].bonus }})</text>
                          )}
                        </text>
                      </view>
                    </view>
                  )}
                </view>
    
                <!--   -->
                <view class="p-4 border-t border-border">
                  <Button 
                    class="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    :disabled={{ selectedOption === null || paying }}
                    @click={{ handleRecharge }}
                  >
                    {paying 
                      ? "创建订单中..."
                      : selectedOption !== null 
                        ? `立即支付 ¥${{ rechargeOptions[selectedOption].price }}`
                        : "请选择充值金额"
                    }
                  </Button>
                  <text class="text-xs text-muted-foreground text-center mt-3">
                    支付即表示同意《充值服务协议》
                  </text>
                </view>
              </view>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {

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