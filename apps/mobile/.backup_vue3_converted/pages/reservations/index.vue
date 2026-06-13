<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-40 bg-white/95 border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">我的预约</text>
        <view class="w-9" />
      </view>
    </header>

    <!-- 类型Tab -->
    <view class="sticky top-14 z-30 bg-white border-b border-border">
      <view class="flex px-4 gap-2 py-3" style="overflow-x:auto;white-space:nowrap">
        <view v-for="tab in tabs" :key="tab.id" @click="activeTab=tab.id" :class="'px-4 py-1.5 rounded-full text-sm font-medium ' + (activeTab===tab.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')">
          <text>{{tab.label}}</text>
        </view>
      </view>
    </view>

    <!-- 预约列表 -->
    <view class="p-4 space-y-3">
      <view v-if="filteredReservations.length>0">
        <view v-for="reservation in filteredReservations" :key="reservation.id" class="bg-white rounded-xl overflow-hidden">
          <!-- 卡片头部 -->
          <view class="flex items-center justify-between px-4 py-3 border-b border-border">
            <view class="flex items-center gap-2">
              <view :class="'w-8 h-8 rounded-lg flex items-center justify-center ' + typeConfig[reservation.type].bg">
                <text :class="typeConfig[reservation.type].color">{{getTypeIcon(reservation.type)}}</text>
              </view>
              <text class="text-sm font-medium text-foreground">{{typeConfig[reservation.type].label}}</text>
            </view>
            <text :class="'text-xs px-2 py-0.5 rounded border ' + statusConfig[reservation.status].color">{{statusConfig[reservation.status].label}}</text>
          </view>

          <!-- 卡片内容 -->
          <view class="p-4">
            <text class="font-semibold text-base text-foreground mb-3" style="display:block">{{reservation.title}}</text>

            <!-- 预约对象 -->
            <view class="flex items-center gap-3 mb-3">
              <view class="w-10 h-10 rounded-full flex items-center justify-center text-sm" style="background-color:#F5F1EB;color:#2C2C2C">
                <text>{{reservation.target.name[0]}}</text>
              </view>
              <view>
                <view class="flex items-center gap-1.5">
                  <text class="font-medium text-sm text-foreground">{{reservation.target.name}}</text>
                  <text v-if="reservation.target.isVerified" class="text-[10px] px-1 py-0 rounded" style="background-color:#C9A96E/20;color:#C9A96E">V</text>
                </view>
                <view v-if="reservation.type==='call'" class="flex items-center gap-1 text-xs text-muted-foreground">
                  <text>{{reservation.callType==='video' ? '📹' : ''}} {{reservation.callType==='video' ? '视频连麦' : '语音连麦'}}</text>
                  <text> · {{reservation.duration}}分钟</text>
                </view>
              </view>
            </view>

            <!-- 时间地点信息 -->
            <view class="space-y-2 text-sm">
              <view class="flex items-center gap-2 text-muted-foreground">
                <text></text>
                <text>{{reservation.date}}</text>
                <text class="ml-2">🕐</text>
                <text>{{reservation.time}}</text>
              </view>
              <view v-if="reservation.location" class="flex items-start gap-2 text-muted-foreground">
                <text class="mt-0.5">📍</text>
                <text class="line-clamp-1">{{reservation.location}}</text>
              </view>
              <view v-if="reservation.status==='cancelled' && reservation.cancelReason" class="flex items-center gap-2 text-red-500 text-xs">
                <text>✕</text>
                <text>取消原因：{{reservation.cancelReason}}</text>
              </view>
            </view>

            <!-- 价格 -->
            <view v-if="reservation.price>0" class="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <text class="text-xs text-muted-foreground">预约费用</text>
              <text class="text-primary font-semibold">¥{{reservation.price}}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="px-4 py-3 border-t border-border flex items-center justify-end gap-3" style="background-color:rgba(245,241,235,0.3)">
            <view v-if="reservation.status==='pending'||reservation.status==='confirmed'">
              <view @click="handleCancel(reservation.id)" class="px-4 py-1.5 text-sm text-muted-foreground">
                <text>取消预约</text>
              </view>
              <view v-if="reservation.status==='confirmed' && reservation.type==='call'" @click="navigateTo('/pages/call/'+reservation.id+'/index')" class="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-full inline-block">
                <text>进入连麦</text>
              </view>
              <view v-if="reservation.status==='confirmed' && reservation.type==='offline'" @click="navigateTo('/pages/offline-course/'+reservation.id+'/index')" class="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-full inline-block">
                <text>查看详情 ›</text>
              </view>
            </view>
            <view v-if="reservation.status==='completed'" @click="navigateTo('/pages/reservations/'+reservation.id+'/index')" class="flex items-center gap-1 px-4 py-1.5 text-sm text-foreground">
              <text>查看详情 ›</text>
            </view>
            <view v-if="reservation.status==='cancelled'" class="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-full inline-block">
              <text> 再次预约</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="flex flex-col items-center justify-center py-16">
        <view class="w-20 h-20 rounded-full flex items-center justify-center mb-4" style="background-color:#F5F1EB">
          <text class="text-xl text-muted-foreground"></text>
        </view>
        <text class="text-muted-foreground text-sm mb-1">暂无预约记录</text>
        <text class="text-muted-foreground/70 text-xs mb-4" style="display:block">去找讲师咨询或报名线下课吧</text>
        <view @click="navigateTo('/pages/experts/index')" class="px-6 py-2 bg-primary text-white text-sm font-medium rounded-full">
          <text>找讲师咨询</text>
        </view>
      </view>
    </view>

    <!-- 取消确认弹窗 -->
    <view v-if="showCancelModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <view class="w-full max-w-sm bg-white rounded-xl p-6">
        <text class="font-semibold text-lg text-foreground text-center mb-2" style="display:block">确认取消预约？</text>
        <text class="text-sm text-muted-foreground text-center mb-6" style="display:block">取消后预约费用将原路退回，如有疑问请联系客服</text>
        <view class="flex gap-3">
          <view @click="showCancelModal=false" class="flex-1 py-2.5 text-center text-sm font-medium rounded-xl" style="background-color:#F5F1EB;color:#2C2C2C">
            <text>再想想</text>
          </view>
          <view @click="confirmCancel" class="flex-1 py-2.5 text-center text-sm font-medium rounded-xl text-white" style="background-color:#ef4444">
            <text>确认取消</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const typeConfig: Record<string, any> = {
  call: { label: "连麦咨询", icon: "📞", color: "text-blue-500", bg: "bg-blue-500/10" },
  offline: { label: "线下课程", icon: "🎓", color: "text-green-500", bg: "bg-green-500/10" },
  schedule: { label: "讲师排期", icon: "", color: "text-purple-500", bg: "bg-purple-500/10" },
}

