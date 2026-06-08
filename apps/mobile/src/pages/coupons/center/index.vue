<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">优惠券</text>
      <text class="v0-route">V0: coupons/center</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-50 bg-gradient-to-br from-primary via-primary to-accent text-white">
      <view class="flex items-center justify-between px-4 h-12">
      <BackButton fallbackPath="/coupons" />
              <text class="font-bold flex items-center gap-2">
                <Gift class="w-5 h-5" />
                领券中心
              </text>
              <Link href="/coupons" class="text-xs">我的券</Link>
            </view>
    
            <!--   -->
            <view class="px-4 pb-4">
              <Card class="bg-white/10 border-white/20 p-3">
                <view class="flex items-center justify-between">
                  <view class="flex items-center gap-3">
                    <view class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Coins class="w-5 h-5 text-amber-400" />
                    </view>
                    <view>
                      <text class="text-white/70 text-xs">我的积分</text>
                      <text class="text-xl font-bold text-white">{{ userPoints }}</text>
                    </view>
                  </view>
                  <Button size="sm" variant="secondary" class="bg-white/20 text-white hover:bg-white/30 border-0">
                    兑换礼品
                  </Button>
                </view>
              </Card>
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-[124px] z-40 bg-background border-b border-border">
            <view class="flex">
              {[
                { key: "all", label: "全部" },
                { key: "course", label: "课程券" },
                { key: "product", label: "商品券" },
                { key: "points", label: "积分兑" },
              ].map((tab) => (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setActiveTab(tab.key as typeof activeTab)}
                  class={cn(
                    "flex-1 py-3 text-sm font-medium relative transition-colors",
                    activeTab === tab.key ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {{ tab.label }}
                  {activeTab === tab.key && (
                    <text class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 pb-24 space-y-4">
            {activeTab === "points" ? (
              // 积分兑换区
              
                <view class="text-sm text-muted-foreground mb-2">可用积分：{{ userPoints }}</view>
                <view class="space-y-3">
                  
    <view v-for="(coupon, index) in pointsCoupons" :key="index"> {
                    const canExchange = userPoints >= coupon.points
                    const isReceived = receivedIds.includes(coupon.id)
    
                    return (
                      <Card key={coupon.id} class="p-3 flex items-center gap-3">
                        <!--   -->
                        <view class="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex flex-col items-center justify-center text-white">
                          {coupon.type === "折扣" ? (
                            
                              <text class="text-xl font-bold">{{ coupon.amount }}</text>
                              <text class="text-[10px]">折</text>
                            
                          ) : (
                            
                              <text class="text-[10px]">¥</text>
                              <text class="text-xl font-bold">{{ coupon.amount }}</text>
                            
                          )}
                        </view>
                        
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <text class="font-medium text-sm truncate">{{ coupon.scope }}</text>
                          <text class="text-xs text-muted-foreground">
                            {coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛"}
                          </text>
                          <text class="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Coins class="w-3 h-3" />
                            {{ coupon.points }} 积分
                          </text>
                        </view>
    
                        <!--   -->
                        <Button
                          size="sm"
                          variant={canExchange && !isReceived ? "default" : "outline"}
                          :disabled={{ !canExchange || isReceived }}
                          @click={() => handleReceive(coupon.id)}
                          class="h-8 px-3 text-xs"
                        >
                          {isReceived ? (
                            <Check class="w-3 h-3 mr-1" />已兑换
                          ) : canExchange ? "兑换" : "积分不足"}
                        </Button>
                      </Card>
                    )
                  })}
                </view>
    
                <!--   -->
                <view class="mt-6">
                  <view class="flex items-center gap-2 mb-3">
                    <Crown class="w-4 h-4 text-amber-500" />
                    <text class="font-bold text-sm">会员专属券</text>
                  </view>
                  <view class="space-y-3">
                    
    <view v-for="(coupon, index) in vipCoupons" :key="index"> {
                      const canGet = userVipLevel >= coupon.vipLevel
                      const isReceived = receivedIds.includes(coupon.id)
    
                      return (
                        <Card key={coupon.id} class={cn("p-3 relative overflow-hidden", !canGet && "opacity-60")}>
                          <view class="flex items-center gap-3">
                            <!--   -->
                            <view class="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center text-white">
                              {coupon.type === "折扣" ? (
                                
                                  <text class="text-xl font-bold">{{ coupon.amount }}</text>
                                  <text class="text-[10px]">折</text>
                                
                              ) : (
                                
                                  <text class="text-[10px]">¥</text>
                                  <text class="text-xl font-bold">{{ coupon.amount }}</text>
                                
                              )}
                            </view>
                            
                            <!--   -->
                            <view class="flex-1 min-w-0">
                              <text class="font-medium text-sm truncate">{{ coupon.scope }}</text>
                              <text class="text-xs text-muted-foreground">
                                {coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛"}
                              </text>
                              <Badge class="mt-1 text-[10px] px-1.5 py-0 bg-gradient-to-r from-amber-500 to-orange-500 border-0">
                                VIP{{ coupon.vipLevel }}专享
                              </Badge>
                            </view>
    
                            <!--   -->
                            <Button
                              size="sm"
                              variant={canGet && !isReceived ? "default" : "outline"}
                              :disabled={{ !canGet || isReceived }}
                              @click={() => handleReceive(coupon.id)}
                              class="h-8 px-3 text-xs"
                            >
                              {isReceived ? (
                                <Check class="w-3 h-3 mr-1" />已领取
                              ) : canGet ? "领取" : `需VIP${{ coupon.vipLevel }}`}
                            </Button>
                          </view>
                        </Card>
                      )
                    })}
                  </view>
                </view>
              
            ) : (
              // 普通优惠券列表
              <view class="space-y-3">
                
    <view v-for="(coupon, index) in filteredCoupons" :key="index"> {
                  const isReceived = receivedIds.includes(coupon.id)
                  const isDiscount = coupon.type === "折扣"
    
                  return (
                    <view 
                      key={{ coupon.id }}
                      class="relative overflow-hidden rounded-xl h-24"
                    >
                      <!--   -->
                      <view class="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/90" />
                      
                      <!--   -->
                      <view class="absolute right-[30%] top-0 bottom-0 flex flex-col justify-around py-2">
                        {[...Array(6)].map((_, i) => (
                          <view key={i} class="w-3 h-3 rounded-full bg-background -mr-1.5" />
                        ))}
                      </view>
    
                      <view class="relative h-full flex">
                        <!--   -->
                        <view class="w-[30%] flex flex-col items-center justify-center text-white">
                          {isDiscount ? (
                            <view class="text-center">
                              <text class="text-3xl font-bold">{{ coupon.amount }}</text>
                              <text class="text-lg font-bold">折</text>
                            </view>
                          ) : (
                            <view class="text-center">
                              <text class="text-lg">¥</text>
                              <text class="text-3xl font-bold">{{ coupon.amount }}</text>
                            </view>
                          )}
                          <text class="text-xs text-white/80 mt-0.5">
                            {coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛"}
                          </text>
                        </view>
    
                        <!--   -->
                        <view class="flex-1 flex items-center justify-between px-4 bg-card rounded-r-xl">
                          <view>
                            <view class="flex items-center gap-1.5 mb-1">
                              <Badge variant="outline" class="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                                {{ coupon.type }}券
                              </Badge>
                              {coupon.tag && (
                                <Badge class={cn(
                                  "text-[10px] px-1.5 py-0 border-0",
                                  coupon.tag === "热门" ? "bg-red-500" :
                                  coupon.tag === "限时" ? "bg-orange-500" :
                                  coupon.tag === "新人" ? "bg-green-500" : "bg-primary"
                                )}>
                                  {{ coupon.tag }}
                                </Badge>
                              )}
                            </view>
                            <text class="font-medium text-sm mb-0.5">{{ coupon.scope }}</text>
                            <text class="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock class="w-3 h-3" />
                              {{ coupon.startDate }} - {{ coupon.endDate }}
                            </text>
                          </view>
    
                          <!--   -->
                          {isReceived ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              class="h-8 px-4 text-xs border-primary text-primary"
                            >
                              去使用
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              class="h-8 px-4 text-xs"
                              @click={() => handleReceive(coupon.id)}
                            >
                              领取
                            </Button>
                          )}
                        </view>
                      </view>
    
                      <!--   -->
                      {isReceived && (
                        <view class="absolute top-2 right-2">
                          <view class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check class="w-4 h-4 text-white" />
                          </view>
                        </view>
                      )}
                    </view>
                  )
                })}
              </view>
            )}
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const availableCoupons = [
const pointsCoupons = [
const vipCoupons = [
              const isDiscount = coupon.type === "折扣"

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