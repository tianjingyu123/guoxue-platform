<template>
  <view class="min-h-screen bg-background">
    <!-- 导航栏 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-2 -ml-2" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold text-foreground">推广素材库</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="px-4 py-3 bg-white border-b border-border">
      <view class="relative">
        <input
          class="w-full pl-10 pr-4 py-2 rounded-lg text-sm bg-[#F1EDE8] border-none text-foreground"
          placeholder="搜索素材..."
          :value="searchKeyword"
          @input="searchKeyword = $event.detail.value"
        />
        <text class="absolute left-3 top-1/2 text-sm text-muted-foreground" style="transform:translateY(-50%)"></text>
      </view>
    </view>

    <!-- 分类Tab -->
    <view class="px-4 py-3 bg-white">
      <view class="flex bg-[#F1EDE8] rounded-lg p-1">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 text-center py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === tab.value ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'"
          @click="activeTab = tab.value"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="px-4 py-8 flex items-center justify-center">
      <view class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </view>
    <view v-else-if="error" class="px-4 py-8 text-center">
      <text class="text-muted-foreground">{{ error }}</text>
    </view>
    <view v-else>
    <!-- 内容区 -->
    <view class="px-4 py-4 space-y-6">
      <!-- 海报区 -->
      <view v-if="showSection('poster')">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-base" style="color:#C41E3A"></text>
          <text class="text-sm font-medium text-foreground">海报素材</text>
          <text class="text-xs text-muted-foreground">({{ posters.length }})</text>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="poster in posters"
            :key="poster.id"
            class="bg-white rounded-xl overflow-hidden shadow-sm"
            @click="selectedPoster = poster"
          >
            <view class="aspect-[3/4] relative bg-[#F1EDE8] flex items-center justify-center">
              <text class="text-4xl text-muted-foreground/30"></text>
              <view class="absolute bottom-0 left-0 right-0 p-2" style="background:linear-gradient(to top,rgba(0,0,0,0.6),transparent)">
                <text class="text-xs text-white/80">使用 {{ poster.useCount }} 次</text>
              </view>
            </view>
            <view class="p-2">
              <text class="text-sm font-medium text-foreground block truncate">{{ poster.title }}</text>
              <view class="flex gap-1 mt-1 flex-wrap">
                <view v-for="tag in poster.tags.slice(0, 2)" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded bg-[#F1EDE8] text-muted-foreground">
                  <text>{{ tag }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 文案区 -->
      <view v-if="showSection('copywriting')">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-base" style="color:#C41E3A"></text>
          <text class="text-sm font-medium text-foreground">文案素材</text>
          <text class="text-xs text-muted-foreground">({{ copywritings.length }})</text>
        </view>
        <view class="space-y-3">
          <view v-for="copy in copywritings" :key="copy.id" class="bg-white rounded-xl p-4 shadow-sm">
            <view class="flex items-start justify-between mb-2">
              <view>
                <text class="font-medium text-foreground block">{{ copy.title }}</text>
                <text class="text-xs text-muted-foreground block mt-0.5">适用: {{ copy.scene }}</text>
              </view>
              <view
                class="px-3 py-1 rounded-lg text-xs"
                :class="copiedId === copy.id ? 'text-white' : 'border border-border text-muted-foreground'"
                :style="copiedId === copy.id ? 'background-color:#22C55E' : ''"
                @click="handleCopy(copy)"
              >
                <text>{{ copiedId === copy.id ? '✓ 已复制' : ' 复制' }}</text>
              </view>
            </view>
            <text
              class="text-sm text-muted-foreground block whitespace-pre-wrap"
              :class="expandedCopy !== copy.id ? 'line-clamp-3' : ''"
            >{{ copy.content }}</text>
            <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <text class="text-xs text-muted-foreground">已被复制 {{ copy.copyCount }} 次</text>
              <view class="flex gap-1">
                <view v-for="tag in copy.tags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded" style="background-color:rgba(196,30,58,0.05);color:#C41E3A">
                  <text>{{ tag }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 二维码区 -->
      <view v-if="showSection('qrcode')">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-base" style="color:#C41E3A"></text>
          <text class="text-sm font-medium text-foreground">二维码</text>
          <text class="text-xs text-muted-foreground">({{ qrcodes.length }})</text>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="qr in qrcodes"
            :key="qr.id"
            class="bg-white rounded-xl p-4 shadow-sm text-center"
            @click="selectedQrcode = qr"
          >
            <view class="w-24 h-24 mx-auto rounded-lg overflow-hidden mb-3 bg-[#F1EDE8] flex items-center justify-center">
              <text class="text-4xl text-muted-foreground/30"></text>
            </view>
            <text class="text-sm font-medium text-foreground block truncate">{{ qr.title }}</text>
            <text class="text-xs text-muted-foreground block mt-1">扫描 {{ qr.scanCount }} 次</text>
          </view>
        </view>
      </view>
    </view>
    </view>

    <!-- 海报预览弹层 -->
    <view v-if="selectedPoster" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90" @click="selectedPoster = null">
      <view class="w-full max-w-lg px-4" @click.stop>
        <view class="w-full aspect-[3/4] rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,rgba(196,30,58,0.3),rgba(201,169,110,0.2))">
          <text class="text-6xl text-white/30"></text>
        </view>
      </view>
      <view class="absolute bottom-0 left-0 right-0 p-4" style="background:linear-gradient(to top,black,transparent)">
        <text class="text-white font-medium block mb-3">{{ selectedPoster.title }}</text>
        <view class="flex gap-2">
          <view class="flex-1 py-3 rounded-xl bg-white text-sm text-center text-foreground font-medium">
            <text>⬇️ 保存图片</text>
          </view>
          <view class="flex-1 py-3 rounded-xl text-sm text-center text-white font-medium" style="background-color:#C41E3A">
            <text> 分享</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 二维码详情弹层 -->
    <view v-if="selectedQrcode" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="selectedQrcode = null">
      <view class="w-full max-w-lg bg-white rounded-t-2xl" @click.stop>
        <view class="flex items-center justify-between p-4 border-b border-border">
          <text class="font-semibold text-foreground">{{ selectedQrcode.title }}</text>
          <view @click="selectedQrcode = null" class="p-1">
            <text class="text-lg">✕</text>
          </view>
        </view>
        <view class="py-6 px-4 text-center">
          <view class="w-48 h-48 mx-auto rounded-xl p-4 mb-4 bg-white border border-border flex items-center justify-center">
            <text class="text-6xl text-muted-foreground/30"></text>
          </view>
          <text class="text-sm text-muted-foreground block mb-2">长按二维码保存到相册</text>
          <text class="text-xs text-muted-foreground block mb-6">扫描次数: {{ selectedQrcode.scanCount }}</text>
          <view class="flex gap-3">
            <view class="flex-1 py-3 rounded-xl border border-border text-sm text-center text-foreground">
              <text>⬇️ 保存图片</text>
            </view>
            <view class="flex-1 py-3 rounded-xl text-sm text-center text-white" style="background-color:#C41E3A" @click="handleCopyLink">
              <text> 复制链接</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref('all')
const searchKeyword = ref('')
const selectedPoster = ref<PosterItem | null>(null)
const selectedQrcode = ref<QrcodeItem | null>(null)
const expandedCopy = ref<number | null>(null)
const copiedId = ref<number | null>(null)

interface PosterItem {
  id: number
  title: string
  useCount: number
  tags: string[]
  thumbnail: string
  fullImage: string
}

interface CopyItem {
  id: number
  title: string
  scene: string
  content: string
  copyCount: number
  tags: string[]
}

interface QrcodeItem {
  id: number
  title: string
  scanCount: number
  qrcodeUrl: string
  targetUrl: string
}

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'poster', label: '海报' },
  { value: 'copywriting', label: '文案' },
  { value: 'qrcode', label: '二维码' },
]

const posters: PosterItem[] = [
  { id: 1, title: '春季课程推广海报', useCount: 128, tags: ['课程推广', '春季'], thumbnail: '', fullImage: '' },
  { id: 2, title: '八字命理招生海报', useCount: 256, tags: ['招生', '八字'], thumbnail: '', fullImage: '' },
  { id: 3, title: '风水讲座邀请函', useCount: 64, tags: ['讲座', '风水'], thumbnail: '', fullImage: '' },
  { id: 4, title: '周年庆优惠海报', useCount: 32, tags: ['活动', '优惠'], thumbnail: '', fullImage: '' },
]

const copywritings: CopyItem[] = [
  { id: 1, title: '八字课程推广文案', scene: '朋友圈推广', content: '🔮 想知道你的命运密码吗？\n\n 八字命理入门实战班开课啦！\n 零基础也能学会\n 实战案例教学\n 名师一对一指导\n\n🎁 限时优惠仅需¥299\n👉 点击链接立即报名', copyCount: 86, tags: ['课程', '八字'] },
  { id: 2, title: '风水讲座预热文案', scene: '社群推广', content: '🏠 你家风水布局对了吗？\n\n本周六特邀资深风水师亲临分享：\n• 客厅布局的禁忌\n• 卧室床位的最佳方位\n• 厨房灶台的正确朝向\n\n名额有限，立即预约！', copyCount: 42, tags: ['讲座', '风水'] },
  { id: 3, title: '新用户欢迎语', scene: '自动回复', content: '欢迎来到国学文化推广联盟！\n\n在这里您可以：\n 学习国学经典\n🔮 体验智能排盘\n 加入兴趣圈子\n 咨询专业老师\n\n回复「课程」查看最新课程安排', copyCount: 158, tags: ['欢迎', '自动'] },
]

const qrcodes: QrcodeItem[] = [
  { id: 1, title: '驿站主页二维码', scanCount: 520, qrcodeUrl: '', targetUrl: 'https://rebu.com/s/station001' },
  { id: 2, title: '课程报名二维码', scanCount: 328, qrcodeUrl: '', targetUrl: 'https://rebu.com/course/1' },
  { id: 3, title: '公众号关注码', scanCount: 156, qrcodeUrl: '', targetUrl: 'https://mp.weixin.qq.com/s/test' },
  { id: 4, title: '客服咨询二维码', scanCount: 89, qrcodeUrl: '', targetUrl: 'https://rebu.com/kf' },
]

const filteredPosters = computed(() => {
  if (!searchKeyword.value) return posters
  return posters.filter(p => p.title.includes(searchKeyword.value) || p.tags.some(t => t.includes(searchKeyword.value)))
})

const filteredCopywritings = computed(() => {
  if (!searchKeyword.value) return copywritings
  return copywritings.filter(c => c.title.includes(searchKeyword.value) || c.content.includes(searchKeyword.value))
})

const filteredQrcodes = computed(() => {
  if (!searchKeyword.value) return qrcodes
  return qrcodes.filter(q => q.title.includes(searchKeyword.value))
})

function showSection(type: string): boolean {
  if (activeTab.value !== 'all' && activeTab.value !== type) return false
  if (type === 'poster' && filteredPosters.value.length === 0) return false
  if (type === 'copywriting' && filteredCopywritings.value.length === 0) return false
  if (type === 'qrcode' && filteredQrcodes.value.length === 0) return false
  return true
}

function handleCopy(copy: CopyItem) {
  uni.setClipboardData({
    data: copy.content,
    success: () => {
      copiedId.value = copy.id
      setTimeout(() => { copiedId.value = null }, 2000)
    },
  })
}

function handleCopyLink() {
  if (selectedQrcode.value) {
    uni.setClipboardData({ data: selectedQrcode.value.targetUrl })
    uni.showToast({ title: '链接已复制', icon: 'success' })
  }
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => { setTimeout(() => { loading.value = false }, 300) })
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
