<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 flex items-center justify-between px-4 h-11 bg-white border-b border-border">
      <view class="p-1" @click="goBack">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="font-medium text-foreground">分享海报</text>
      <view class="w-6" />
    </view>

    <!-- 海报预览 -->
    <view class="px-4 py-4">
      <view
        class="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl"
        :style="{ background: selectedTemplate.gradient }"
      >
        <!-- 装饰图案 -->
        <view class="absolute inset-0 opacity-10">
          <view
            class="absolute top-0 right-0 w-40 h-40 rounded-full"
            style="background-color:rgba(255,255,255,0.2);transform:translate(50%,-50%)"
          />
          <view
            class="absolute bottom-0 left-0 w-60 h-60 rounded-full"
            style="background-color:rgba(255,255,255,0.1);transform:translate(-50%,50%)"
          />
        </view>

        <!-- 内容区域 -->
        <view class="relative h-full flex flex-col p-6">
          <!-- 顶部 Logo -->
          <view class="flex items-center gap-2 mb-8">
            <view
              class="w-8 h-8 rounded-lg flex items-center justify-center"
              :style="{ backgroundColor: station.themeColor }"
            >
              <text class="text-white text-sm font-bold">{{ station.name.charAt(0) }}</text>
            </view>
            <text class="text-sm font-medium" :style="{ color: selectedTemplate.textColor }">热卜国学</text>
          </view>

          <!-- 主内容 -->
          <view class="flex-1 flex flex-col items-center justify-center text-center">
            <!-- 站长头像 -->
            <view
              class="w-24 h-24 rounded-full border-4 overflow-hidden mb-4"
              style="border-color:rgba(255,255,255,0.3)"
              :style="{ backgroundColor: station.themeColor }"
            >
              <view class="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                <text>{{ station.masterName.charAt(0) }}</text>
              </view>
            </view>

            <!-- 分站名称 -->
            <text class="text-2xl font-bold mb-2 block" :style="{ color: selectedTemplate.textColor }">
              {{ station.name }}
            </text>
            <text class="text-sm block mb-6" :style="{ color: selectedTemplate.textColor, opacity: 0.8 }">
              {{ station.masterName }} · 诚邀您加入
            </text>

            <!-- 数据展示 -->
            <view class="flex items-center gap-6 mb-8">
              <view class="text-center">
                <text class="text-2xl font-bold block" :style="{ color: selectedTemplate.accentColor }">
                  {{ station.memberCount }}
                </text>
                <text class="text-xs block" :style="{ color: selectedTemplate.textColor, opacity: 0.7 }">成员</text>
              </view>
              <view class="w-px h-8" style="background-color:rgba(255,255,255,0.2)" />
              <view class="text-center">
                <text class="text-2xl font-bold block" :style="{ color: selectedTemplate.accentColor }">
                  {{ station.contentCount }}
                </text>
                <text class="text-xs block" :style="{ color: selectedTemplate.textColor, opacity: 0.7 }">精选</text>
              </view>
            </view>

            <!-- 站长简介 -->
            <text
              class="text-sm block max-w-[200px]"
              :style="{ color: selectedTemplate.textColor, opacity: 0.7 }"
            >
              {{ station.masterIntro }}
            </text>
          </view>

          <!-- 底部二维码 -->
          <view class="flex flex-col items-center">
            <view class="w-24 h-24 bg-white rounded-xl p-2 mb-3">
              <view class="w-full h-full flex items-center justify-center rounded-lg" style="background-color:#F1EDE8">
                <text class="text-4xl text-muted-foreground"></text>
              </view>
            </view>
            <text class="text-xs block" :style="{ color: selectedTemplate.textColor, opacity: 0.7 }">
              扫码加入{{ station.name }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 模板选择 -->
    <view class="px-4 mb-4">
      <text class="text-sm font-medium text-foreground block mb-3">选择风格</text>
      <view class="flex gap-3">
        <view
          v-for="template in posterTemplates"
          :key="template.id"
          class="flex-1 aspect-[3/4] rounded-xl overflow-hidden transition-all"
          :class="selectedTemplate.id === template.id ? 'border-2' : 'border-2 border-transparent'"
          :style="selectedTemplate.id === template.id ? `border-color:${station.themeColor};box-shadow:0 0 0 2px ${station.themeColor}33` : ''"
          @click="selectedTemplate = template"
        >
          <view class="w-full h-full flex flex-col items-center justify-center p-2" :style="{ background: template.gradient }">
            <view class="w-6 h-6 rounded-full mb-1" style="background-color:rgba(255,255,255,0.3)" />
            <view class="w-8 h-1 rounded mb-0.5" style="background-color:rgba(255,255,255,0.5)" />
            <view class="w-6 h-0.5 rounded" style="background-color:rgba(255,255,255,0.3)" />
          </view>
        </view>
      </view>
      <view class="flex gap-3 mt-2">
        <text
          v-for="template in posterTemplates"
          :key="template.id"
          class="flex-1 text-center text-xs"
          :class="selectedTemplate.id === template.id ? 'font-medium' : 'text-muted-foreground'"
          :style="selectedTemplate.id === template.id ? `color:${station.themeColor}` : ''"
        >
          {{ template.name }}
        </text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="px-4 pb-8">
      <view class="flex gap-3">
        <view
          class="flex-1 py-3 rounded-xl border border-border text-sm text-center text-foreground flex items-center justify-center gap-2"
          @click="handleSave"
        >
          <text v-if="saved"> 已保存</text>
          <text v-else-if="isSaving">⬇️ 保存中...</text>
          <text v-else>⬇️ 保存图片</text>
        </view>
        <view
          class="flex-1 py-3 rounded-xl text-sm text-center text-white flex items-center justify-center gap-2"
          :style="{ backgroundColor: station.themeColor }"
          @click="handleShare"
        >
          <text></text>
          <text>分享海报</text>
        </view>
      </view>

      <text class="text-xs text-muted-foreground text-center block mt-4">
        分享海报邀请好友，好友通过您的专属链接加入平台后将永久归属您的分站
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selectedTemplate = ref(posterTemplates[0])
const isSaving = ref(false)
const saved = ref(false)

interface PosterTemplate {
  id: string
  name: string
  gradient: string
  textColor: string
  accentColor: string
}

const posterTemplates: PosterTemplate[] = [
  { id: 'classic', name: '经典', gradient: 'linear-gradient(180deg, #2C2C2C, #2C2C2C)', textColor: '#ffffff', accentColor: '#FCD34D' },
  { id: 'elegant', name: '素雅', gradient: 'linear-gradient(180deg, #FAF8F5, #e8e4d9)', textColor: '#2C2C2C', accentColor: '#C9A96E' },
  { id: 'modern', name: '现代', gradient: 'linear-gradient(135deg, #C41E3A, #C41E3A)', textColor: '#ffffff', accentColor: '#FDE047' },
  { id: 'nature', name: '自然', gradient: 'linear-gradient(180deg, #0D9488, #22C55E)', textColor: '#ffffff', accentColor: '#BEF264' },
]

const station = {
  id: 'station-demo',
  name: '青云国学小站',
  themeColor: '#8B5CF6',
  masterName: '青云道长',
  masterAvatar: '',
  masterIntro: '从事国学研究20余年，专注八字命理与风水堪舆',
  memberCount: 3680,
  contentCount: 156,
}

function handleSave() {
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  }, 1500)
}

function handleShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
