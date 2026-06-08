<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">reservations</text>
      <text class="v0-route">V0: reservations</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">我的预约</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-14 z-30 bg-background border-b border-border">
            <view class="flex px-4 gap-2 py-3 overflow-x-auto scrollbar-hide">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id)}
                  class={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ tab.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {filteredReservations.length > 0 ? (
              filteredReservations.map(reservation => {
                const typeInfo = typeConfig[reservation.type]
                const statusInfo = statusConfig[reservation.status]
                const TypeIcon = typeInfo.icon
    
                return (
                  <Card key={reservation.id} class="overflow-hidden">
                    <!--   -->
                    <view class="flex items-center justify-between px-4 py-3 border-b border-border">
                      <view class="flex items-center gap-2">
                        <view class={cn("w-8 h-8 rounded-lg flex items-center justify-center", typeInfo.bg)}>
                          <TypeIcon class={cn("w-4 h-4", typeInfo.color)} />
                        </view>
                        <text class="text-sm font-medium text-foreground">{{ typeInfo.label }}</text>
                      </view>
                      <Badge variant="outline" class={cn("text-xs", statusInfo.color)}>
                        {{ statusInfo.label }}
                      </Badge>
                    </view>
    
                    <!--   -->
                    <view class="p-4">
                      <text class="font-semibold text-base text-foreground mb-3">{{ reservation.title }}</text>
                      
                      <!--   -->
                      <view class="flex items-center gap-3 mb-3">
                        <Avatar class="w-10 h-10">
                          <AvatarImage src={{ reservation.target.avatar }} alt={{ reservation.target.name }} />
                          <AvatarFallback class="bg-secondary text-foreground text-sm">
                            {{ reservation.target.name[0] }}
                          </AvatarFallback>
                        </Avatar>
                        <view>
                          <view class="flex items-center gap-1.5">
                            <text class="font-medium text-sm text-foreground">{{ reservation.target.name }}</text>
                            {(reservation.target as any).isVerified && (
                              <Badge variant="secondary" class="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                            )}
                          </view>
                          {reservation.type === "call" && (
                            <view class="flex items-center gap-1 text-xs text-muted-foreground">
                              {(reservation as any).callType === "video" ? (
                                <Video class="w-3 h-3" /> 视频连麦
                              ) : (
                                <Mic class="w-3 h-3" /> 语音连麦
                              )}
                              <text>· {{ (reservation as any).duration }}分钟</text>
                            </view>
                          )}
                        </view>
                      </view>
    
                      <!--   -->
                      <view class="space-y-2 text-sm">
                        <view class="flex items-center gap-2 text-muted-foreground">
                          <Calendar class="w-4 h-4 flex-shrink-0" />
                          <text>{{ reservation.date }}</text>
                          <Clock class="w-4 h-4 flex-shrink-0 ml-2" />
                          <text>{{ reservation.time }}</text>
                        </view>
                        {(reservation as any).location && (
                          <view class="flex items-start gap-2 text-muted-foreground">
                            <MapPin class="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <text class="line-clamp-1">{{ (reservation as any).location }}</text>
                          </view>
                        )}
                        {reservation.status === "cancelled" && (reservation as any).cancelReason && (
                          <view class="flex items-center gap-2 text-red-500 text-xs">
                            <X class="w-3 h-3" />
                            <text>取消原因：{{ (reservation as any).cancelReason }}</text>
                          </view>
                        )}
                      </view>
    
                      <!--   -->
                      {reservation.price > 0 && (
                        <view class="mt-3 pt-3 border-t border-border flex items-center justify-between">
                          <text class="text-xs text-muted-foreground">预约费用</text>
                          <text class="text-primary font-semibold">¥{{ reservation.price }}</text>
                        </view>
                      )}
                    </view>
    
                    <!--   -->
                    <view class="px-4 py-3 bg-secondary/30 border-t border-border flex items-center justify-end gap-3">
                      {(reservation.status === "pending" || reservation.status === "confirmed") && (
                        
                          <view class="v0-btn" 
                            @click={() => handleCancel(reservation.id)}
                            class="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            取消预约
                          </view>
                          {reservation.status === "confirmed" && reservation.type === "call" && (
                            <Link 
                              href={`/call/${reservation.id}`}
                              class="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                            >
                              进入连麦
                            </Link>
                          )}
                          {reservation.status === "confirmed" && reservation.type === "offline" && (
                            <Link 
                              href={`/offline-course/${reservation.id}`}
                              class="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                            >
                              查看详情 <ChevronRight class="w-4 h-4" />
                            </Link>
                          )}
                        
                      )}
                      {reservation.status === "completed" && (
                        <Link 
                          href={`/reservations/${reservation.id}`}
                          class="flex items-center gap-1 px-4 py-1.5 text-sm text-foreground hover:text-primary transition-colors"
                        >
                          查看详情 <ChevronRight class="w-4 h-4" />
                        </Link>
                      )}
                      {reservation.status === "cancelled" && (
                        <view class="v0-btn" class="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors">
                          <RefreshCw class="w-4 h-4" />
                          再次预约
                        </view>
                      )}
                    </view>
                  </Card>
                )
              })
            ) : (
              <view class="flex flex-col items-center justify-center py-16">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Calendar class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm mb-1">暂无预约记录</text>
                <text class="text-muted-foreground/70 text-xs mb-4">去找讲师咨询或报名线下课吧</text>
                <Link
                  href="/experts"
                  class="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                >
                  找讲师咨询
                </Link>
              </view>
            )}
          </view>
    
          <!--   -->
          {showCancelModal && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <Card class="w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
                <text class="font-semibold text-lg text-foreground text-center mb-2">确认取消预约？</text>
                <text class="text-sm text-muted-foreground text-center mb-6">
                  取消后预约费用将原路退回，如有疑问请联系客服
                </text>
                <view class="flex gap-3">
                  <view class="v0-btn"
                    @click={() => setShowCancelModal(false)}
                    class="flex-1 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    再想想
                  </view>
                  <view class="v0-btn"
                    @click={{ confirmCancel }}
                    class="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors"
                  >
                    确认取消
                  </view>
                </view>
              </Card>
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
const typeConfig = {
const statusConfig = {
const reservationsData = [
const tabs = [
  const filteredReservations = activeTab === "all" 

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