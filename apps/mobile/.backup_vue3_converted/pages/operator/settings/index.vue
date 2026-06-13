<template>
  <view class="min-h-screen bg-background">
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">运营商设置</text>
    </view>

    <view class="px-4 pt-4 pb-24 space-y-6">
      <!-- Profile -->
      <view>
        <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1 block">基本信息</text>
        <view class="bg-white border border-border rounded-xl p-4 space-y-3">
          <view v-for="f in profileFields" :key="f.key" class="space-y-1">
            <text class="text-xs text-muted-foreground block">{{ f.label }}</text>
            <input :value="profile[f.key as keyof typeof profile]" @input="(e: any) => profile[f.key as keyof typeof profile] = e.detail.value" class="w-full h-9 px-3 bg-muted rounded-lg text-sm" />
          </view>
          <view @click="handleSave" hover-class="press-opacity-90" :class="['w-full mt-2 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2', saved ? 'bg-green-500' : 'bg-primary', saving ? 'opacity-50' : '']" :style="saving ? 'pointer-events:none' : ''">
            <view v-if="saving" class="w-4 h-4 rounded-full border-2 border-white border-t-transparent" style="animation: spin 0.8s linear infinite;" />
            <text>{{ saving ? '保存中...' : saved ? '保存成功' : '保存修改' }}</text>
          </view>
        </view>
      </view>

      <!-- Notifications -->
      <view>
        <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1 block">消息通知</text>
        <view class="bg-white border border-border rounded-xl divide-y divide-border">
          <view v-for="n in notificationItems" :key="n.key" class="flex items-center justify-between px-4 py-3">
            <text class="text-sm text-foreground">{{ n.label }}</text>
            <view @click="toggleNotification(n.key)" class="w-11 h-6 rounded-full relative transition-colors" :style="{ backgroundColor: notifications[n.key as keyof typeof notifications] ? '#C41E3A' : '#F0EBE5' }">
              <view class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" :style="{ left: notifications[n.key as keyof typeof notifications] ? '22px' : '2px' }" />
            </view>
          </view>
        </view>
      </view>

      <!-- Account -->
      <view>
        <text class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1 block">账号安全</text>
        <view class="bg-white border border-border rounded-xl divide-y divide-border">
          <view v-for="item in accountItems" :key="item.label" class="flex items-center gap-3 px-4 py-3" hover-class="press-opacity-60">
            <text>{{ item.icon }}</text>
            <text class="text-sm text-foreground flex-1">{{ item.label }}</text>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>

      <!-- Logout -->
      <view>
        <view class="bg-white border border-red-300/30 rounded-xl">
          <view class="flex items-center gap-3 px-4 py-3" hover-class="press-opacity-60">
            <text class="text-red-500">🚪</text>
            <text class="text-sm text-red-500 font-medium">退出登录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const profile = reactive({
  name: '运营商张总',
  phone: '138****8888',
  email: 'zhang@example.com',
  company: '儒布文化传播有限公司',
})

const profileFields = [
  { key: 'name', label: '运营商名称' },
  { key: 'phone', label: '联系手机' },
  { key: 'email', label: '邮箱地址' },
  { key: 'company', label: '公司名称' },
]

const notifications = reactive({ revenue: true, station: true, system: false })
const notificationItems = [
  { key: 'revenue', label: '收益到账通知' },
  { key: 'station', label: '站长动态通知' },
  { key: 'system', label: '系统公告通知' },
]

const accountItems = [
  { icon: '🛡️', label: '修改密码' },
  { icon: '', label: '绑定银行卡' },
  { icon: '', label: '运营协议' },
]

const saving = ref(false)
const saved = ref(false)

async function handleSave() {
  saving.value = true
  await new Promise(r => setTimeout(r, 800))
  saving.value = false
  saved.value = true
  setTimeout(() => saved.value = false, 2000)
}

function toggleNotification(key: string) {
  (notifications as any)[key] = !(notifications as any)[key]
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.press-opacity-90:active { opacity: 0.9; }
.press-opacity-60:active { opacity: 0.6; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
