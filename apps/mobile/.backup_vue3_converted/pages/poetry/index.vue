<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50 bg-background/95 border-b border-border" style="backdrop-filter: blur(12px)">
      <view class="flex items-center gap-3 px-4 h-14">
        <view class="p-1.5 -ml-1.5 rounded-lg" @click="goBack">
          <text class="text-xl">←</text>
        </view>
        <!-- 搜索框 -->
        <view class="flex-1 relative">
          <input v-model="searchQuery" placeholder="搜索诗词、诗人..." class="w-full pl-9 pr-4 h-9 bg-secondary border-0 rounded-full text-sm" style="outline: none" />
        </view>
        <view class="p-1.5 shrink-0" @click="handleRandom">
          <text>🔀</text>
        </view>
      </view>
    </header>

    <main class="px-4 py-5 space-y-6">
      <!-- 每日一诗 -->
      <section>
        <view class="flex items-center gap-2 mb-3">
          <text class="text-sm text-primary"></text>
          <text class="text-sm font-medium">每日一诗</text>
        </view>

        <view class="bg-card border border-border p-5 relative overflow-hidden rounded-xl" style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)">
          <view class="relative">
            <!-- 标题和作者 -->
            <view class="flex items-start justify-between mb-4">
              <view>
                <text class="text-xl font-bold mb-1 block" style="font-family: serif" @click="goToPoem(todayPoem.id)">{{ todayPoem.title }}</text>
                <text class="text-muted-foreground text-sm">〔{{ todayPoem.dynasty }}〕{{ todayPoem.author }}</text>
              </view>
              <view class="p-1.5 text-primary">
                <text></text>
              </view>
            </view>

            <!-- 诗词内容 - 竖排 -->
            <view class="flex justify-center py-4">
              <view class="text-lg leading-loose tracking-wider" style="font-family: serif; height: 9rem; writing-mode: vertical-rl">
                <text v-for="(line, i) in todayPoem.content.split('\n')" :key="i" class="ml-4 first:ml-0">{{ line }}</text>
              </view>
            </view>

            <!-- 译文 -->
            <view class="mt-4 p-3 bg-secondary rounded-lg">
              <text class="text-xs text-muted-foreground mb-1 block">译文</text>
              <text class="text-sm leading-relaxed" style="color: rgba(44,44,44,0.8)">{{ todayPoem.translation }}</text>
            </view>

            <!-- 标签和操作 -->
            <view class="flex items-center justify-between mt-4">
              <view class="flex gap-2">
                <view v-for="tag in todayPoem.tags" :key="tag" class="px-2 py-1 bg-secondary text-muted-foreground rounded-full text-xs">{{ tag }}</view>
              </view>
              <view class="flex items-center gap-2">
                <view class="flex items-center gap-1 px-2 py-1 rounded-full" @click="isLiked = !isLiked">
                  <text class="text-sm" :class="isLiked ? 'text-primary' : 'text-muted-foreground'"></text>
                  <text class="text-xs text-muted-foreground">{{ (todayPoem.likes / 1000).toFixed(1) }}k</text>
                </view>
                <view class="p-1.5 rounded-full" @click="isBookmarked = !isBookmarked">
                  <text :class="isBookmarked ? 'text-accent' : 'text-muted-foreground'">🔖</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </section>

      <!-- 分类导航 -->
      <section>
        <view class="flex items-center justify-between mb-3">
          <text class="font-medium">分类浏览</text>
          <view class="text-xs text-muted-foreground flex items-center" @click="goToCategories">
            全部 <text>›</text>
          </view>
        </view>
        <view class="space-y-3">
          <view v-for="cat in categories" :key="cat.id" class="flex gap-2 overflow-x-auto pb-1">
            <text class="shrink-0 text-xs text-muted-foreground w-10 py-1.5">{{ cat.name }}</text>
            <view v-for="item in cat.items" :key="item" class="shrink-0 px-3 py-1.5 rounded-full text-xs bg-secondary" style="color: rgba(44,44,44,0.8)">{{ item }}</view>
          </view>
        </view>
      </section>

      <!-- 著名诗人 -->
      <section>
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-sm text-primary"></text>
            <text class="font-medium">著名诗人</text>
          </view>
          <view class="text-xs text-muted-foreground flex items-center" @click="goToPoetCollections">
            更多 <text>›</text>
          </view>
        </view>
        <view class="flex gap-3 overflow-x-auto pb-2">
          <view v-for="poet in poets" :key="poet.id" class="shrink-0 w-24" @click="goToPoet(poet.id)">
            <view class="bg-card border border-border p-3 text-center rounded-xl" style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)">
              <view class="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2" style="background: linear-gradient(135deg, rgba(196,30,58,0.2), rgba(201,169,110,0.2))">
                <text class="text-lg font-bold text-primary" style="font-family: serif">{{ poet.avatar }}</text>
              </view>
              <text class="text-sm font-medium block">{{ poet.name }}</text>
              <text class="text-[10px] text-muted-foreground mt-0.5 block">{{ poet.dynasty }} · {{ poet.poemCount }}首</text>
            </view>
          </view>
        </view>
      </section>

      <!-- 热门诗词 -->
      <section>
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-sm text-primary">📊</text>
            <text class="font-medium">热门诗词</text>
          </view>
          <view class="text-xs text-muted-foreground flex items-center" @click="goToPoemCollections">
            更多 <text>›</text>
          </view>
        </view>

        <view class="space-y-2">
          <view v-for="(poem, index) in poems" :key="poem.id" class="flex items-center gap-3 p-3 bg-card border border-border rounded-xl" style="box-shadow: 0 1px 4px rgba(0,0,0,0.06)" @click="goToPoem(poem.id)">
            <!-- 排名 -->
            <view class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" :class="index < 3 ? 'text-white' : 'bg-secondary text-muted-foreground'" :style="index < 3 ? 'background: linear-gradient(135deg, #C9A96E, #C41E3A)' : ''">
              <text>{{ index + 1 }}</text>
            </view>
            <!-- 内容 -->
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-medium text-sm">{{ poem.title }}</text>
                <text class="text-xs text-muted-foreground">〔{{ poem.dynasty }}〕{{ poem.author }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-0.5 block truncate">{{ poem.preview }}</text>
            </view>
            <!-- 点赞数 -->
            <view class="flex items-center gap-1 text-muted-foreground shrink-0">
              <text class="text-xs"></text>
              <text class="text-xs">{{ (poem.likes / 1000).toFixed(1) }}k</text>
            </view>
          </view>
        </view>
      </section>

      <!-- AI赏析入口 -->
      <section>
        <view class="rounded-xl p-4" style="background: linear-gradient(135deg, rgba(201,169,110,0.15), rgba(196,30,58,0.05)); border: 1px solid rgba(201,169,110,0.3); box-shadow: 0 1px 4px rgba(0,0,0,0.06)">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style="background: linear-gradient(135deg, #C9A96E, #C41E3A)">
              <text class="text-white text-sm"></text>
            </view>
            <view class="flex-1">
              <text class="font-medium">AI诗词赏析</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">智能解读诗词意境与典故</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </section>
    </main>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const todayPoem = {
  id: '1', title: '静夜思', author: '李白', dynasty: '唐',
  content: '床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。',
  translation: '明亮的月光洒在床前，好像地上泛起了一层霜。抬头望着天上的明月，低下头思念起远方的故乡。',
  tags: ['思乡', '月亮', '夜晚'], likes: 12800, isLiked: false, isBookmarked: false,
}

const poems = [
  { id: '2', title: '登鹳雀楼', author: '王之涣', dynasty: '唐', preview: '白日依山尽，黄河入海流...', tags: ['哲理', '风景'], likes: 8900 },
  { id: '3', title: '春晓', author: '孟浩然', dynasty: '唐', preview: '春眠不觉晓，处处闻啼鸟...', tags: ['春天', '自然'], likes: 7600 },
  { id: '4', title: '相思', author: '王维', dynasty: '唐', preview: '红豆生南国，春来发几枝...', tags: ['相思', '爱情'], likes: 9200 },
  { id: '5', title: '悯农', author: '李绅', dynasty: '唐', preview: '锄禾日当午，汗滴禾下土...', tags: ['劳动', '珍惜'], likes: 6800 },
  { id: '6', title: '江雪', author: '柳宗元', dynasty: '唐', preview: '千山鸟飞绝，万径人踪灭...', tags: ['冬天', '孤独'], likes: 5400 },
]

const poets = [
  { id: '1', name: '李白', dynasty: '唐', poemCount: 1184, avatar: '李' },
  { id: '2', name: '杜甫', dynasty: '唐', poemCount: 1455, avatar: '杜' },
  { id: '3', name: '白居易', dynasty: '唐', poemCount: 3840, avatar: '白' },
  { id: '4', name: '苏轼', dynasty: '宋', poemCount: 3459, avatar: '苏' },
  { id: '5', name: '辛弃疾', dynasty: '宋', poemCount: 629, avatar: '辛' },
]

const categories = [
  { id: 'theme', name: '主题', items: ['思乡', '爱情', '离别', '山水', '田园', '边塞'] },
  { id: 'dynasty', name: '朝代', items: ['唐', '宋', '元', '明', '清', '先秦'] },
  { id: 'form', name: '体裁', items: ['五言绝句', '七言绝句', '五言律诗', '七言律诗', '词', '曲'] },
]

const searchQuery = ref('')
const isLiked = ref(todayPoem.isLiked)
const isBookmarked = ref(todayPoem.isBookmarked)

function goBack() { uni.navigateBack() }
function handleRandom() { uni.showToast({ title: '随机一首', icon: 'none' }) }
function goToPoem(id: string) { uni.navigateTo({ url: `/pages/poetry/id-detail/index?id=${id}` }) }
function goToCategories() { /* TODO */ }
function goToPoetCollections() { /* TODO */ }
function goToPoemCollections() { /* TODO */ }
function goToPoet(id: string) { /* TODO */ }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
