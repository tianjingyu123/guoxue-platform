<template>
  <view class="min-h-screen bg-background">
    <header class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-lg text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground flex-1">诗词集锦</text>
      <text class="text-xs text-muted-foreground">{{ items.length }} 首</text>
    </header>

    <view class="px-4 pt-4 pb-20">
      <!-- 搜索框 -->
      <view class="relative mb-4">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
        <input
          v-model="search"
          placeholder="搜索诗词"
          class="w-full pl-9 py-2.5 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </view>

      <!-- 空状态 -->
      <view v-if="filtered.length === 0" class="text-center py-16 text-muted-foreground text-sm">
        <text>暂无收藏</text>
      </view>

      <!-- 列表 -->
      <view v-else class="space-y-3">
        <view v-for="poem in filtered" :key="poem.id" class="p-4 bg-white border border-border rounded-xl">
          <view class="flex items-start justify-between gap-3 mb-3">
            <view>
              <view class="flex items-center gap-2 mb-0.5">
                <text class="text-sm font-semibold text-foreground">{{ poem.title }}</text>
                <text :class="catColors[poem.category] || 'text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground'">
                  {{ poem.category }}
                </text>
              </view>
              <view class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <view class="w-4 h-4 rounded-full bg-gradient-to-br from-[#999] to-[#666] flex items-center justify-center text-white text-[8px]">
                  <text>{{ poem.author[0] }}</text>
                </view>
                <text>{{ poem.author }} · {{ poem.dynasty }}</text>
              </view>
            </view>
            <view @click="toggleLike(poem.id)" :class="poem.liked ? 'flex items-center gap-0.5 text-xs text-red-500' : 'flex items-center gap-0.5 text-xs text-muted-foreground'">
              <text :class="poem.liked ? 'text-base' : 'text-base'">{{ poem.liked ? '' : '🤍' }}</text>
              <text>{{ poem.likes }}</text>
            </view>
          </view>
          <text class="text-sm text-foreground italic leading-relaxed block border-l-2 border-primary/40 pl-3">{{ poem.excerpt }}</text>
          <text class="text-[10px] text-muted-foreground block mt-2">收藏于 {{ poem.collectedAt }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface PoetryItem {
  id: string
  title: string
  author: string
  dynasty: string
  excerpt: string
  category: string
  likes: number
  liked: boolean
  collectedAt: string
}

const collections = ref<PoetryItem[]>([
  { id: '1', title: '乾卦·象辞', author: '文王', dynasty: '西周', excerpt: '天行健，君子以自强不息。', category: '易经', likes: 8640, liked: true, collectedAt: '2024-01-20' },
  { id: '2', title: '测字诗', author: '邵雍', dynasty: '宋', excerpt: '一阴一阳之谓道，继之者善也，成之者性也。', category: '易理', likes: 5280, liked: true, collectedAt: '2024-01-18' },
  { id: '3', title: '清平乐·命理感怀', author: '陈抟', dynasty: '五代', excerpt: '无极生太极，太极动而生阳，静而生阴…', category: '道学', likes: 3960, liked: false, collectedAt: '2024-01-15' },
  { id: '4', title: '堪舆赋', author: '郭璞', dynasty: '晋', excerpt: '气乘风则散，界水则止。古人聚之使不散，行之使有止，故谓之风水。', category: '风水', likes: 2840, liked: true, collectedAt: '2024-01-12' },
  { id: '5', title: '八字论命赋', author: '徐子平', dynasty: '宋', excerpt: '五行者，金木水火土是也，各有生克制化之理。', category: '八字', likes: 2160, liked: false, collectedAt: '2024-01-10' },
])

const items = ref(collections.value)
const search = ref('')

const catColors: Record<string, string> = {
  '易经': 'text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700',
  '易理': 'text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700',
  '道学': 'text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700',
  '风水': 'text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700',
  '八字': 'text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700',
}

const filtered = computed(() =>
  items.value.filter(p => p.title.includes(search.value) || p.author.includes(search.value) || p.category.includes(search.value))
)

function toggleLike(id: string) {
  items.value = items.value.map(p =>
    p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
  )
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
