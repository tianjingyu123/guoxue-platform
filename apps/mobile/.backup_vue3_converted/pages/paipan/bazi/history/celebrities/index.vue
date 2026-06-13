<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="bg-white border-b border-border">
      <view class="flex items-center justify-center py-3 px-4 relative">
        <view @click="goBack" class="absolute left-4 p-1">
          <text class="text-xl text-muted-foreground">←</text>
        </view>

        <!-- 切换标签 -->
        <view class="flex bg-secondary rounded-full p-0.5">
          <view @click="goHistory" class="px-5 py-1.5 text-sm font-medium rounded-full text-muted-foreground">
            <text>用户列表</text>
          </view>
          <view class="px-5 py-1.5 text-sm font-medium rounded-full bg-white text-foreground shadow-sm relative">
            <text>案例库</text>
            <text class="absolute -top-1 -right-1 px-1 py-0.5 text-[10px] font-medium text-bronze" style="background:#fef3c7;border-radius:2px">VIP</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="bg-white px-4 py-3 border-b border-border/60">
      <view class="flex items-center gap-3">
        <view class="flex-1 flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
          <text class="text-sm text-muted-foreground"></text>
          <input
            type="text"
            :value="searchQuery"
            @input="(e:any) => { searchQuery = e.detail.value }"
            placeholder="请输入搜索的内容"
            class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground box-border"
          />
        </view>
        <view class="px-4 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">筛选</view>
      </view>
    </view>

    <!-- 一级分类标签 -->
    <view class="bg-white border-b border-border/60">
      <view class="flex px-4 py-2 gap-6">
        <view v-for="category in primaryCategories" :key="category"
          @click="handlePrimaryChange(category)"
          class="whitespace-nowrap text-sm font-semibold pb-1.5"
          style="border-bottom-width:2px"
          :class="activePrimary === category ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'"
        >
          <text>{{ category }}</text>
        </view>
      </view>
    </view>

    <!-- 二级分类标签 -->
    <view class="bg-background border-b border-border/60">
      <view class="flex overflow-x-auto px-4 py-2 gap-3" style="white-space:nowrap">
        <view v-for="category in secondaryCategories[activePrimary]" :key="category"
          @click="activeSecondary = category"
          class="whitespace-nowrap px-3 py-1 rounded-full text-sm transition-colors"
          :class="activeSecondary === category ? 'text-bronze font-medium' : 'bg-white text-muted-foreground'"
          :style="activeSecondary === category ? 'background:#fef3c7' : ''"
        >
          <text>{{ category }}</text>
        </view>
      </view>
    </view>

    <!-- 名人列表 -->
    <scroll-view scroll-y class="flex-1 relative" :scroll-into-view="'letter-'+scrollToLetterId">
      <view>
        <view v-for="letter in availableLetters" :key="letter">
          <!-- 字母分组标题 -->
          <view :id="'letter-'+letter" class="px-4 py-1.5 bg-secondary text-sm font-medium text-muted-foreground">
            <text>{{ letter }}</text>
          </view>

          <!-- 该字母下的案例 -->
          <view v-for="(item, index) in groupedByLetter[letter]" :key="item.id"
            class="flex items-center gap-3 px-4 py-3 bg-white"
            :class="isLocked(index) ? 'opacity-40' : ''"
          >
            <!-- 信息 -->
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="text-lg font-bold" :class="isLocked(index) ? 'blur-[2px]' : 'text-foreground'">
                  {{ item.name }}
                </text>
                <text class="text-xs text-gray-400">{{ item.gender === 'male' ? '男' : '女' }}</text>
              </view>
              <view class="text-xs text-gray-400 mt-0.5" :class="isLocked(index) ? 'blur-[2px]' : ''">
                <text>{{ item.desc }} {{ item.subtitle }}</text>
              </view>
            </view>

            <!-- 四柱八字 -->
            <view class="text-right" :class="isLocked(index) ? 'blur-[3px]' : ''">
              <view class="flex gap-0.5 justify-end text-sm font-medium">
                <text v-for="(char, i) in item.bazi.slice(0, 4)" :key="i"
                  :class="wuxingColors[char] || 'text-gray-700'"
                >{{ char }}</text>
              </view>
              <view class="flex gap-0.5 justify-end text-sm font-medium mt-0.5">
                <text v-for="(char, i) in item.bazi.slice(4, 8)" :key="i"
                  :class="wuxingColors[char] || 'text-gray-700'"
                >{{ char }}</text>
              </view>
            </view>

            <!-- 生肖图标 -->
            <view class="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0"
              :class="isLocked(index) ? 'blur-[2px]' : ''"
            >
              <text class="text-amber-400 text-xs font-medium">{{ item.zodiac }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 字母快速导航 -->
      <view class="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center z-10" style="position:fixed;right:4px">
        <view v-for="letter in availableLetters" :key="letter"
          @click="scrollToLetter(letter)"
          class="px-1 py-0.5 text-[10px] text-muted-foreground"
        >
          <text>{{ letter }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- VIP解锁提示 -->
    <view class="bg-white border-t border-border p-4">
      <view class="w-full py-3 text-white font-medium rounded-full shadow-lg flex items-center justify-center gap-2"
        style="background:linear-gradient(135deg,#b45309,#92400e)"
      >
        <text class="text-sm"></text>
        <text class="text-sm">开通钻石会员解锁</text>
      </view>
      <view class="mt-3 text-xs text-muted-foreground text-center leading-relaxed">
        <text>案例库收录了500+八字案例，包含名人案例（君主、商界、文艺、体育等）和大众案例（财运、事业、婚姻、健康等），让您通过真实案例学习验证八字命理。案例数据持续更新中......</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const wuxingColors: Record<string, string> = {
  '甲': 'text-green-600', '乙': 'text-green-600',
  '丙': 'text-red-500', '丁': 'text-red-500',
  '戊': 'text-yellow-600', '己': 'text-yellow-600',
  '庚': 'text-amber-500', '辛': 'text-amber-500',
  '壬': 'text-blue-500', '癸': 'text-blue-500',
  '子': 'text-blue-500', '丑': 'text-yellow-600',
  '寅': 'text-green-600', '卯': 'text-green-600',
  '辰': 'text-yellow-600', '巳': 'text-red-500',
  '午': 'text-red-500', '未': 'text-yellow-600',
  '申': 'text-amber-500', '酉': 'text-amber-500',
  '戌': 'text-yellow-600', '亥': 'text-blue-500',
}

const primaryCategories = ['名人案例', '大众案例']

const secondaryCategories: Record<string, string[]> = {
  '名人案例': ['君主', '商界', '文艺', '体育', '历史', '军事', '僧道'],
  '大众案例': ['财运', '事业', '婚姻', '健康', '学业', '灾厄', '长寿'],
}

interface CaseItem {
  id: number; name: string; gender: string; desc: string; subtitle: string;
  primary: string; secondary: string; bazi: string[]; letter: string; zodiac: string;
}

const caseData: CaseItem[] = [
  { id: 1, name: '崇祯', gender: 'male', desc: '明朝', subtitle: '末位皇帝', primary: '名人案例', secondary: '君主', bazi: ['辛','庚','乙','己','亥','寅','未','卯'], letter: 'C', zodiac: '猪' },
  { id: 2, name: '曹操', gender: 'male', desc: '东汉末年', subtitle: '魏武帝', primary: '名人案例', secondary: '君主', bazi: ['乙','丁','庚','甲','丑','亥','戌','申'], letter: 'C', zodiac: '牛' },
  { id: 3, name: '忽必烈', gender: 'male', desc: '元朝', subtitle: '开国皇帝', primary: '名人案例', secondary: '君主', bazi: ['乙','乙','乙','乙','亥','酉','酉','酉'], letter: 'H', zodiac: '猪' },
  { id: 4, name: '康熙', gender: 'male', desc: '清朝', subtitle: '圣祖皇帝', primary: '名人案例', secondary: '君主', bazi: ['甲','丙','戊','庚','午','寅','申','子'], letter: 'K', zodiac: '马' },
  { id: 5, name: '李白', gender: 'male', desc: '唐朝', subtitle: '诗仙', primary: '名人案例', secondary: '文艺', bazi: ['辛','庚','甲','壬','丑','寅','子','申'], letter: 'L', zodiac: '牛' },
  { id: 6, name: '武则天', gender: 'female', desc: '唐朝', subtitle: '唯一女皇帝', primary: '名人案例', secondary: '君主', bazi: ['甲','丙','甲','甲','申','寅','午','戌'], letter: 'W', zodiac: '猴' },
  { id: 7, name: '朱元璋', gender: 'male', desc: '明朝', subtitle: '开国皇帝', primary: '名人案例', secondary: '君主', bazi: ['戊','壬','丁','丁','辰','戌','丑','未'], letter: 'Z', zodiac: '龙' },
  { id: 8, name: '马云', gender: 'male', desc: '当代', subtitle: '阿里巴巴创始人', primary: '名人案例', secondary: '商界', bazi: ['甲','丙','甲','壬','辰','寅','子','申'], letter: 'M', zodiac: '龙' },
  { id: 101, name: '案例A01', gender: 'male', desc: '白手起家', subtitle: '从打工到身家过亿', primary: '大众案例', secondary: '财运', bazi: ['甲','丙','戊','庚','子','寅','辰','午'], letter: 'A', zodiac: '鼠' },
  { id: 102, name: '案例B02', gender: 'female', desc: '职场晋升', subtitle: '30岁成为上市公司高管', primary: '大众案例', secondary: '事业', bazi: ['乙','丁','己','辛','丑','卯','巳','未'], letter: 'B', zodiac: '牛' },
  { id: 103, name: '案例C03', gender: 'female', desc: '幸福婚姻', subtitle: '晚婚却遇良人', primary: '大众案例', secondary: '婚姻', bazi: ['丙','戊','庚','壬','寅','辰','午','申'], letter: 'C', zodiac: '虎' },
  { id: 104, name: '案例D04', gender: 'male', desc: '健康长寿', subtitle: '90岁依然健步如飞', primary: '大众案例', secondary: '长寿', bazi: ['丁','己','辛','癸','卯','巳','未','酉'], letter: 'D', zodiac: '兔' },
  { id: 105, name: '案例E05', gender: 'male', desc: '学业有成', subtitle: '寒门出贵子考入清华', primary: '大众案例', secondary: '学业', bazi: ['戊','庚','壬','甲','辰','午','申','戌'], letter: 'E', zodiac: '龙' },
]

const isVip = ref(false)

const searchQuery = ref('')
const activePrimary = ref('名人案例')
const activeSecondary = ref('君主')
const scrollToLetterId = ref('')

function handlePrimaryChange(primary: string) {
  activePrimary.value = primary
  activeSecondary.value = secondaryCategories[primary][0]
}

const filteredCases = computed(() => {
  return caseData.filter(c => {
    const matchPrimary = c.primary === activePrimary.value
    const matchSecondary = c.secondary === activeSecondary.value
    const matchSearch = searchQuery.value === '' || c.name.includes(searchQuery.value) || c.desc.includes(searchQuery.value)
    return matchPrimary && matchSecondary && matchSearch
  })
})

const groupedByLetter = computed(() => {
  const acc: Record<string, CaseItem[]> = {}
  filteredCases.value.forEach(item => {
    const letter = item.letter
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(item)
  })
  return acc
})

const availableLetters = computed(() => {
  return Object.keys(groupedByLetter.value).sort()
})

function isLocked(index: number) {
  return !isVip.value && index > 0
}

function scrollToLetter(letter: string) {
  scrollToLetterId.value = letter
}

function goBack() { uni.navigateBack() }
function goHistory() { uni.navigateTo({ url: '/pages/paipan/bazi/history/index' }) }
</script>

<style scoped>
.text-bronze { color: #b45309; }
</style>
