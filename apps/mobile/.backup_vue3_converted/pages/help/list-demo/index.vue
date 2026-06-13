<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <view class="flex items-center justify-between h-12 px-4">
        <view class="flex items-center gap-2" @click="goBack">
          <text class="text-lg">←</text>
        </view>
        <text class="font-medium">列表组件演示</text>
        <view class="w-5" />
      </view>
    </view>

    <view class="p-4 space-y-6">
      <!-- 基础列表项 -->
      <view>
        <text class="text-sm font-medium text-muted-foreground mb-2 px-1 block">基础列表项</text>
        <view class="bg-white rounded-xl overflow-hidden">
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border" @click="goTo('/pages/profile/edit/index')">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">个人资料</text>
              <text class="text-xs text-muted-foreground">修改头像、昵称、简介</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border" @click="goTo('/pages/mine/security/index')">
            <text>🛡</text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">账号安全</text>
              <text class="text-xs text-muted-foreground">密码、手机号、登录设备</text>
            </view>
            <view class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <text class="text-white text-[10px]">2</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border" @click="goTo('/pages/wallet/index')">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">我的钱包</text>
            </view>
            <text class="text-sm text-primary font-medium">¥1,280.00</text>
            <text class="text-muted-foreground">›</text>
          </view>
          <view class="flex items-center gap-3 px-4 py-3" @click="goTo('/pages/help/index')">
            <text>❓</text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">帮助中心</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>

      <!-- 开关型列表项 -->
      <view>
        <text class="text-sm font-medium text-muted-foreground mb-2 px-1 block">开关型列表项</text>
        <view class="bg-white rounded-xl overflow-hidden">
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">消息通知</text>
              <text class="text-xs text-muted-foreground">接收系统通知和互动消息</text>
            </view>
            <switch :checked="notifications" @change="notifications = !notifications" color="#C41E3A" />
          </view>
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">深色模式</text>
            </view>
            <switch :checked="darkMode" @change="darkMode = !darkMode" color="#C41E3A" />
          </view>
          <view class="flex items-center gap-3 px-4 py-3">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">声音</text>
              <text class="text-xs text-muted-foreground">播放提示音效</text>
            </view>
            <switch :checked="sound" @change="sound = !sound" color="#C41E3A" />
          </view>
        </view>
      </view>

      <!-- 选择型列表项 -->
      <view>
        <text class="text-sm font-medium text-muted-foreground mb-2 px-1 block">选择型列表项</text>
        <view class="bg-white rounded-xl overflow-hidden">
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border" @click="showPicker = true">
            <text>🌐</text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">语言</text>
            </view>
            <text class="text-sm text-muted-foreground">简体中文</text>
            <text class="text-muted-foreground">›</text>
          </view>
          <view class="flex items-center gap-3 px-4 py-3" @click="showPicker = true">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">隐私设置</text>
            </view>
            <text class="text-sm text-muted-foreground">请选择</text>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>

      <!-- 分组列表 -->
      <view>
        <text class="text-sm font-medium text-muted-foreground mb-2 px-1 block">分组列表</text>
        <view class="bg-white rounded-xl overflow-hidden">
          <view class="px-4 py-2 text-xs text-muted-foreground bg-[#F2EFEA]/50">消息设置</view>
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">评论通知</text>
            </view>
            <switch :checked="true" color="#C41E3A" />
          </view>
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">点赞通知</text>
            </view>
            <switch :checked="true" color="#C41E3A" />
          </view>
          <view class="px-4 py-2 text-xs text-muted-foreground bg-[#F2EFEA]/50">隐私设置</view>
          <view class="flex items-center gap-3 px-4 py-3">
            <text></text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">显示在线状态</text>
            </view>
            <switch :checked="false" color="#C41E3A" />
          </view>
        </view>
      </view>

      <!-- 不同尺寸 -->
      <view>
        <text class="text-sm font-medium text-muted-foreground mb-2 px-1 block">不同尺寸</text>
        <view class="bg-white rounded-xl overflow-hidden">
          <view class="flex items-center gap-3 px-4 py-2 border-b border-border">
            <text class="text-sm">ℹ️</text>
            <view class="flex-1 min-w-0">
              <text class="text-xs text-foreground block">小尺寸列表项</text>
              <text class="text-[10px] text-muted-foreground">适合紧凑布局</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
          <view class="flex items-center gap-3 px-4 py-3 border-b border-border">
            <text>ℹ️</text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">中等尺寸列表项</text>
              <text class="text-xs text-muted-foreground">默认尺寸，适合大多数场景</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
          <view class="flex items-center gap-3 px-4 py-4">
            <text class="text-lg">ℹ️</text>
            <view class="flex-1 min-w-0">
              <text class="text-base text-foreground block">大尺寸列表项</text>
              <text class="text-sm text-muted-foreground">适合重要入口或强调展示</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>

      <!-- 危险操作 -->
      <view>
        <text class="text-sm font-medium text-muted-foreground mb-2 px-1 block">危险操作</text>
        <view class="bg-white rounded-xl overflow-hidden">
          <view class="flex items-center gap-3 px-4 py-3 text-red-500" @click="handleLogout">
            <text>🚪</text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-red-500 block">退出登录</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

const notifications = ref(true)
const darkMode = ref(false)
const sound = ref(true)
const showPicker = ref(false)

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success(res: any) {
      if (res.confirm) {
        uni.showToast({ title: '已退出登录', icon: 'none' })
      }
    }
  })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
