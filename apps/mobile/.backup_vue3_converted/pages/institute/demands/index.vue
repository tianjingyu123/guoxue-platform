<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
      <view class="flex items-center gap-3 mb-3">
        <view @click="goBack" class="p-1 -ml-1"><text class="text-xl text-foreground">←</text></view>
        <text class="text-lg font-semibold text-foreground">需求广场</text>
        <view class="flex-1" />
        <view class="px-4 py-1.5 bg-primary rounded-full text-sm text-white" @click="publishDemand">
          <text> 发布需求</text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="bg-white rounded-lg px-3 py-2 flex items-center gap-2 border border-border">
        <text class="text-sm text-muted-foreground"></text>
        <input v-model="searchText" placeholder="搜索需求标题..." class="flex-1 text-sm text-foreground outline-none" @confirm="doSearch" />
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading" class="px-4 py-4">
      <view class="grid grid-cols-3 gap-2 mb-4">
        <view v-for="i in 3" :key="i" class="bg-muted rounded-xl p-4 animate-pulse">
          <view class="w-10 h-5 bg-white/50 rounded mx-auto mb-1" />
          <view class="w-14 h-3 bg-white/50 rounded mx-auto" />
        </view>
      </view>
      <view v-for="i in 4" :key="i" class="bg-white rounded-xl p-4 mb-3 animate-pulse">
        <view class="w-3/4 h-4 bg-muted rounded mb-2" />
        <view class="flex gap-3 mb-2">
          <view class="w-16 h-3 bg-muted rounded" />
          <view class="w-20 h-3 bg-muted rounded" />
        </view>
        <view class="flex gap-2">
          <view class="w-12 h-5 bg-muted rounded-full" />
          <view class="w-12 h-5 bg-muted rounded-full" />
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <view v-else>
      <!-- 统计与分类 -->
      <view class="px-4 py-4">
        <view class="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-xl mb-4">
          <view class="text-center">
            <text class="text-xl font-bold text-primary">{{ list.length }}</text>
            <text class="text-xs text-muted-foreground block">全部需求</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary">{{ list.filter(d => d.status === 'open').length }}</text>
            <text class="text-xs text-muted-foreground block">招募中</text>
          </view>
          <view class="text-center">
            <text class="text-xl font-bold text-primary">{{ list.filter(d => d.status === 'closed').length }}</text>
            <text class="text-xs text-muted-foreground block">已截止</text>
          </view>
        </view>

        <!-- 领域分类 -->
        <scroll-view scroll-x class="whitespace-nowrap mb-4" show-scrollbar="false">
          <view class="flex gap-2">
            <view v-for="f in fields" :key="f.key"
              :class="['px-4 py-1.5 rounded-full text-sm inline-block', activeField === f.key ? 'bg-primary text-white' : 'bg-white border border-border text-ink-soft']"
              @click="activeField = f.key">
              <text>{{ f.icon }} {{ f.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 排序 -->
        <view class="flex items-center justify-between mb-3 px-1">
          <text class="text-xs text-muted-foreground">共 {{ filteredList.length }} 个需求</text>
          <view class="flex items-center gap-2">
            <text v-for="s in sortOptions" :key="s.key"
              :class="['text-xs px-2 py-1 rounded', sortBy === s.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground']"
              @click="sortBy = s.key">{{ s.label }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredList.length === 0" class="flex flex-col items-center justify-center py-16">
        <text class="text-5xl mb-4"></text>
        <text class="text-base text-foreground font-medium mb-2">暂无需求</text>
        <text class="text-sm text-muted-foreground mb-6">当前分类下没有需求，换个分类试试</text>
        <view class="px-6 py-2 bg-primary text-white rounded-full text-sm" @click="publishDemand">发布需求</view>
      </view>

      <!-- 需求列表 -->
      <scroll-view v-else scroll-y class="px-4 pb-24">
        <view v-for="d in filteredList" :key="d.id" class="bg-white rounded-xl border border-border p-4 mb-3 shadow-sm" @click="goDetail(d.id)">
          <view class="flex items-start justify-between gap-2 mb-2">
            <view class="flex-1">
              <text class="font-medium text-foreground text-sm">{{ d.title }}</text>
            </view>
            <view :class="['px-2 py-0.5 rounded-full text-xs font-medium',
              d.status === 'open' ? 'bg-green-50 text-green-600' :
              d.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600']">
              {{ d.statusLabel }}
            </view>
          </view>

          <text class="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{{ d.desc }}</text>

          <view class="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <text>{{ d.field }}</text>
            <text> {{ d.budget }}</text>
            <text> {{ d.deadline }}</text>
          </view>

          <view class="flex items-center justify-between pt-3 border-t border-[#FAF8F5]">
            <view class="flex items-center gap-2">
              <view class="flex -space-x-1.5">
                <view v-for="(bidder, bi) in d.bidders.slice(0, 3)" :key="bi"
                  class="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-br from-primary to-[#E74C3C] flex items-center justify-center text-white text-[8px] font-medium">
                  {{ bidder[0] }}
                </view>
              </view>
              <text class="text-[11px] text-muted-foreground">{{ d.bidCount }}人投标</text>
            </view>
            <view class="flex items-center gap-1">
              <text v-for="tag in d.tags" :key="tag" class="px-1.5 py-0.5 bg-muted rounded text-[10px] text-ink-soft">{{ tag }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 浮动发布按钮（移动端快捷） -->
    <view class="fixed bottom-6 right-4 z-20 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center" style="box-shadow: 0 4px 16px rgba(196,30,58,0.35)" @click="publishDemand">
      <text class="text-2xl text-white"></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const searchText = ref('')
const activeField = ref('all')
const sortBy = ref('latest')

const fields = [
  { key: 'all', label: '全部', icon: '' },
  { key: 'divination', label: '算卦占卜', icon: '️' },
  { key: 'naming', label: '起名改名', icon: '✏️' },
  { key: 'date', label: '择日选时', icon: '' },
  { key: 'fengshui', label: '风水堪舆', icon: '🏠' },
  { key: 'bazi', label: '八字命理', icon: '' },
  { key: 'study', label: '学术研究', icon: '' },
]

const sortOptions = [
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '热门' },
  { key: 'budget', label: '预算' },
]

interface Demand {
  id: string
  title: string
  desc: string
  field: string
  fieldKey: string
  budget: string
  deadline: string
  status: string
  statusLabel: string
  bidCount: number
  bidders: string[]
  tags: string[]
  hot: number
  budgetValue: number
  time: string
}

const list = ref<Demand[]>([
  {
    id: '1', title: '周易六爻占卜——寻找失物', field: '️ 算卦占卜', fieldKey: 'divination',
    desc: '家中祖传玉佩丢失，请大师起卦看能否找回。玉佩为圆形青玉，约3cm直径，上有龙纹雕刻。丢失时间大概在三天前。',
    budget: '¥200-500', deadline: '2024-03-01', status: 'open', statusLabel: '招募中',
    bidCount: 5, bidders: ['张', '李', '王'], tags: ['六爻', '失物'],
    hot: 120, budgetValue: 350, time: '2小时前',
  },
  {
    id: '2', title: '新生儿取名—姓李,男宝,五行缺木', field: '✏️ 起名改名', fieldKey: 'naming',
    desc: '预产期2024年4月，男宝，姓李。先生八字喜木，希望名字中带木字旁或五行属木的字，寓意吉祥、有文化底蕴。',
    budget: '¥500-1000', deadline: '2024-03-15', status: 'open', statusLabel: '招募中',
    bidCount: 12, bidders: ['赵', '钱', '孙', '李'], tags: ['取名', '五行'],
    hot: 256, budgetValue: 750, time: '昨天',
  },
  {
    id: '3', title: '新房装修开工择吉日', field: ' 择日选时', fieldKey: 'date',
    desc: '新房位于北京朝阳区，面积128平米。准备装修开工，需要选择吉日吉时。户主属龙，1988年生。',
    budget: '¥100-300', deadline: '2024-02-28', status: 'open', statusLabel: '招募中',
    bidCount: 8, bidders: ['周', '吴', '郑'], tags: ['择日', '装修'],
    hot: 89, budgetValue: 200, time: '3天前',
  },
  {
    id: '4', title: '阴宅风水考察服务', field: '🏠 风水堪舆', fieldKey: 'fengshui',
    desc: '祖坟迁移选址，需风水大师到现场实地考察。地点在安徽黄山地区，提供食宿交通。需有10年以上经验。',
    budget: '¥3000-8000', deadline: '2024-03-20', status: 'open', statusLabel: '招募中',
    bidCount: 3, bidders: ['冯', '陈'], tags: ['阴宅', '实地'],
    hot: 45, budgetValue: 5000, time: '5天前',
  },
  {
    id: '5', title: '八字婚姻合盘分析', field: ' 八字命理', fieldKey: 'bazi',
    desc: '本人女，1992年5月6日出生，经朋友介绍认识一男生（1990年8月15日生），想请大师合八字看婚姻是否匹配。',
    budget: '¥300-600', deadline: '2024-03-10', status: 'open', statusLabel: '招募中',
    bidCount: 15, bidders: ['褚', '卫', '蒋', '韩'], tags: ['合婚', '八字'],
    hot: 312, budgetValue: 450, time: '1周前',
  },
  {
    id: '6', title: '古籍《皇极经世》校对项目', field: ' 学术研究', fieldKey: 'study',
    desc: '招募古籍校对志愿者，参与《皇极经世》的数字化校对工作。需具备古文基础和易学知识，每周投入不少于5小时。',
    budget: '公益项目', deadline: '2024-04-01', status: 'open', statusLabel: '招募中',
    bidCount: 22, bidders: ['杨', '朱', '秦', '许'], tags: ['古籍', '校对'],
    hot: 178, budgetValue: 0, time: '2周前',
  },
  {
    id: '7', title: '商铺选址风水评估', field: '🏠 风水堪舆', fieldKey: 'fengshui',
    desc: '拟开一家国学书店，面积约60平米，位于商业街。请大师评估店铺风水，给出布局建议。',
    budget: '¥800-1500', deadline: '2024-02-20', status: 'closed', statusLabel: '已截止',
    bidCount: 7, bidders: ['何', '吕', '施'], tags: ['商铺', '布局'],
    hot: 67, budgetValue: 1000, time: '3周前',
  },
  {
    id: '8', title: '流年运势详批', field: ' 八字命理', fieldKey: 'bazi',
    desc: '求2024甲辰年运势详批，重点关注事业和财运。本人1978年生，性别男，目前经营一家文化公司。',
    budget: '¥200-400', deadline: '2024-02-15', status: 'closed', statusLabel: '已截止',
    bidCount: 9, bidders: ['张', '孔', '毛'], tags: ['流年', '运势'],
    hot: 198, budgetValue: 300, time: '1月前',
  },
])

const filteredList = computed(() => {
  let result = [...list.value]

  if (activeField.value !== 'all') {
    result = result.filter(d => d.fieldKey === activeField.value)
  }

  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase()
    result = result.filter(d => d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q))
  }

  switch (sortBy.value) {
    case 'latest':
      break
    case 'hot':
      result.sort((a, b) => b.hot - a.hot)
      break
    case 'budget':
      result.sort((a, b) => b.budgetValue - a.budgetValue)
      break
  }

  return result
})

onMounted(() => {
  setTimeout(() => { loading.value = false }, 1200)
})

function goBack() { uni.navigateBack() }

function doSearch() {
  uni.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(searchText.value)}` })
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/institute/demands/${id}/index` })
}

function publishDemand() {
  uni.navigateTo({ url: '/pages/institute/demands/publish/index' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
