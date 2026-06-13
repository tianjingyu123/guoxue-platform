<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">站点管理</text>
    </view>

    <!-- Tab bar -->
    <view class="flex border-b border-border bg-white sticky top-12 z-10 overflow-x-auto">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 flex-shrink-0 transition-colors"
        :class="activeTab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'"
        :style="activeTab === t.key ? 'border-color:#C41E3A;color:#C41E3A' : ''"
        @click="activeTab = t.key"
      >
        <text class="text-sm">{{ t.icon }}</text>
        <text>{{ t.label }}</text>
      </view>
    </view>

    <view class="px-4 py-5 pb-28">
      <!-- 基本信息 -->
      <view v-if="activeTab === 'basic'" class="space-y-4">
        <view v-for="f in basicFields" :key="f.key">
          <text class="text-xs font-medium text-foreground block mb-1.5">{{ f.label }}</text>
          <input
            class="w-full h-9 px-3 rounded-lg border border-border text-sm text-foreground bg-background"
            :value="basic[f.key]"
            @input="basic[f.key] = $event.detail.value"
          />
        </view>
        <view>
          <text class="text-xs font-medium text-foreground block mb-1.5">站点介绍</text>
          <textarea
            class="w-full min-h-[90px] px-3 py-2 text-sm bg-background border border-border rounded-lg"
            :value="basic.intro"
            @input="basic.intro = $event.detail.value"
          />
        </view>

        <text class="text-xs font-semibold text-foreground block pt-2">功能开关</text>
        <view class="bg-white border border-border rounded-xl">
          <view
            v-for="(f, index) in featureSwitches"
            :key="f.key"
            class="flex items-center justify-between px-4 py-3"
            :class="index < featureSwitches.length - 1 ? 'border-b border-border' : ''"
          >
            <text class="text-sm text-foreground">{{ f.label }}</text>
            <view
              class="w-11 h-6 rounded-full relative transition-colors"
              :class="features[f.key] ? 'bg-[#22C55E]' : 'bg-[#F1EDE8]'"
              :style="features[f.key] ? 'background-color:#22C55E' : ''"
              @click="features[f.key] = !features[f.key]"
            >
              <view
                class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                :class="features[f.key] ? 'right-0.5' : 'left-0.5'"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 域名功能 -->
      <view v-if="activeTab === 'domain'" class="space-y-4">
        <view>
          <text class="text-xs font-medium text-foreground block mb-1.5">自定义域名</text>
          <view class="flex gap-2">
            <input class="flex-1 h-9 px-3 rounded-lg border border-border text-sm" :value="domain.custom" @input="domain.custom = $event.detail.value" placeholder="example.com" />
            <view class="px-3 py-2 text-xs text-white rounded-lg" style="background-color:#C41E3A">
              <text>验证</text>
            </view>
          </view>
          <text class="text-xs text-muted-foreground block mt-1.5">请将 CNAME 记录指向 cname.rebu.com</text>
        </view>
        <view class="flex items-center justify-between p-3 bg-white border border-border rounded-xl">
          <view>
            <text class="text-sm text-foreground block">SSL 证书</text>
            <text class="text-xs text-muted-foreground block mt-0.5">自动签发 HTTPS 证书</text>
          </view>
          <view
            class="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
            :class="domain.ssl ? 'bg-[#22C55E]' : 'bg-[#F1EDE8]'"
            :style="domain.ssl ? 'background-color:#22C55E' : ''"
            @click="domain.ssl = !domain.ssl"
          >
            <view
              class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
              :class="domain.ssl ? 'right-0.5' : 'left-0.5'"
            />
          </view>
        </view>
        <view class="p-3 rounded-xl bg-[#F1EDE8]/50">
          <text class="text-xs font-medium text-foreground block mb-1">当前访问地址</text>
          <text class="text-xs font-mono" style="color:#C41E3A">https://rebu.com/s/station001</text>
        </view>
      </view>

      <!-- 通知设置 -->
      <view v-if="activeTab === 'notify'" class="bg-white border border-border rounded-xl">
        <view
          v-for="(n, index) in notifySettings"
          :key="n.key"
          class="flex items-center gap-3 px-4 py-3"
          :class="index < notifySettings.length - 1 ? 'border-b border-border' : ''"
        >
          <view class="flex-1">
            <text class="text-sm text-foreground block">{{ n.label }}</text>
            <text class="text-xs text-muted-foreground block mt-0.5">{{ n.desc }}</text>
          </view>
          <view
            class="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
            :class="notify[n.key] ? 'bg-[#22C55E]' : 'bg-[#F1EDE8]'"
            :style="notify[n.key] ? 'background-color:#22C55E' : ''"
            @click="notify[n.key] = !notify[n.key]"
          >
            <view
              class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
              :class="notify[n.key] ? 'right-0.5' : 'left-0.5'"
            />
          </view>
        </view>
      </view>

      <!-- 安全设置 -->
      <view v-if="activeTab === 'security'" class="space-y-3">
        <view v-for="item in securityItems" :key="item.label" class="flex items-center gap-3 px-4 py-3 bg-white border border-border rounded-xl" @click="goTo(item.path)">
          <text class="text-base" style="color:#C41E3A">🛡</text>
          <text class="text-sm text-foreground flex-1">{{ item.label }}</text>
          <text class="text-sm text-muted-foreground">›</text>
        </view>
        <view class="p-3 mt-2 rounded-xl" style="background-color:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2)">
          <text class="text-sm font-semibold block mb-1" style="color:#EF4444">危险操作</text>
          <text class="text-xs text-muted-foreground block mb-3">以下操作不可撤销，请谨慎操作</text>
          <view class="w-full py-2 rounded-lg text-xs text-center font-medium border" style="color:#EF4444;border-color:rgba(239,68,68,0.4)">
            <text>申请注销站点</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部保存按钮 -->
    <view v-if="activeTab !== 'security'" class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-4">
      <view
        class="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
        :class="saved ? '' : ''"
        :style="{ backgroundColor: saved ? '#22C55E' : '#C41E3A' }"
        @click="handleSave"
      >
        <text>{{ saving ? '保存中...' : (saved ? '保存成功' : '保存设置') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const activeTab = ref('basic')
const saving = ref(false)
const saved = ref(false)

const tabs = [
  { key: 'basic', label: '基本信息', icon: '⚙️' },
  { key: 'domain', label: '域名功能', icon: '🌐' },
  { key: 'notify', label: '通知设置', icon: '' },
  { key: 'security', label: '安全设置', icon: '🛡' },
]

const basic = reactive({
  name: '儒布命理文化站',
  slogan: '传承国学智慧，点亮人生方向',
  intro: '专注于传统命理文化传播与学习，汇聚百位名师，覆盖八字、紫微、风水等多个领域。',
  contactEmail: 'admin@station.com',
  contactPhone: '138-0000-1234',
})

const basicFields = [
  { key: 'name', label: '站点名称' },
  { key: 'slogan', label: '站点标语' },
  { key: 'contactEmail', label: '联系邮箱' },
  { key: 'contactPhone', label: '联系电话' },
]

const features = reactive({
  comment: true,
  share: true,
  community: true,
  ai: false,
  offline: true,
})

const featureSwitches = [
  { key: 'comment', label: '评论功能' },
  { key: 'share', label: '分享功能' },
  { key: 'community', label: '圈子社区' },
  { key: 'ai', label: 'AI 助手（Beta）' },
  { key: 'offline', label: '线下活动' },
]

const domain = reactive({ custom: 'minglijia.com', ssl: true })

const notify = reactive({
  newUser: true,
  newOrder: true,
  newReview: false,
  lowStock: true,
})

const notifySettings = [
  { key: 'newUser', label: '新用户注册', desc: '有新用户加入站点时通知' },
  { key: 'newOrder', label: '新订单提醒', desc: '有用户下单时通知' },
  { key: 'newReview', label: '新评价通知', desc: '有用户发表评价时通知' },
  { key: 'lowStock', label: '库存预警', desc: '商品剩余库存不足时通知' },
]

const securityItems = [
  { label: '修改登录密码', path: '/security/password' },
  { label: '绑定双重验证', path: '/security/2fa' },
  { label: '操作日志', path: '/security/logs' },
  { label: '数据备份与导出', path: '/security/backup' },
]

function handleSave() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
    uni.showToast({ title: '保存成功', icon: 'success' })
  }, 900)
}

function goBack() {
  uni.navigateBack()
}

function goTo(path: string) {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
