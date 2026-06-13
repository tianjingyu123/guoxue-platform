<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border" style="background-color:rgba(255,255,255,0.95)">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">分享推广中心</text>
        </view>
        <view
          class="px-3 py-1.5 rounded-lg border border-border text-xs flex items-center gap-1"
          @click="navigateTo('/pages/substation/id-detail/poster/index')"
        >
          <text></text>
          <text>分站海报</text>
        </view>
      </view>
    </view>

    <!-- 收益提示 -->
    <view class="px-4 py-3" style="background:linear-gradient(to right,rgba(34,197,94,0.1),rgba(34,197,94,0.05));border-bottom:1px solid rgba(34,197,94,0.2)">
      <view class="flex items-center gap-2">
        <text class="text-sm" style="color:#22C55E">🎁</text>
        <text class="text-sm text-foreground">
          分享内容，用户购买即可获得 <text class="font-bold" style="color:#22C55E">10%-30%</text> 佣金
        </text>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="px-4 py-3">
      <view class="relative">
        <input
          class="w-full pl-10 pr-4 py-2 rounded-lg text-sm border-none text-foreground"
          style="background-color:rgba(241,237,232,0.5)"
          placeholder="搜索要分享的内容..."
          :value="searchKeyword"
          @input="searchKeyword = $event.detail.value"
        />
        <text class="absolute left-3 top-1/2 text-sm text-muted-foreground" style="transform:translateY(-50%)"></text>
      </view>
    </view>

    <!-- 内容类型筛选 -->
    <view class="px-4 pb-3">
      <scroll-view scroll-x class="flex gap-2" style="white-space:nowrap">
        <view
          v-for="ct in contentTypes"
          :key="ct.id"
          class="inline-block px-3 py-1.5 rounded-lg text-xs whitespace-nowrap flex-shrink-0 flex items-center gap-1"
          :class="activeType === ct.id ? 'text-white' : 'border border-border text-muted-foreground'"
          :style="activeType === ct.id ? 'background-color:#C41E3A' : ''"
          @click="activeType = ct.id"
        >
          <text>{{ typeIcons[ct.id] || '' }}</text>
          <text>{{ ct.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 内容列表 -->
    <view class="px-4 space-y-3">
      <view v-for="content in filteredContents" :key="content.id" class="bg-white rounded-xl p-3">
        <view class="flex gap-3">
          <!-- 封面图 -->
          <view class="w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center bg-[#F1EDE8]">
            <text class="text-2xl text-muted-foreground/50">{{ typeIcons[content.type] || '' }}</text>
          </view>

          <!-- 内容信息 -->
          <view class="flex-1 min-w-0">
            <view class="flex items-start justify-between gap-2">
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-1.5 mb-1">
                  <view class="text-[10px] px-1.5 py-0.5 rounded bg-[#F1EDE8] text-muted-foreground">
                    <text>{{ getTypeLabel(content.type) }}</text>
                  </view>
                  <view v-if="content.isFree" class="text-[10px] px-1.5 py-0.5 rounded" style="background-color:#DCFCE7;color:#15803D">
                    <text>免费</text>
                  </view>
                </view>
                <text class="font-medium text-sm line-clamp-1 text-foreground block">{{ content.title }}</text>
              </view>
            </view>

            <!-- 数据和价格 -->
            <view class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <text v-if="content.price !== undefined" class="font-medium" style="color:#C41E3A">¥{{ content.price }}</text>
              <text v-if="content.sales">{{ content.sales }}销量</text>
              <text v-if="content.students">{{ content.students }}学员</text>
              <text v-if="content.members">{{ content.members }}成员</text>
              <text v-if="content.participants">{{ content.participants }}人参与</text>
              <text v-if="content.views">{{ content.views }}浏览</text>
              <text v-if="content.reservations">{{ content.reservations }}人预约</text>
            </view>

            <!-- 佣金信息 -->
            <view class="flex items-center justify-between mt-2">
              <view class="flex items-center gap-1">
                <text class="text-[10px] text-muted-foreground">预计佣金</text>
                <text class="text-sm font-bold" style="color:#22C55E">
                  {{ content.commissionAmount > 0 ? '¥' + content.commissionAmount : '引流' }}
                </text>
                <text class="text-[10px] text-muted-foreground">({{ content.commission }})</text>
              </view>

              <!-- 操作按钮 -->
              <view class="flex items-center gap-1">
                <view
                  class="px-2 py-1 rounded text-xs flex items-center gap-0.5"
                  style="background-color:transparent"
                  @click="handleCopyLink(content)"
                >
                  <text>{{ copiedId === content.id ? '' : '' }}</text>
                  <text>链接</text>
                </view>
                <view
                  class="px-2 py-1 rounded text-xs flex items-center gap-0.5 text-white"
                  style="background-color:#C41E3A"
                  @click="handleGeneratePoster(content)"
                >
                  <text></text>
                  <text>海报</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-if="filteredContents.length === 0" class="text-center py-12">
        <text class="text-4xl text-muted-foreground/30 block mb-3"></text>
        <text class="text-sm text-muted-foreground">暂无相关内容</text>
      </view>
    </view>

    <!-- 海报生成弹窗 -->
    <view v-if="showPoster && selectedContent" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color:rgba(0,0,0,0.6)">
      <view class="bg-background rounded-2xl w-full max-w-sm overflow-hidden">
        <!-- 海报预览 -->
        <view class="p-4">
          <view
            class="aspect-[9/16] rounded-xl border border-border p-4 flex flex-col"
            style="background:linear-gradient(135deg,rgba(196,30,58,0.1),#FAF8F5,rgba(201,169,110,0.1))"
          >
            <!-- 内容区 -->
            <view class="flex-1">
              <!-- 封面 -->
              <view class="aspect-video rounded-lg mb-3 flex items-center justify-center bg-[#F1EDE8]">
                <text class="text-4xl text-muted-foreground/30">{{ typeIcons[selectedContent.type] || '' }}</text>
              </view>

              <!-- 标题 -->
              <text class="font-bold text-lg text-foreground block mb-2">{{ selectedContent.title }}</text>

              <!-- 价格/信息 -->
              <view class="flex items-center gap-2 mb-3">
                <text v-if="selectedContent.price !== undefined" class="text-2xl font-bold" style="color:#C41E3A">¥{{ selectedContent.price }}</text>
                <text v-if="selectedContent.originalPrice" class="text-sm text-muted-foreground line-through">¥{{ selectedContent.originalPrice }}</text>
                <view v-else-if="selectedContent.isFree" class="text-[10px] px-1.5 py-0.5 rounded" style="background-color:#DCFCE7;color:#15803D">
                  <text>免费</text>
                </view>
              </view>

              <!-- 亮点标签 -->
              <view class="flex flex-wrap gap-1.5">
                <view v-if="selectedContent.sales" class="text-[10px] px-1.5 py-0.5 rounded bg-[#F1EDE8] text-muted-foreground">
                  <text>{{ selectedContent.sales }}人已购</text>
                </view>
                <view v-if="selectedContent.students" class="text-[10px] px-1.5 py-0.5 rounded bg-[#F1EDE8] text-muted-foreground">
                  <text>{{ selectedContent.students }}学员</text>
                </view>
                <view v-if="selectedContent.members" class="text-[10px] px-1.5 py-0.5 rounded bg-[#F1EDE8] text-muted-foreground">
                  <text>{{ selectedContent.members }}成员</text>
                </view>
                <view v-if="selectedContent.participants" class="text-[10px] px-1.5 py-0.5 rounded bg-[#F1EDE8] text-muted-foreground">
                  <text>{{ selectedContent.participants }}人参与</text>
                </view>
              </view>
            </view>

            <!-- 站长信息 -->
            <view class="mt-auto pt-4 border-t border-border">
              <view class="flex items-center gap-3">
                <view class="w-10 h-10 rounded-full flex items-center justify-center" style="background-color:rgba(196,30,58,0.1)">
                  <text class="font-bold" style="color:#C41E3A">{{ stationInfo.ownerName.charAt(0) }}</text>
                </view>
                <view class="flex-1">
                  <text class="text-sm font-medium text-foreground block">{{ stationInfo.ownerName }}</text>
                  <text class="text-[10px] text-muted-foreground block">{{ stationInfo.name }}站长推荐</text>
                </view>
                <view class="w-14 h-14 bg-white rounded-lg border border-border flex items-center justify-center">
                  <text class="text-4xl text-foreground"></text>
                </view>
              </view>
              <text class="text-[10px] text-center text-muted-foreground block mt-2">长按识别二维码查看详情</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="px-4 pb-4 grid grid-cols-2 gap-3">
          <view
            class="py-3 rounded-xl border border-border text-sm text-center text-foreground"
            @click="showPoster = false"
          >
            <text>取消</text>
          </view>
          <view
            class="py-3 rounded-xl text-sm text-center text-white flex items-center justify-center gap-1"
            style="background-color:#C41E3A"
            @click="handleSavePoster"
          >
            <text>⬇️</text>
            <text>保存海报</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeType = ref('all')
const searchKeyword = ref('')
const selectedContent = ref<any>(null)
const showPoster = ref(false)
const copiedId = ref<string | null>(null)

const contentTypes = [
  { id: 'all', label: '全部' },
  { id: 'product', label: '商品' },
  { id: 'activity', label: '活动' },
  { id: 'course', label: '课程' },
  { id: 'circle', label: '圈子' },
  { id: 'article', label: '文章' },
  { id: 'video', label: '视频' },
  { id: 'live', label: '直播' },
  { id: 'competition', label: '赛事' },
]

const typeIcons: Record<string, string> = {
  all: '',
  product: '️',
  activity: '',
  course: '',
  circle: '',
  article: '',
  video: '▶️',
  live: '📻',
  competition: '',
}

const typeLabels: Record<string, string> = {
  product: '商品',
  activity: '活动',
  course: '课程',
  circle: '圈子',
  article: '文章',
  video: '视频',
  live: '直播',
  competition: '赛事',
}

interface ShareContent {
  id: string
  type: string
  title: string
  image: string
  price?: number
  originalPrice?: number
  commission: string
  commissionAmount: number
  sales?: number
  students?: number
  members?: number
  participants?: number
  views?: number
  reservations?: number
  isFree?: boolean
  date?: string
  scheduledTime?: string
  prize?: string
  entryFee?: number
  duration?: string
  isPaid?: boolean
}

const shareableContents: ShareContent[] = [
  { id: 'p1', type: 'product', title: '滴天髓精解', image: '', price: 68, originalPrice: 98, commission: '20%', commissionAmount: 13.6, sales: 328 },
  { id: 'p2', type: 'product', title: '子平真诠评注', image: '', price: 88, commission: '20%', commissionAmount: 17.6, sales: 215 },
  { id: 'a1', type: 'activity', title: '八字命理公开课', image: '', date: '2024-02-15', participants: 1286, commission: '15%', commissionAmount: 0, isFree: true },
  { id: 'a2', type: 'activity', title: '新春开运讲座', image: '', date: '2024-02-20', price: 99, participants: 856, commission: '15%', commissionAmount: 14.85 },
  { id: 'c1', type: 'course', title: '八字入门实战课', image: '', price: 199, students: 2680, commission: '25%', commissionAmount: 49.75 },
  { id: 'c2', type: 'course', title: '紫微斗数精讲', image: '', price: 299, students: 1560, commission: '25%', commissionAmount: 74.75 },
  { id: 'ci1', type: 'circle', title: '八字命理研习社', image: '', price: 99, members: 3680, commission: '30%', commissionAmount: 29.7 },
  { id: 'ci2', type: 'circle', title: '风水堪舆交流圈', image: '', price: 199, members: 2150, commission: '30%', commissionAmount: 59.7 },
  { id: 'ar1', type: 'article', title: '八字看婚姻的十大要点', image: '', views: 12680, isPaid: true, price: 9.9, commission: '20%', commissionAmount: 1.98 },
  { id: 'v1', type: 'video', title: '三分钟学会看八字日主', image: '', views: 56800, duration: '3:25', commission: '0%', commissionAmount: 0, isFree: true },
  { id: 'l1', type: 'live', title: '今晚八点：流年运势解析', image: '', scheduledTime: '今晚 20:00', reservations: 2680, commission: '15%', commissionAmount: 0, isFree: true },
  { id: 'cp1', type: 'competition', title: '2024热卜杯·八字命理大赛', image: '', participants: 1286, prize: '万元奖金', commission: '10%', commissionAmount: 9.9, entryFee: 99 },
]

const stationInfo = {
  id: 'demo',
  name: '易学驿站',
  ownerName: '张道长',
  ownerAvatar: '',
}

const filteredContents = computed(() => {
  return shareableContents.filter(item => {
    const matchType = activeType.value === 'all' || item.type === activeType.value
    const kw = searchKeyword.value.toLowerCase()
    const matchSearch = !kw || item.title.toLowerCase().includes(kw)
    return matchType && matchSearch
  })
})

function getTypeLabel(type: string): string {
  return typeLabels[type] || type
}

function handleCopyLink(content: ShareContent) {
  const link = `https://rebu.com/${content.type}/${content.id}?ref=${stationInfo.id}`
  uni.setClipboardData({
    data: link,
    success: () => {
      copiedId.value = content.id
      setTimeout(() => { copiedId.value = null }, 2000)
      uni.showToast({ title: '链接已复制', icon: 'success' })
    },
  })
}

function handleGeneratePoster(content: ShareContent) {
  selectedContent.value = content
  showPoster.value = true
}

function handleSavePoster() {
  uni.showToast({ title: '保存功能开发中', icon: 'none' })
}

function navigateTo(path: string) {
  uni.navigateTo({ url: path })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
