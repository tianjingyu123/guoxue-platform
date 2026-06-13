<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border flex items-center px-4 h-12 gap-3">
      <view class="p-1 -ml-1" @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">绑定账号</text>
      <text class="ml-auto text-xs text-muted-foreground">{{ boundCount }} / {{ accounts.length }} 已绑定</text>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="px-4 pt-4 animate-pulse">
      <view class="h-4 bg-[#E8E0D5] rounded w-3/4 mb-4" />
      <view v-for="i in 6" :key="i" class="flex items-center gap-4 bg-white rounded-xl p-4 mb-3 border border-border">
        <view class="w-10 h-10 rounded-full bg-[#E8E0D5]" />
        <view class="flex-1">
          <view class="h-4 bg-[#E8E0D5] rounded w-1/4 mb-1" />
          <view class="h-3 bg-[#E8E0D5] rounded w-1/6" />
        </view>
        <view class="h-7 w-14 bg-[#E8E0D5] rounded-lg" />
      </view>
    </view>

    <view v-else class="px-4 pt-6 pb-20">
      <!-- 提示 -->
      <view class="flex items-start gap-2.5 mb-4 px-1">
        <text class="text-base text-accent shrink-0 mt-0.5"></text>
        <view>
          <text class="text-xs text-muted-foreground leading-relaxed">绑定多个账号后可用任意方式登录，至少保留一种绑定方式。解绑前请确保有其他可用登录方式，以免账号无法登录。</text>
        </view>
      </view>

      <!-- 绑定进度 -->
      <view class="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-border">
        <view class="flex items-center justify-between mb-2">
          <text class="text-sm font-medium text-foreground">账号安全等级</text>
          <text :class="'text-xs font-medium '+(boundCount >= 4 ? 'text-green-500' : boundCount >= 2 ? 'text-accent' : 'text-muted-foreground')">
            {{ boundCount >= 4 ? '安全' : boundCount >= 2 ? '一般' : '较低' }}
          </text>
        </view>
        <view class="h-2 bg-secondary rounded-full overflow-hidden">
          <view class="h-full rounded-full transition-all duration-500" :class="boundCount >= 4 ? 'bg-green-500' : boundCount >= 2 ? 'bg-accent' : 'bg-primary'" :style="{width: (boundCount/accounts.length*100)+'%'}" />
        </view>
        <text class="text-[10px] text-muted-foreground block mt-1.5">已绑定 {{ boundCount }} 种，绑定 {{ accounts.length }} 种以上更安全</text>
      </view>

      <!-- 账号列表 -->
      <view v-for="acc in accounts" :key="acc.type" class="flex items-center gap-4 p-4 bg-white rounded-2xl mb-3 border border-border transition-all active:bg-background">
        <view :class="acc.status === 'bound' ? 'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10' : 'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-[#F2EFEA]'">
          <text :class="acc.status === 'bound' ? 'text-primary' : 'text-muted-foreground'" class="text-xl">{{ acc.icon }}</text>
        </view>
        <view class="flex-1 min-w-0">
          <view class="flex items-center gap-2">
            <text class="text-sm font-medium text-foreground">{{ acc.label }}</text>
            <text v-if="acc.status === 'bound'" class="text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">✓ 已绑定</text>
            <text v-else class="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">未绑定</text>
          </view>
          <text class="text-xs text-muted-foreground block mt-0.5">{{ acc.status === 'bound' ? (acc.value ?? '已绑定，可用于登录') : '绑定后可快捷登录' }}</text>
        </view>
        <view v-if="acc.status === 'bound'" @click="showUnbindConfirm(acc)" class="px-4 py-1.5 rounded-xl border border-border text-xs text-muted-foreground active:bg-background">
          <text>解绑</text>
        </view>
        <view v-else @click="handleBind(acc.type)" class="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-medium active:bg-[#B01A31]">
          <text>绑定 ›</text>
        </view>
      </view>

      <!-- 安全提示 -->
      <view class="bg-accent/10 rounded-2xl p-4 mt-4">
        <view class="flex items-start gap-2">
          <text class="text-base text-accent shrink-0 mt-0.5"></text>
          <view>
            <text class="text-xs font-medium text-accent block mb-1">安全提示</text>
            <text class="text-[11px] text-ink-soft leading-relaxed">绑定账号后，您可以使用任一绑定方式快捷登录。我们严格保护您的账号信息安全，不会将您的账号信息用于其他用途。建议定期检查绑定状态，确保账号安全。</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 解绑确认弹窗 -->
    <view v-if="unbindTarget" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" @click="cancelUnbind">
      <view class="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl" @click.stop>
        <view class="px-6 pt-6 pb-2 text-center">
          <view class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <text class="text-3xl"></text>
          </view>
          <text class="text-base font-bold text-foreground block mb-1">确认解绑</text>
          <text class="text-xs text-muted-foreground block">确定要解绑「{{ unbindTarget.label }}」吗？</text>
          <text class="text-[10px] text-primary block mt-2 bg-primary/5 px-3 py-1.5 rounded-lg">解绑后无法使用此方式登录</text>
        </view>
        <view class="flex border-t border-border mt-4">
          <view class="flex-1 h-12 flex items-center justify-center text-sm text-muted-foreground bg-background active:bg-secondary" @click="cancelUnbind">取消</view>
          <view class="flex-1 h-12 flex items-center justify-center text-sm text-white bg-primary active:bg-[#B01A31]" @click="confirmUnbind">确认解绑</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(true)

type BindStatus = 'bound' | 'unbound'

interface Account {
  type: 'phone' | 'email' | 'wechat' | 'qq' | 'weibo' | 'apple'
  label: string
  icon: string
  status: BindStatus
  value?: string
}

const accounts = ref<Account[]>([
  { type: 'wechat', label: '微信', icon: '💚', status: 'bound', value: '微***信' },
  { type: 'phone', label: '手机号', icon: '', status: 'bound', value: '138****8888' },
  { type: 'email', label: '邮箱', icon: '📧', status: 'unbound' },
  { type: 'qq', label: 'QQ', icon: '🐧', status: 'bound', value: '12****45' },
  { type: 'weibo', label: '微博', icon: '', status: 'unbound' },
  { type: 'apple', label: 'Apple ID', icon: '🍎', status: 'unbound' },
])

const boundCount = computed(() => accounts.value.filter(a => a.status === 'bound').length)
const unbindTarget = ref<Account | null>(null)

setTimeout(() => { loading.value = false }, 500)

function handleBind(type: Account['type']) {
  accounts.value = accounts.value.map(a =>
    a.type === type
      ? { ...a, status: 'bound' as BindStatus, value: type === 'email' ? 'user@example.com' : '已绑定' }
      : a
  )
  uni.showToast({ title: '绑定成功', icon: 'success' })
}

function showUnbindConfirm(acc: Account) {
  const bound = accounts.value.filter(a => a.status === 'bound')
  if (bound.length <= 1) {
    uni.showToast({ title: '至少保留一种绑定方式', icon: 'none' })
    return
  }
  unbindTarget.value = acc
}

function cancelUnbind() {
  unbindTarget.value = null
}

function confirmUnbind() {
  if (unbindTarget.value) {
    accounts.value = accounts.value.map(a =>
      a.type === unbindTarget.value?.type ? { ...a, status: 'unbound' as BindStatus, value: undefined } : a
    )
    uni.showToast({ title: '已解绑', icon: 'success' })
  }
  unbindTarget.value = null
}

function goBack() {
  uni.navigateBack()
}
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
