<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">设置</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="p-4 pb-24 space-y-4">
      <!-- 账号与安全 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">账号与安全</text>
        </view>
        <view class="divide-y divide-border">
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="goPage('phone')">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground"></text>
              </view>
              <text class="text-sm text-foreground">手机号</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">138****8888</text>
              <text class="text-sm text-muted-foreground">›</text>
            </view>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="goPage('password')">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground"></text>
              </view>
              <text class="text-sm text-foreground">登录密码</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">修改</text>
              <text class="text-sm text-muted-foreground">›</text>
            </view>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">🛡️</text>
              </view>
              <text class="text-sm text-foreground">二次验证</text>
            </view>
            <view :class="['w-11 h-6 rounded-full relative transition-colors duration-200', twoFactorEnabled ? 'bg-primary' : 'bg-[#E8E0D5]']" @click="twoFactorEnabled = !twoFactorEnabled">
              <view :class="['w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-transform', twoFactorEnabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5']" />
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私设置 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">隐私设置</text>
        </view>
        <view class="divide-y divide-border">
          <view class="flex items-center justify-between px-4 py-3.5">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">️</text>
              </view>
              <text class="text-sm text-foreground">公开展示我的收藏</text>
            </view>
            <view :class="['w-11 h-6 rounded-full relative transition-colors', showFavorites ? 'bg-primary' : 'bg-[#E8E0D5]']" @click="showFavorites = !showFavorites">
              <view :class="['w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-transform', showFavorites ? 'translate-x-[1.375rem]' : 'translate-x-0.5']" />
            </view>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">🕐</text>
              </view>
              <text class="text-sm text-foreground">记录浏览历史</text>
            </view>
            <view :class="['w-11 h-6 rounded-full relative transition-colors', recordHistory ? 'bg-primary' : 'bg-[#E8E0D5]']" @click="recordHistory = !recordHistory">
              <view :class="['w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-transform', recordHistory ? 'translate-x-[1.375rem]' : 'translate-x-0.5']" />
            </view>
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">通知设置</text>
        </view>
        <view class="divide-y divide-border">
          <view class="flex items-center justify-between px-4 py-3.5">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground"></text>
              </view>
              <text class="text-sm text-foreground">推送通知</text>
            </view>
            <view :class="['w-11 h-6 rounded-full relative transition-colors', pushEnabled ? 'bg-primary' : 'bg-[#E8E0D5]']" @click="pushEnabled = !pushEnabled">
              <view :class="['w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-transform', pushEnabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5']" />
            </view>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="showSelectModal('消息免打扰时段', ['关闭', '22:00-08:00', '23:00-07:00', '00:00-08:00'], quietHours, (v) => quietHours = v)">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground"></text>
              </view>
              <text class="text-sm text-foreground">消息免打扰时段</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">{{ quietHours }}</text>
              <text class="text-sm text-muted-foreground">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 外观主题 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">外观主题</text>
        </view>
        <view class="px-4 py-3.5">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground"></text>
              </view>
              <text class="text-sm text-foreground">主题模式</text>
            </view>
            <view class="flex items-center gap-2">
              <view v-for="theme in themeOptions" :key="theme.value"
                class="px-3 py-1 rounded-full text-xs"
                :class="currentTheme === theme.value ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground'"
                @click="currentTheme = theme.value">
                <text>{{ theme.label }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 通用设置 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">通用设置</text>
        </view>
        <view class="divide-y divide-border">
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="showSelectModal('默认阅读背景', ['宣纸色', '护眼黄', '夜间黑', '纯白'], readingBg, (v) => readingBg = v)">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">️</text>
              </view>
              <text class="text-sm text-foreground">默认阅读背景</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">{{ readingBg }}</text>
              <text class="text-sm text-muted-foreground">›</text>
            </view>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="showSelectModal('字体大小', ['小', '中', '大'], fontSize, (v) => fontSize = v)">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">Aa</text>
              </view>
              <text class="text-sm text-foreground">字体大小</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">{{ fontSize }}</text>
              <text class="text-sm text-muted-foreground">›</text>
            </view>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="showSelectModal('视频自动播放', ['仅Wi-Fi', '始终', '关闭'], autoPlay, (v) => autoPlay = v)">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">📶</text>
              </view>
              <text class="text-sm text-foreground">视频自动播放</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-sm text-muted-foreground">{{ autoPlay }}</text>
              <text class="text-sm text-muted-foreground">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 缓存管理 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">缓存管理</text>
        </view>
        <view class="flex items-center justify-between px-4 py-3.5">
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
              <text class="text-sm text-muted-foreground">🗑️</text>
            </view>
            <view>
              <text class="text-sm text-foreground block">缓存数据</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ isClearing ? '清理中...' : cacheSize }}</text>
            </view>
          </view>
          <view :class="['px-3 py-1.5 text-xs font-medium rounded-lg', isClearing ? 'bg-[#F2EFEA] text-muted-foreground' : 'bg-primary/10 text-primary']" @click="handleClearCache">
            <text>{{ isClearing ? '清理中' : '清理缓存' }}</text>
          </view>
        </view>
      </view>

      <!-- 关于我们 -->
      <view class="bg-white rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">关于我们</text>
        </view>
        <view class="divide-y divide-border">
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="goPage('agreement')">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground"></text>
              </view>
              <text class="text-sm text-foreground">用户协议</text>
            </view>
            <text class="text-sm text-muted-foreground">›</text>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5 active:bg-[#F2EFEA] transition-colors duration-150" @click="goPage('privacy')">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">🛡️</text>
              </view>
              <text class="text-sm text-foreground">隐私政策</text>
            </view>
            <text class="text-sm text-muted-foreground">›</text>
          </view>
          <view class="flex items-center justify-between px-4 py-3.5">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 rounded-lg bg-[#F2EFEA] flex items-center justify-center">
                <text class="text-sm text-muted-foreground">ℹ️</text>
              </view>
              <text class="text-sm text-foreground">版本号</text>
            </view>
            <text class="text-sm text-muted-foreground">v1.0.0</text>
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="w-full py-3.5 text-center text-primary font-medium bg-white rounded-xl" @click="showLogoutConfirm = true">
        <text>退出登录</text>
      </view>
    </view>

    <!-- 选择弹窗 -->
    <view v-if="selectModal" class="fixed inset-0 z-50 flex items-end justify-center">
      <view class="fixed inset-0 bg-black/60" @click="selectModal = null" />
      <view class="slide-up relative w-full max-w-lg bg-white rounded-t-2xl overflow-hidden" style="padding-bottom: env(safe-area-inset-bottom)">
        <view class="px-4 py-4 border-b border-border">
          <text class="font-semibold text-center text-foreground block">{{ selectModal.title }}</text>
        </view>
        <view class="py-2">
          <view v-for="option in selectModal.options" :key="option" :class="['w-full px-4 py-3.5 text-left text-sm flex items-center justify-between', option === selectModal.current ? 'text-primary bg-primary/5' : 'text-foreground']" @click="handleSelect(option)">
            <text>{{ option }}</text>
            <text v-if="option === selectModal.current" class="text-primary">✓</text>
          </view>
        </view>
        <view class="p-4 border-t border-border">
          <view class="w-full py-3 text-center text-muted-foreground bg-[#F2EFEA] rounded-xl" @click="selectModal = null">取消</view>
        </view>
      </view>
    </view>

    <!-- 退出确认弹窗 -->
    <view v-if="showLogoutConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <view class="fixed inset-0 bg-black/60" @click="showLogoutConfirm = false" />
      <view class="zoom-in relative w-full max-w-sm bg-white rounded-2xl overflow-hidden">
        <view class="p-6 text-center">
          <text class="font-semibold text-lg text-foreground block">确认退出登录？</text>
          <text class="text-sm text-muted-foreground mt-2 block">退出后将需要重新登录才能使用完整功能</text>
        </view>
        <view class="flex border-t border-border">
          <view class="flex-1 py-3.5 text-center text-foreground font-medium border-r border-border" @click="showLogoutConfirm = false">取消</view>
          <view class="flex-1 py-3.5 text-center text-primary font-medium" @click="handleLogout">确认退出</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 账号安全
const twoFactorEnabled = ref(false)

// 隐私设置
const showFavorites = ref(true)
const recordHistory = ref(true)

// 通知设置
const pushEnabled = ref(true)
const quietHours = ref('22:00-08:00')

// 通用设置
const readingBg = ref('宣纸色')
const fontSize = ref('中')
const autoPlay = ref('仅Wi-Fi')

// 缓存
const cacheSize = ref('128.5MB')
const isClearing = ref(false)

// 弹窗状态
const currentTheme = ref('light')
const themeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]
const showLogoutConfirm = ref(false)
const selectModal = ref<{ title: string; options: string[]; current: string; onSelect: (value: string) => void } | null>(null)

function showSelectModal(title: string, options: string[], current: string, onSelect: (value: string) => void) {
  selectModal.value = { title, options, current, onSelect }
}

function handleSelect(option: string) {
  if (selectModal.value) {
    selectModal.value.onSelect(option)
    selectModal.value = null
  }
}

function handleClearCache() {
  if (isClearing.value) return
  isClearing.value = true
  setTimeout(() => { isClearing.value = false }, 1500)
}

function handleLogout() {
  showLogoutConfirm.value = false
  uni.showToast({ title: '已退出登录', icon: 'success' })
  setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000)
}

function goPage(page: string) {
  const routes: Record<string, string> = {
    phone: '/pages/settings/phone/index',
    password: '/pages/settings/password/index',
    agreement: '/pages/common/agreement/index',
    privacy: '/pages/common/privacy/index',
  }
  uni.navigateTo({ url: routes[page] || '' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes zoom-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.slide-up { animation: slide-up 0.3s ease-out; }
.zoom-in { animation: zoom-in 0.2s ease-out; }
</style>
