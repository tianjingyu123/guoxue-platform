<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">优惠券</text>
      <text class="v0-route">V0: coupons</text>
    </view>
        <Card class={cn(
          "relative overflow-hidden",
          isDisabled && "opacity-60"
        )}>
          <view class="flex">
            <!--   -->
            <view class={cn(
              "w-28 flex flex-col items-center justify-center py-5 relative",
              isDisabled 
                ? "bg-muted" 
                : "bg-gradient-to-br from-primary to-primary/80"
            )}>
              <!--   -->
              <view class="absolute right-0 top-0 bottom-0 w-2">
                {[...Array(8)].map((_, i) => (
                  <view 
                    key={i} 
                    class={cn(
                      "w-4 h-4 rounded-full -mr-2",
                      isDisabled ? "bg-card" : "bg-card"
                    )}
                    :style=" marginTop: i === 0 ? 0 : 4 }}
                  />
                ))}
              </view>
              
              <view class={cn(
                "text-3xl font-bold",
                isDisabled ? "text-muted-foreground" : "text-primary-foreground"
              )}>
                {{ coupon.isPercent ? (
                  <text>{coupon.amount }}<text class="text-lg">折</text></text>
                ) : (
                  <text><text class="text-lg">¥</text>{{ coupon.amount }}</text>
                )}
              </view>
              <text class={cn(
                "text-xs mt-1",
                isDisabled ? "text-muted-foreground/70" : "text-primary-foreground/80"
              )}>
                {{ coupon.condition }}
              </text>
            </view>
            
            <!--   -->
            <view class="flex-1 p-4 relative">
              <!--   -->
              <Badge 
                variant="outline" 
                class={cn(
                  "absolute top-3 right-3 text-[10px] px-1.5 py-0",
                  isDisabled 
                    ? "border-muted-foreground/30 text-muted-foreground/70" 
                    : "border-primary/30 text-primary"
                )}
              >
                {{ coupon.type }}
              </Badge>
              
              <text class={cn(
                "font-medium text-sm pr-16",
                isDisabled ? "text-muted-foreground" : "text-foreground"
              )}>
                {{ coupon.scope }}
              </text>
              
              <text class={cn(
                "text-xs mt-2",
                isDisabled ? "text-muted-foreground/60" : "text-muted-foreground"
              )}>
                有效期至 {{ coupon.expireDate }}
              </text>
              
              {status === "available" && (
                <Link href="/mall" class="mt-3 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-primary/90 transition-colors inline-block">
                  立即使用
                </Link>
              )}
              
              {status === "used" && coupon.usedDate && (
                <text class="text-xs text-muted-foreground/60 mt-2">
                  使用时间：{{ coupon.usedDate }}
                </text>
              )}
            </view>
          </view>
          
          <!--   -->
          {isDisabled && (
            <view class="absolute top-1/2 right-8 -translate-y-1/2 rotate-[-15deg]">
              <text class={cn(
                "text-2xl font-bold opacity-20",
                status === "used" ? "text-muted-foreground" : "text-destructive"
              )}>
                {status === "used" ? "已使用" : "已过期"}
              </text>
            </view>
          )}
        </Card>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const couponsData = {
const tabs = [
  const isDisabled = status !== "available"

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