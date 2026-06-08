<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">通知</text>
      <text class="v0-route">V0: settings/notifications</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <Link href="/settings" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">通知设置</text>
              </view>
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <Card class="p-4">
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-3">
                  <view class={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    pushEnabled ? "bg-primary/10" : "bg-muted"
                  )}>
                    {pushEnabled ? (
                      <Bell class="w-5 h-5 text-primary" />
                    ) : (
                      <BellOff class="w-5 h-5 text-muted-foreground" />
                    )}
                  </view>
                  <view>
                    <text class="font-medium">接收推送通知</text>
                    <text class="text-xs text-muted-foreground">
                      {pushEnabled ? "已开启，将收到各类通知提醒" : "已关闭，将不会收到任何推送"}
                    </text>
                  </view>
                </view>
                <Switch :checked={{ pushEnabled }} onCheckedChange={{ setPushEnabled }} />
              </view>
            </Card>
    
            <!--   -->
            <view class={cn(!pushEnabled && "opacity-50 pointer-events-none")}>
              <!--   -->
              <Card class="overflow-hidden">
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">互动通知</text>
                </view>
                <view class="divide-y divide-border">
                  <NotifyRow
                    icon={{ MessageCircle }}
                    title="评论通知"
                    description="有人评论您的内容时通知"
                    :checked={{ notifyComment }}
                    @change={{ setNotifyComment }}
                  />
                  <NotifyRow
                    icon={{ Heart }}
                    title="点赞通知"
                    description="有人点赞您的内容时通知"
                    :checked={{ notifyLike }}
                    @change={{ setNotifyLike }}
                  />
                  <NotifyRow
                    icon={{ Users }}
                    title="关注通知"
                    description="有人关注您时通知"
                    :checked={{ notifyFollow }}
                    @change={{ setNotifyFollow }}
                  />
                  <NotifyRow
                    icon={{ MessageCircle }}
                    title="@提及通知"
                    description="有人@您时通知"
                    :checked={{ notifyMention }}
                    @change={{ setNotifyMention }}
                  />
                  <NotifyRow
                    icon={{ MessageCircle }}
                    title="私信通知"
                    description="收到私信时通知"
                    :checked={{ notifyMessage }}
                    @change={{ setNotifyMessage }}
                  />
                </view>
              </Card>
    
              <!--   -->
              <Card class="overflow-hidden mt-4">
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">内容更新</text>
                </view>
                <view class="divide-y divide-border">
                  <NotifyRow
                    icon={{ Users }}
                    title="圈子更新"
                    description="关注的圈子有新内容时通知"
                    :checked={{ notifyCircleUpdate }}
                    @change={{ setNotifyCircleUpdate }}
                  />
                  <NotifyRow
                    icon={{ Video }}
                    title="直播开播"
                    description="预约的直播开播时通知"
                    :checked={{ notifyLiveStart }}
                    @change={{ setNotifyLiveStart }}
                  />
                  <NotifyRow
                    icon={{ Smartphone }}
                    title="课程更新"
                    description="订阅的课程有新章节时通知"
                    :checked={{ notifyCourseUpdate }}
                    @change={{ setNotifyCourseUpdate }}
                  />
                  <NotifyRow
                    icon={{ Calendar }}
                    title="活动提醒"
                    description="报名的活动即将开始时通知"
                    :checked={{ notifyActivityRemind }}
                    @change={{ setNotifyActivityRemind }}
                  />
                </view>
              </Card>
    
              <!--   -->
              <Card class="overflow-hidden mt-4">
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">交易通知</text>
                </view>
                <view class="divide-y divide-border">
                  <NotifyRow
                    icon={{ ShoppingBag }}
                    title="订单通知"
                    description="订单状态变更时通知（发货、完成等）"
                    :checked={{ notifyOrder }}
                    @change={{ setNotifyOrder }}
                  />
                  <NotifyRow
                    icon={{ Coins }}
                    title="收益通知"
                    description="有新收益到账时通知"
                    :checked={{ notifyIncome }}
                    @change={{ setNotifyIncome }}
                  />
                  <NotifyRow
                    icon={{ Clock }}
                    title="到期提醒"
                    description="会员、圈子等即将到期时通知"
                    :checked={{ notifyExpiry }}
                    @change={{ setNotifyExpiry }}
                    important
                  />
                </view>
              </Card>
    
              <!--   -->
              <Card class="overflow-hidden mt-4">
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">系统通知</text>
                </view>
                <view class="divide-y divide-border">
                  <NotifyRow
                    icon={{ Bell }}
                    title="系统消息"
                    description="平台公告、安全提醒等重要通知"
                    :checked={{ notifySystem }}
                    @change={{ setNotifySystem }}
                  />
                  <NotifyRow
                    icon={{ Mail }}
                    title="营销推广"
                    description="优惠活动、新功能推荐等"
                    :checked={{ notifyPromotion }}
                    @change={{ setNotifyPromotion }}
                  />
                </view>
              </Card>
    
              <!--   -->
              <Card class="overflow-hidden mt-4">
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">免打扰模式</text>
                </view>
                <view class="divide-y divide-border">
                  <view class="px-4 py-3 flex items-center justify-between">
                    <view class="flex items-center gap-3">
                      <view class="w-8 h-8 rounded-lg bg-operator/10 flex items-center justify-center">
                        <Moon class="w-4 h-4 text-operator" />
                      </view>
                      <view>
                        <text class="text-sm font-medium">开启免打扰</text>
                        <text class="text-[10px] text-muted-foreground">在指定时间段内不接收推送通知</text>
                      </view>
                    </view>
                    <Switch :checked={{ quietModeEnabled }} onCheckedChange={{ setQuietModeEnabled }} />
                  </view>
                  
                  {quietModeEnabled && (
                    <view class="px-4 py-3 flex items-center justify-between">
                      <view class="flex items-center gap-3 ml-11">
                        <text class="text-sm text-muted-foreground">免打扰时段</text>
                      </view>
                      <view class="flex items-center gap-2">
                        <TimeSelect value={{ quietStart }} @change={{ setQuietStart }} />
                        <text class="text-muted-foreground">-</text>
                        <TimeSelect value={{ quietEnd }} @change={{ setQuietEnd }} />
                      </view>
                    </view>
                  )}
                </view>
              </Card>
            </view>
    
            <!--   -->
            <text class="text-[10px] text-muted-foreground text-center px-4">
              关闭通知后，您仍可在消息中心查看相关消息
            </text>
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
  const times = [

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