const statusConfig: Record<string, any> = {
  pending: { label: "待确认", color: "text-orange-500 border-orange-500/20 bg-orange-500/10" },
  confirmed: { label: "已确认", color: "text-green-500 border-green-500/20 bg-green-500/10" },
  completed: { label: "已完成", color: "text-muted-foreground border-border bg-secondary" },
  cancelled: { label: "已取消", color: "text-red-500 border-red-500/20 bg-red-500/10" },
}

const reservationsData = [
  { id: 1, type: "call", title: "八字命理咨询", target: { name: "周易大师", avatar: "", isVerified: true }, date: "2024-12-20", time: "14:00-14:30", duration: 30, status: "confirmed", callType: "video", price: 150 },
  { id: 2, type: "offline", title: "八字入门实战班", target: { name: "热卜学院·北京中心", avatar: "" }, date: "2024-12-22", time: "09:00-12:00", location: "北京市朝阳区望京SOHO T1", status: "pending", price: 299 },
  { id: 3, type: "schedule", title: "紫微斗数专项咨询", target: { name: "张玄风", avatar: "", isVerified: true }, date: "2024-12-25", time: "10:00-11:00", status: "pending", price: 200 },
  { id: 4, type: "call", title: "风水布局指导", target: { name: "陈风水", avatar: "", isVerified: true }, date: "2024-12-15", time: "15:00-15:45", duration: 45, status: "completed", callType: "audio", price: 180 },
  { id: 5, type: "offline", title: "线下雅集·茶道与易理", target: { name: "热卜学院·上海中心", avatar: "" }, date: "2024-12-10", time: "14:00-17:00", location: "上海市静安区南京西路1788号", status: "cancelled", price: 0, cancelReason: "个人原因取消" },
]

const tabs = [
  { id: "all", label: "全部" },
  { id: "call", label: "连麦咨询" },
  { id: "offline", label: "线下课程" },
  { id: "schedule", label: "讲师排期" },
]

const activeTab = ref("all")
const showCancelModal = ref(false)
const selectedReservation = ref<number | null>(null)

const filteredReservations = computed(() => {
  if (activeTab.value === "all") return reservationsData
  return reservationsData.filter(r => r.type === activeTab.value)
})

function getTypeIcon(type: string) {
  switch (type) {
    case 'call': return '📞'
    case 'offline': return '🎓'
    case 'schedule': return ''
    default: return ''
  }
}

function handleCancel(id: number) {
  selectedReservation.value = id
  showCancelModal.value = true
}

function confirmCancel() {
  showCancelModal.value = false
  selectedReservation.value = null
  uni.showToast({ title: '已取消预约', icon: 'success' })
}

function navigateTo(url: string) {
  uni.navigateTo({ url })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
