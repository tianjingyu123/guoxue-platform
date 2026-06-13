<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <header class="bg-card border-b border-border sticky top-0 z-20">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center text-muted-foreground" @click="goBack">
          <text class="text-xl">&#8592;</text>
        </view>
        <!-- 切换标签 -->
        <view class="flex bg-secondary rounded-full p-0.5">
          <view class="px-5 py-1.5 text-sm font-medium rounded-full bg-card shadow-sm">用户列表</view>
          <view class="px-5 py-1.5 text-sm font-medium rounded-full text-muted-foreground relative" @click="goToCelebrities">
            案例库
            <text class="absolute -top-1 -right-1 px-1 py-0.5 text-[10px] font-medium rounded" style="color:#C9A96E;background:rgba(201,169,110,0.2)">VIP</text>
          </view>
        </view>
        <view class="p-1.5 rounded-full relative" @click="showMenu = !showMenu">
          <text>⋮</text>
        </view>
      </view>

      <!-- 下拉菜单 -->
      <view v-if="showMenu">
        <view class="fixed inset-0 z-10" @click="showMenu = false" />
        <view class="absolute right-3 top-12 bg-card rounded-xl z-20 py-2 min-w-[140px] animate-fade-in-down" style="box-shadow:0 4px 24px rgba(0,0,0,0.15)">
          <view class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors" @click="goToGroups">
            <text></text>
            <text class="text-sm">分组编辑</text>
          </view>
          <view class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors" @click="setSelectMode('group'); showMenu = false">
            <text>✏️</text>
            <text class="text-sm">修改分组</text>
          </view>
          <view class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors" @click="setSelectMode('pin'); showMenu = false">
            <text></text>
            <text class="text-sm">星标置顶</text>
          </view>
          <view class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors" @click="setSelectMode('delete'); showMenu = false">
            <text>🗑️</text>
            <text class="text-sm">批量删除</text>
          </view>
        </view>
      </view>
    </header>

    <!-- 搜索栏 -->
    <view class="bg-card px-4 py-3 border-b border-border/60">
      <view class="relative">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
        <input type="text" v-model="searchQuery" placeholder="搜索客户名称" class="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl text-sm placeholder:text-muted-foreground/50" style="outline:none;border:1px solid transparent" />
      </view>
    </view>

    <!-- 分组标签 -->
    <view class="bg-card px-4 py-2 border-b border-border/60 overflow-x-auto">
      <view class="flex gap-2">
        <view v-for="group in groups" :key="group"
          class="px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap"
          :class="activeGroup === group ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'"
          @click="activeGroup = group">{{ group }}</view>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="flex-1 bg-card">
      <view v-if="filteredRecords.length === 0" class="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <text class="text-3xl mb-3 opacity-50"></text>
        <text>暂无记录</text>
      </view>
      <view v-else class="divide-y divide-border/60">
        <view v-for="record in filteredRecords" :key="record.id"
          class="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
          @click="selectMode === 'none' ? goToRecord(record) : toggleSelect(record.id)">

          <!-- 选择模式复选框 -->
          <view v-if="selectMode !== 'none'" @click.stop="toggleSelect(record.id)">
            <view class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="selectedIds.includes(record.id) ? 'border-primary bg-primary' : 'border-border'">
              <text v-if="selectedIds.includes(record.id)" class="text-white text-xs">✓</text>
            </view>
          </view>

          <!-- 性别头像 -->
          <view class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="record.gender === 'male' ? 'bg-blue-50' : 'bg-pink-50'">
            <svg class="w-6 h-6" :class="record.gender === 'male' ? 'text-blue-400' : 'text-pink-400'" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </view>

          <!-- 信息 -->
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="font-medium truncate">{{ record.name }}</text>
              <text v-if="record.analyzed" class="px-1.5 py-0.5 text-xs rounded shrink-0" style="color:#C9A96E;background:rgba(201,169,110,0.2)">已解析</text>
            </view>
            <text class="text-xs text-muted-foreground mt-0.5 block">{{ record.date }}</text>
          </view>

          <!-- 四柱八字 -->
          <view class="text-right shrink-0">
            <view class="flex gap-0.5 text-sm font-medium justify-end">
              <text :class="tianGanColors[record.pillars.yearGan]">{{ record.pillars.yearGan }}</text>
              <text :class="tianGanColors[record.pillars.monthGan]">{{ record.pillars.monthGan }}</text>
              <text :class="tianGanColors[record.pillars.dayGan]">{{ record.pillars.dayGan }}</text>
              <text :class="tianGanColors[record.pillars.hourGan]">{{ record.pillars.hourGan }}</text>
            </view>
            <view class="flex gap-0.5 text-sm font-medium justify-end mt-0.5">
              <text :class="diZhiColors[record.pillars.yearZhi]">{{ record.pillars.yearZhi }}</text>
              <text :class="diZhiColors[record.pillars.monthZhi]">{{ record.pillars.monthZhi }}</text>
              <text :class="diZhiColors[record.pillars.dayZhi]">{{ record.pillars.dayZhi }}</text>
              <text :class="diZhiColors[record.pillars.hourZhi]">{{ record.pillars.hourZhi }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量操作栏 - 删除 -->
    <view v-if="selectMode === 'delete'" class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
      <view class="flex items-center gap-2" @click="selectAll">
        <view class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
          :class="selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? 'border-primary bg-primary' : 'border-border'">
          <text v-if="selectedIds.length === filteredRecords.length && filteredRecords.length > 0" class="text-white text-xs">✓</text>
        </view>
        <text class="text-sm">全选</text>
      </view>
      <view class="flex-1 flex gap-2 justify-end">
        <view class="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full" @click="cancelSelect">取消</view>
        <view class="px-6 py-2.5 text-sm font-medium text-white rounded-full text-center" :style="{ backgroundColor: selectedIds.length > 0 ? '#f87171' : '#fca5a5' }" @click="handleBatchDelete">删除 ({{ selectedIds.length }})</view>
      </view>
    </view>

    <!-- 批量操作栏 - 置顶 -->
    <view v-if="selectMode === 'pin'" class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
      <view class="flex-1 flex gap-3">
        <view class="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full text-center" @click="cancelSelect">取消</view>
        <view class="flex-1 py-2.5 text-sm font-medium text-white rounded-full text-center" :style="{ backgroundColor: selectedIds.length > 0 ? '#6b7280' : '#9ca3af' }" @click="handleBatchPin">置顶 ({{ selectedIds.length }})</view>
      </view>
    </view>

    <!-- 批量操作栏 - 修改分组 -->
    <view v-if="selectMode === 'group'" class="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex items-center gap-3">
      <view class="flex items-center gap-2" @click="selectAll">
        <view class="w-5 h-5 rounded-full border-2 flex items-center justify-center" :class="selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? 'border-primary bg-primary' : 'border-border'">
          <text v-if="selectedIds.length === filteredRecords.length && filteredRecords.length > 0" class="text-white text-xs">✓</text>
        </view>
        <text class="text-sm">全选</text>
      </view>
      <view class="flex-1 flex gap-2 justify-end">
        <view class="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-secondary rounded-full" @click="cancelSelect">取消</view>
        <view class="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full text-center" :class="{ 'opacity-40': selectedIds.length === 0 }" @click="showGroupPicker = true">移动到分组 ({{ selectedIds.length }})</view>
      </view>
    </view>

    <!-- 分组选择弹窗 -->
    <view v-if="showGroupPicker" class="fixed inset-0 bg-black/40 z-50 flex items-end" @click="showGroupPicker = false">
      <view class="bg-card w-full rounded-t-2xl overflow-hidden" @click.stop>
        <view class="px-4 py-4 border-b border-border text-center">
          <text class="text-base font-semibold">选择分组</text>
        </view>
        <view style="max-height:50vh;overflow-y:auto">
          <view v-for="group in groups.filter(g => g !== '全部')" :key="group"
            class="w-full px-4 py-4 border-b border-border/60 last:border-b-0 hover:bg-secondary/50 transition-colors"
            @click="handleChangeGroup(group)">{{ group }}</view>
        </view>
        <view class="p-4 border-t border-border">
          <view class="w-full py-3 bg-secondary text-muted-foreground rounded-full font-medium text-center" @click="showGroupPicker = false">取消</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 五行颜色映射
const tianGanColors: Record<string, string> = {
  '甲': 'text-green-600', '乙': 'text-green-600',
  '丙': 'text-red-500', '丁': 'text-red-500',
  '戊': 'text-yellow-600', '己': 'text-yellow-600',
  '庚': 'text-amber-500', '辛': 'text-amber-500',
  '壬': 'text-blue-500', '癸': 'text-blue-500',
}

const diZhiColors: Record<string, string> = {
  '子': 'text-blue-500', '丑': 'text-yellow-600',
  '寅': 'text-green-600', '卯': 'text-green-600',
  '辰': 'text-yellow-600', '巳': 'text-red-500',
  '午': 'text-red-500', '未': 'text-yellow-600',
  '申': 'text-amber-500', '酉': 'text-amber-500',
  '戌': 'text-yellow-600', '亥': 'text-blue-500',
}

interface PillarSet {
  yearGan: string; yearZhi: string; monthGan: string; monthZhi: string
  dayGan: string; dayZhi: string; hourGan: string; hourZhi: string
}

interface Record {
  id: number; name: string; gender: string; date: string; analyzed: boolean
  pillars: PillarSet; group: string
}

type SelectMode = 'none' | 'delete' | 'pin' | 'group'

const mockRecords: Record[] = [
  { id: 1, name: '张先生', gender: 'male', date: '05月08日 17:11', analyzed: true, pillars: { yearGan: '辛', yearZhi: '丑', monthGan: '丙', monthZhi: '申', dayGan: '甲', dayZhi: '午', hourGan: '壬', hourZhi: '申' }, group: '家人' },
  { id: 2, name: '李女士', gender: 'female', date: '04月13日 22:54', analyzed: true, pillars: { yearGan: '癸', yearZhi: '亥', monthGan: '戊', monthZhi: '午', dayGan: '丁', dayZhi: '丑', hourGan: '丁', hourZhi: '未' }, group: '全部' },
  { id: 3, name: '王小姐', gender: 'female', date: '02月17日 17:07', analyzed: false, pillars: { yearGan: '丙', yearZhi: '午', monthGan: '庚', monthZhi: '寅', dayGan: '辛', dayZhi: '酉', hourGan: '癸', hourZhi: '巳' }, group: '朋友' },
  { id: 4, name: '赵先生', gender: 'male', date: '2025年12月26日', analyzed: true, pillars: { yearGan: '甲', yearZhi: '子', monthGan: '乙', monthZhi: '亥', dayGan: '己', dayZhi: '巳', hourGan: '壬', hourZhi: '申' }, group: '客户' },
  { id: 5, name: '刘女士', gender: 'female', date: '2025年07月05日', analyzed: true, pillars: { yearGan: '庚', yearZhi: '子', monthGan: '己', monthZhi: '卯', dayGan: '癸', dayZhi: '酉', hourGan: '乙', hourZhi: '卯' }, group: '朋友' },
  { id: 6, name: '陈先生', gender: 'male', date: '2024年12月05日', analyzed: true, pillars: { yearGan: '戊', yearZhi: '寅', monthGan: '己', monthZhi: '未', dayGan: '庚', dayZhi: '辰', hourGan: '癸', hourZhi: '未' }, group: '家人' },
]

const groups = ['全部', '家人', '朋友', '客户']

const searchQuery = ref('')
const activeGroup = ref('全部')
const showMenu = ref(false)
const selectMode = ref<SelectMode>('none')
const selectedIds = ref<number[]>([])
const records = ref<Record[]>(mockRecords)
const showGroupPicker = ref(false)

const filteredRecords = computed(() =>
  records.value.filter(r => {
    const matchesSearch = r.name.includes(searchQuery.value)
    const matchesGroup = activeGroup.value === '全部' || r.group === activeGroup.value
    return matchesSearch && matchesGroup
  })
)

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function selectAll() {
  if (selectedIds.value.length === filteredRecords.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredRecords.value.map(r => r.id)
  }
}

function setSelectMode(mode: SelectMode) {
  selectMode.value = mode
  selectedIds.value = []
}

function cancelSelect() {
  selectMode.value = 'none'
  selectedIds.value = []
}

function handleBatchDelete() {
  if (selectedIds.value.length === 0) return
  uni.showModal({
    content: `确定删除 ${selectedIds.value.length} 条记录吗？`,
    success: (res) => {
      if (res.confirm) {
        records.value = records.value.filter(r => !selectedIds.value.includes(r.id))
        cancelSelect()
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    },
  })
}

function handleBatchPin() {
  if (selectedIds.value.length === 0) return
  uni.showToast({ title: `已置顶 ${selectedIds.value.length} 条`, icon: 'success' })
  cancelSelect()
}

function handleChangeGroup(newGroup: string) {
  records.value = records.value.map(r =>
    selectedIds.value.includes(r.id) ? { ...r, group: newGroup } : r
  )
  showGroupPicker.value = false
  cancelSelect()
  uni.showToast({ title: `已移动到「${newGroup}」`, icon: 'success' })
}

function goToRecord(record: Record) {
  uni.navigateTo({ url: `/pages/paipan/yangpan/detail/index?id=${record.id}` })
}

function goBack() { uni.navigateBack() }
function goToCelebrities() {
  uni.navigateTo({ url: '/pages/paipan/yangpan/history/celebrities/index' })
}
function goToGroups() {
  showMenu.value = false
  uni.navigateTo({ url: '/pages/paipan/yangpan/history/groups/index' })
}
</script>

<style scoped>
.animate-fade-in-down {
  animation: fadeInDown 0.2s ease-out;
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
