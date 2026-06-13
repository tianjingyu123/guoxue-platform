<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-card/95 border-b border-border safe-area-pt">
      <view class="flex items-center justify-between h-14 px-4">
        <view @tap="uni.navigateBack()"><text class="text-foreground text-xl">‹</text></view>
        <text class="font-semibold text-base text-foreground">设置</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="p-4 pb-24 space-y-4">
      <!-- 账号与安全 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">账号与安全</text>
        </view>
        <view class="divide-y divide-border">
          <SettingRow label="手机号" value="138****8888" show-arrow />
          <SettingRow label="登录密码" value="修改" show-arrow />
          <SettingRow label="二次验证" :is-switch="true" :checked="twoFactorEnabled" @change="twoFactorEnabled=$event" />
        </view>
      </view>

      <!-- 隐私设置 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">隐私设置</text>
        </view>
        <view class="divide-y divide-border">
          <SettingRow label="公开展示我的收藏" :is-switch="true" :checked="showFavorites" @change="showFavorites=$event" />
          <SettingRow label="记录浏览历史" :is-switch="true" :checked="recordHistory" @change="recordHistory=$event" />
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">通知设置</text>
        </view>
        <view class="divide-y divide-border">
          <SettingRow label="推送通知" :is-switch="true" :checked="pushEnabled" @change="pushEnabled=$event" />
          <SettingRow label="消息免打扰时段" :value="quietHours" show-arrow @tap="openSelect('消息免打扰时段', quietHoursOptions, quietHours, v => quietHours=v)" />
        </view>
      </view>

      <!-- 外观主题 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">外观主题</text>
        </view>
        <view class="px-4 py-3.5">
          <view class="flex items-center justify-between">
            <text class="text-sm text-foreground">主题模式</text>
            <view class="flex gap-2">
              <view
                v-for="theme in themes"
                :key="theme.id"
                class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                :class="currentTheme === theme.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground'"
                @tap="currentTheme = theme.id"
              >{{ theme.label }}</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 通用设置 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">通用设置</text>
        </view>
        <view class="divide-y divide-border">
          <SettingRow label="默认阅读背景" :value="readingBg" show-arrow @tap="openSelect('默认阅读背景', ['宣纸色','护眼黄','夜间黑','纯白'], readingBg, v => readingBg=v)" />
          <SettingRow label="字体大小" :value="fontSize" show-arrow @tap="openSelect('字体大小', ['小','中','大'], fontSize, v => fontSize=v)" />
          <SettingRow label="视频自动播放" :value="autoPlay" show-arrow @tap="openSelect('视频自动播放', ['仅Wi-Fi','始终','关闭'], autoPlay, v => autoPlay=v)" />
        </view>
      </view>

      <!-- 缓存管理 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">缓存管理</text>
        </view>
        <view class="flex items-center justify-between px-4 py-3.5">
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <view class="text-muted-foreground"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></view>
            </view>
            <view>
              <text class="text-sm text-foreground block">缓存数据</text>
              <text class="text-xs text-muted-foreground">{{ isClearing ? '清理中...' : cacheSize }}</text>
            </view>
          </view>
          <view
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            :class="isClearing ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'"
            @tap="clearCache"
          >{{ isClearing ? '清理中' : '清理缓存' }}</view>
        </view>
      </view>

      <!-- 关于我们 -->
      <view class="bg-card rounded-xl overflow-hidden">
        <view class="px-4 py-2.5 border-b border-border">
          <text class="text-xs text-muted-foreground font-medium">关于我们</text>
        </view>
        <view class="divide-y divide-border">
          <SettingRow label="用户协议" show-arrow @tap="goPage('/pages/legal/terms')" />
          <SettingRow label="隐私政策" show-arrow @tap="goPage('/pages/legal/privacy')" />
          <SettingRow label="版本号" value="v1.0.0" />
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="w-full py-3.5 text-center bg-card rounded-xl" @tap="showLogoutConfirm=true">
        <text class="text-primary font-medium">退出登录</text>
      </view>
    </view>

    <!-- 选择弹窗 -->
    <view v-if="selectModal" class="fixed inset-0 z-50 flex items-end justify-center">
      <view class="absolute inset-0 bg-black/60" @tap="selectModal=null" />
      <view class="relative w-full bg-card rounded-t-2xl overflow-hidden">
        <view class="px-4 py-4 border-b border-border">
          <text class="font-semibold text-center text-foreground block">{{ selectModal.title }}</text>
        </view>
        <view class="py-2">
          <view
            v-for="opt in selectModal.options"
            :key="opt"
            class="px-4 py-3.5 flex items-center justify-between text-sm transition-colors"
            :class="opt === selectModal.current ? 'text-primary bg-primary/5' : 'text-foreground'"
            @tap="selectModal.onSelect(opt); selectModal=null"
          >
            {{ opt }}
            <view v-if="opt === selectModal.current" class="text-primary"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></view>
          </view>
        </view>
        <view class="p-4 border-t border-border">
          <view class="w-full py-3 text-center bg-secondary rounded-xl" @tap="selectModal=null">
            <text class="text-muted-foreground">取消</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 退出确认弹窗 -->
    <view v-if="showLogoutConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <view class="absolute inset-0 bg-black/60" @tap="showLogoutConfirm=false" />
      <view class="relative w-full max-w-sm bg-card rounded-2xl overflow-hidden">
        <view class="p-6 text-center">
          <text class="font-semibold text-lg text-foreground block">确认退出登录？</text>
          <text class="text-sm text-muted-foreground mt-2 block">退出后将需要重新登录才能使用完整功能</text>
        </view>
        <view class="flex border-t border-border">
          <view class="flex-1 py-3.5 text-center border-r border-border" @tap="showLogoutConfirm=false">
            <text class="text-foreground font-medium">取消</text>
          </view>
          <view class="flex-1 py-3.5 text-center" @tap="logout">
            <text class="text-primary font-medium">确认退出</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 内联 SettingRow 子组件
