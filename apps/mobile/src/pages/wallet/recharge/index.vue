<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">钱包</text>
      <text class="v0-route">V0: wallet/recharge</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="flex items-center justify-between h-14 px-4">
              <BackButton fallbackPath="/wallet" />
              <text class="font-semibold text-base text-foreground">充值国学币</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 space-y-6">
            <!--   -->
            <view class="text-center">
              <text class="text-sm text-muted-foreground">
                国学币与人民币比例为 <text class="text-accent font-medium">10:1</text>
              </text>
              <text class="text-xs text-muted-foreground/70 mt-1">
                充值后可用于购买课程、加入圈子、打赏、付费问答等
              </text>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-foreground mb-3">选择充值金额</text>
              {loading ? (
                <view class="grid grid-cols-3 gap-3">
                  {[1,2,3,4,5,6].map(i => (
                    <Card key={i} class="p-3 animate-pulse">
                      <view class="h-7 bg-muted rounded mb-2" />
                      <view class="h-4 bg-muted rounded w-1/2 mx-auto" />
                    </Card>
                  ))}
                </view>
              ) : (
                <view class="grid grid-cols-3 gap-3">
                  
    <view v-for="(option, index) in options" :key="index"> (
                    <Card
                      key={option.coins}
                      @click={() => handleOptionSelect(option.coins)}
                      class={cn(
                        "relative p-3 cursor-pointer transition-all text-center",
                        selectedOption === option.coins
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <!--   -->
                      {option.popular && (
                        <view class="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
                          推荐
                        </view>
                      )}
                      
                      <!--   -->
                      {option.bonus > 0 && (
                        <view class="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-accent text-white text-[9px] font-medium rounded-full flex items-center gap-0.5">
                          <Sparkles class="w-2.5 h-2.5" />
                          +{{ option.bonus }}
                        </view>
                      )}
    
                      <!--   -->
                      <view class={cn(
                        "text-xl font-bold",
                        selectedOption === option.coins ? "text-accent" : "text-foreground"
                      )}>
                        {{ option.coins + option.bonus }}
                        <text class="text-xs font-normal ml-0.5">币</text>
                      </view>
    
                      <!--   -->
                      <view class="text-sm text-muted-foreground mt-1">
                        ¥{{ option.price }}
                      </view>
    
                      <!--   -->
                      {selectedOption === option.coins && (
                        <view class="absolute bottom-1 right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                          <Check class="w-2.5 h-2.5 text-white" />
                        </view>
                      )}
                    </Card>
                  ))}
                </view>
              )}
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-foreground mb-3">自定义金额</text>
              <Card class={cn(
                "p-4 transition-all",
                customAmount ? "border-accent ring-1 ring-accent" : "border-border"
              )}>
                <view class="flex items-center gap-3">
                  <text class="text-lg font-medium text-foreground">¥</text>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="输入其他金额（整数）"
                    value={{ customAmount }}
                    @change={(e) => handleCustomAmountChange(e.target.value)}
                    class="flex-1 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/50 outline-none"
                  />
                  {customAmount && (
                    <view class="text-sm text-accent">
                      = {{ parseInt(customAmount) * 10 }} 币
                    </view>
                  )}
                </view>
                <text class="text-xs text-muted-foreground mt-2">
                  最低充值金额 ¥1，最高单次充值 ¥50000
                </text>
              </Card>
            </view>
    
            <!--   -->
            <view>
              <text class="text-sm font-medium text-foreground mb-3">支付方式</text>
              <view class="space-y-2">
                
    <view v-for="(method, index) in paymentMethods" :key="index"> (
                  <Card
                    key={method.id}
                    @click={() => setPaymentMethod(method.id)}
                    class={cn(
                      "p-4 cursor-pointer transition-all flex items-center justify-between",
                      paymentMethod === method.id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <view class="flex items-center gap-3">
                      <text class="text-xl">{{ method.icon }}</text>
                      <text class="font-medium text-foreground">{{ method.name }}</text>
                    </view>
                    <view class={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      paymentMethod === method.id
                        ? "border-accent bg-accent"
                        : "border-muted-foreground/30"
                    )}>
                      {paymentMethod === method.id && (
                        <Check class="w-3 h-3 text-white" />
                      )}
                    </view>
                  </Card>
                ))}
              </view>
            </view>
    
            <!--   -->
            <Card class="p-4 bg-secondary/30 border-border">
              <text class="text-sm font-medium text-foreground mb-2">充值说明</text>
              <view class="text-xs text-muted-foreground space-y-1.5">
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>国学币为平台虚拟货币，仅限在本平台内使用</text>
                </view>
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>充值后不支持退款，请确认后再进行充值</text>
                </view>
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>赠送的国学币有效期为充值后365天</text>
                </view>
                <view class="flex items-start gap-2">
                  <text class="text-accent">•</text>
                  <text>如有疑问，请联系客服处理</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
            <view class="max-w-lg mx-auto">
              <!--   -->
              {selectedAmount > 0 && (
                <view class="flex items-center justify-between text-sm mb-3">
                  <text class="text-muted-foreground">本次充值</text>
                  <view class="text-right">
                    <text class="text-accent font-bold text-lg">{{ totalCoins }}</text>
                    <text class="text-muted-foreground ml-1">国学币</text>
                  </view>
                </view>
              )}
              
              <view class="v0-btn"
                @click={{ handleSubmit }}
                :disabled={{ selectedAmount <= 0 || isSubmitting }}
                class={cn(
                  "w-full py-3.5 rounded-xl font-medium text-base transition-all flex items-center justify-center gap-2",
                  selectedAmount > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  
                    <Loader2 class="w-4 h-4 animate-spin" />
                    支付中...
                  
                ) : selectedAmount > 0 ? (
                  `确认充值 ¥${{ selectedAmount }}`
                ) : (
                  "请选择充值金额"
                )}
              </view>
            </view>
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
const paymentMethods = [

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