const SettingRow = {
  props: ['label', 'value', 'showArrow', 'isSwitch', 'checked'],
  emits: ['change', 'tap'],
  template: `
    <view class="flex items-center justify-between px-4 py-3.5" @tap="$emit('tap')">
      <view class="flex items-center gap-3">
        <view class="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
          <view class="text-muted-foreground text-xs"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></view>
        </view>
        <text class="text-sm text-foreground">{{ label }}</text>
      </view>
      <view class="flex items-center gap-2">
        <template v-if="isSwitch">
          <view
            class="w-12 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer"
            :style="checked ? 'background:var(--color-primary)' : 'background:var(--color-border)'"
            @tap.stop="$emit('change', !checked)"
          >
            <view class="w-4 h-4 rounded-full bg-white shadow transition-all" :style="checked ? 'transform:translateX(24px)' : 'transform:translateX(0)'" />
          </view>
        </template>
        <template v-else>
          <text v-if="value" class="text-sm text-muted-foreground">{{ value }}</text>
          <text v-if="showArrow" class="text-muted-foreground">›</text>
        </template>
      </view>
    </view>
  `
}

const twoFactorEnabled = ref(false)
const showFavorites = ref(true)
const recordHistory = ref(true)
const pushEnabled = ref(true)
const quietHours = ref('22:00-08:00')
const quietHoursOptions = ['关闭', '22:00-08:00', '23:00-07:00', '00:00-08:00']
const currentTheme = ref('system')
const themes = [{ id: 'light', label: '浅色' }, { id: 'dark', label: '深色' }, { id: 'system', label: '跟随系统' }]
const readingBg = ref('宣纸色')
const fontSize = ref('中')
const autoPlay = ref('仅Wi-Fi')
const cacheSize = ref('128.5MB')
const isClearing = ref(false)
const showLogoutConfirm = ref(false)

const selectModal = ref<{
  title: string; options: string[]; current: string; onSelect: (v: string) => void
} | null>(null)

function openSelect(title: string, options: string[], current: string, onSelect: (v: string) => void) {
  selectModal.value = { title, options, current, onSelect }
}

function clearCache() {
  if (isClearing.value) return
  isClearing.value = true
  setTimeout(() => { isClearing.value = false; uni.showToast({ title: '缓存已清理', icon: 'success' }) }, 1500)
}

function logout() {
  showLogoutConfirm.value = false
  uni.reLaunch({ url: '/pages/login/index' })
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>
