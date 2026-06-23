<script setup lang="ts">
/**
 * 阳盘命理奇门 · 历史用户列表（从原型 app/paipan/yangpan/history/page.tsx 1:1 迁移）
 * 结构：顶栏(返回/用户列表·案例库Tab/更多菜单) + 搜索栏 + 分组标签 + 记录列表(性别头像+信息+四柱八字) + 三种批量操作栏 + 分组选择弹窗
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'

const tianGanColors: Record<string, string> = {
  甲: 'wx-wood', 乙: 'wx-wood', 丙: 'wx-fire', 丁: 'wx-fire',
  戊: 'wx-earth', 己: 'wx-earth', 庚: 'wx-metal', 辛: 'wx-metal',
  壬: 'wx-water', 癸: 'wx-water',
}
const diZhiColors: Record<string, string> = {
  子: 'wx-water', 丑: 'wx-earth', 寅: 'wx-wood', 卯: 'wx-wood',
  辰: 'wx-earth', 巳: 'wx-fire', 午: 'wx-fire', 未: 'wx-earth',
  申: 'wx-metal', 酉: 'wx-metal', 戌: 'wx-earth', 亥: 'wx-water',
}

interface Rec {
  id: number; name: string; gender: 'male' | 'female'; date: string; analyzed: boolean
  pillars: { yearGan: string; yearZhi: string; monthGan: string; monthZhi: string; dayGan: string; dayZhi: string; hourGan: string; hourZhi: string }
  group: string
}

const records = ref<Rec[]>([
  { id: 1, name: '张先生', gender: 'male', date: '05月08日 17:11', analyzed: true, pillars: { yearGan: '辛', yearZhi: '丑', monthGan: '丙', monthZhi: '申', dayGan: '甲', dayZhi: '午', hourGan: '壬', hourZhi: '申' }, group: '家人' },
  { id: 2, name: '李女士', gender: 'female', date: '04月13日 22:54', analyzed: true, pillars: { yearGan: '癸', yearZhi: '亥', monthGan: '戊', monthZhi: '午', dayGan: '丁', dayZhi: '丑', hourGan: '丁', hourZhi: '未' }, group: '全部' },
  { id: 3, name: '王小姐', gender: 'female', date: '02月17日 17:07', analyzed: false, pillars: { yearGan: '丙', yearZhi: '午', monthGan: '庚', monthZhi: '寅', dayGan: '辛', dayZhi: '酉', hourGan: '癸', hourZhi: '巳' }, group: '朋友' },
  { id: 4, name: '赵先生', gender: 'male', date: '2025年12月26日', analyzed: true, pillars: { yearGan: '甲', yearZhi: '子', monthGan: '乙', monthZhi: '亥', dayGan: '己', dayZhi: '巳', hourGan: '壬', hourZhi: '申' }, group: '客户' },
  { id: 5, name: '刘女士', gender: 'female', date: '2025年07月05日', analyzed: true, pillars: { yearGan: '庚', yearZhi: '子', monthGan: '己', monthZhi: '卯', dayGan: '癸', dayZhi: '酉', hourGan: '乙', hourZhi: '卯' }, group: '朋友' },
  { id: 6, name: '陈先生', gender: 'male', date: '2024年12月05日', analyzed: true, pillars: { yearGan: '戊', yearZhi: '寅', monthGan: '己', monthZhi: '未', dayGan: '庚', dayZhi: '辰', hourGan: '癸', hourZhi: '未' }, group: '家人' },
])

const groups = ['全部', '家人', '朋友', '客户']
type SelectMode = 'none' | 'delete' | 'pin' | 'group'

const searchQuery = ref('')
const activeGroup = ref('全部')
const showMenu = ref(false)
const selectMode = ref<SelectMode>('none')
const selectedIds = ref<number[]>([])
const showGroupPicker = ref(false)

const filteredRecords = computed(() =>
  records.value.filter((r) => {
    const matchesSearch = r.name.includes(searchQuery.value)
    const matchesGroup = activeGroup.value === '全部' || r.group === activeGroup.value
    return matchesSearch && matchesGroup
  }),
)
const allSelected = computed(
  () => selectedIds.value.length === filteredRecords.value.length && filteredRecords.value.length > 0,
)
function toggleSelect(id: number) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((i) => i !== id)
    : [...selectedIds.value, id]
}
function selectAll() {
  selectedIds.value = allSelected.value ? [] : filteredRecords.value.map((r) => r.id)
}
function enterMode(m: SelectMode) {
  selectMode.value = m
  showMenu.value = false
}
function exitMode() {
  selectMode.value = 'none'
  selectedIds.value = []
}
function handleChangeGroup(newGroup: string) {
  records.value = records.value.map((r) =>
    selectedIds.value.includes(r.id) ? { ...r, group: newGroup } : r,
  )
  showGroupPicker.value = false
  exitMode()
}
const ganList = (p: Rec['pillars']) => [{ c: p.yearGan }, { c: p.monthGan }, { c: p.dayGan }, { c: p.hourGan }]
const zhiList = (p: Rec['pillars']) => [{ c: p.yearZhi }, { c: p.monthZhi }, { c: p.dayZhi }, { c: p.hourZhi }]
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-bar">
        <view class="hdr-back" @tap="navigateBack()"><app-icon name="chevron-left" :size="40" color="#666666" /></view>
        <view class="seg">
          <view class="seg-item seg-on"><text class="seg-text seg-text-on">用户列表</text></view>
          <view class="seg-item">
            <text class="seg-text">案例库</text>
            <text class="vip-badge">VIP</text>
          </view>
        </view>
        <view class="hdr-more" @tap="showMenu = !showMenu"><app-icon name="more-vertical" :size="40" color="#666666" /></view>
      </view>

      <template v-if="showMenu">
        <view class="menu-mask" @tap="showMenu = false" />
        <view class="menu">
          <view class="menu-item" @tap="showMenu = false; navigateTo('/paipan/yangpan/history/groups')">
            <app-icon name="users" :size="32" color="#999999" /><text class="menu-text">分组编辑</text>
          </view>
          <view class="menu-item" @tap="enterMode('group')">
            <app-icon name="folder-pen" :size="32" color="#999999" /><text class="menu-text">修改分组</text>
          </view>
          <view class="menu-item" @tap="enterMode('pin')">
            <app-icon name="star" :size="32" color="#999999" /><text class="menu-text">星标置顶</text>
          </view>
          <view class="menu-item" @tap="enterMode('delete')">
            <app-icon name="trash-2" :size="32" color="#999999" /><text class="menu-text">批量删除</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 搜索栏 -->
    <view class="search-wrap">
      <view class="search-box">
        <app-icon name="search" :size="30" color="#999999" />
        <input v-model="searchQuery" class="search-input" placeholder="搜索客户名称" placeholder-class="search-ph" />
      </view>
    </view>

    <!-- 分组标签 -->
    <scroll-view scroll-x class="groups-wrap">
      <view class="groups">
        <view v-for="g in groups" :key="g" class="group-chip" :class="{ 'group-chip-on': activeGroup === g }" @tap="activeGroup = g">
          <text class="group-text" :class="{ 'group-text-on': activeGroup === g }">{{ g }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 记录列表 -->
    <scroll-view scroll-y class="list">
      <view v-if="filteredRecords.length === 0" class="empty">
        <app-icon name="search" :size="96" color="#cccccc" />
        <text class="empty-text">暂无记录</text>
      </view>
      <view v-else>
        <view v-for="rec in filteredRecords" :key="rec.id" class="row">
          <view v-if="selectMode !== 'none'" class="cbox" :class="{ 'cbox-on': selectedIds.includes(rec.id) }" @tap="toggleSelect(rec.id)">
            <app-icon v-if="selectedIds.includes(rec.id)" name="check" :size="20" color="#ffffff" />
          </view>
          <view class="avatar" :class="rec.gender === 'male' ? 'avatar-m' : 'avatar-f'">
            <app-icon name="user" :size="36" :color="rec.gender === 'male' ? '#60a5fa' : '#f472b6'" />
          </view>
          <view class="info">
            <view class="info-top">
              <text class="info-name">{{ rec.name }}</text>
              <text v-if="rec.analyzed" class="tag-analyzed">已解析</text>
            </view>
            <text class="info-date">{{ rec.date }}</text>
          </view>
          <view class="pillars">
            <view class="pillar-row">
              <text v-for="(g, i) in ganList(rec.pillars)" :key="'g' + i" class="gz" :class="tianGanColors[g.c]">{{ g.c }}</text>
            </view>
            <view class="pillar-row">
              <text v-for="(z, i) in zhiList(rec.pillars)" :key="'z' + i" class="gz" :class="diZhiColors[z.c]">{{ z.c }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 批量操作栏 · 删除 -->
    <view v-if="selectMode === 'delete'" class="opbar">
      <view class="op-all" @tap="selectAll">
        <view class="cbox" :class="{ 'cbox-on': allSelected }"><app-icon v-if="allSelected" name="check" :size="20" color="#ffffff" /></view>
        <text class="op-all-text">全选</text>
      </view>
      <view class="op-btns">
        <view class="op-cancel" @tap="exitMode"><text class="op-cancel-text">取消</text></view>
        <view class="op-act op-del" :class="{ 'op-disabled': selectedIds.length === 0 }"><text class="op-act-text">删除</text></view>
      </view>
    </view>

    <!-- 批量操作栏 · 置顶 -->
    <view v-if="selectMode === 'pin'" class="opbar">
      <view class="op-btns op-btns-full">
        <view class="op-cancel op-flex" @tap="exitMode"><text class="op-cancel-text">取消</text></view>
        <view class="op-act op-pin op-flex" :class="{ 'op-disabled': selectedIds.length === 0 }"><text class="op-act-text">置顶</text></view>
      </view>
    </view>

    <!-- 批量操作栏 · 修改分组 -->
    <view v-if="selectMode === 'group'" class="opbar">
      <view class="op-all" @tap="selectAll">
        <view class="cbox" :class="{ 'cbox-on': allSelected }"><app-icon v-if="allSelected" name="check" :size="20" color="#ffffff" /></view>
        <text class="op-all-text">全选</text>
      </view>
      <view class="op-btns">
        <view class="op-cancel" @tap="exitMode"><text class="op-cancel-text">取消</text></view>
        <view class="op-act op-group" :class="{ 'op-disabled': selectedIds.length === 0 }" @tap="selectedIds.length && (showGroupPicker = true)"><text class="op-act-text">移动到分组</text></view>
      </view>
    </view>

    <!-- 分组选择弹窗 -->
    <view v-if="showGroupPicker" class="mask" @tap="showGroupPicker = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head"><text class="sheet-title">选择分组</text></view>
        <scroll-view scroll-y class="sheet-list">
          <view v-for="g in groups.filter((x) => x !== '全部')" :key="g" class="sheet-item" @tap="handleChangeGroup(g)">
            <text class="sheet-item-text">{{ g }}</text>
          </view>
        </scroll-view>
        <view class="sheet-foot">
          <view class="sheet-cancel" @tap="showGroupPicker = false"><text class="sheet-cancel-text">取消</text></view>
        </view>
      </view>
    </view>
  </view>

  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }
.wx-wood { color: #16a34a; } .wx-fire { color: #ef4444; } .wx-earth { color: #ca8a04; } .wx-metal { color: #f59e0b; } .wx-water { color: #3b82f6; }
.hdr { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; position: relative; }
.hdr-back, .hdr-more { padding: 6rpx; }
.seg { display: flex; background: var(--secondary); border-radius: 999rpx; padding: 4rpx; }
.seg-item { padding: 10rpx 32rpx; border-radius: 999rpx; position: relative; }
.seg-on { background: var(--card); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08); }
.seg-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.seg-text-on { color: var(--text-ink); }
.vip-badge { position: absolute; top: -8rpx; right: -8rpx; font-size: 16rpx; font-weight: 500; color: var(--gold); background: rgba(201,169,110,0.18); border-radius: 6rpx; padding: 0 6rpx; line-height: 1.6; }
.menu-mask { position: fixed; inset: 0; z-index: 10; }
.menu { position: absolute; right: 24rpx; top: 88rpx; background: var(--card); border-radius: 20rpx; box-shadow: 0 12rpx 32rpx rgba(0,0,0,0.18); z-index: 20; padding: 12rpx 0; min-width: 260rpx; }
.menu-item { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 28rpx; }
.menu-text { font-size: 26rpx; color: var(--text-ink); }
.search-wrap { background: var(--card); padding: 20rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.search-box { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 24rpx; background: var(--secondary); border-radius: 20rpx; }
.search-input { flex: 1; font-size: 26rpx; color: var(--text-ink); }
.search-ph { color: rgba(153,153,153,0.6); }
.groups-wrap { background: var(--card); border-bottom: 2rpx solid var(--border); white-space: nowrap; }
.groups { display: flex; gap: 16rpx; padding: 16rpx 24rpx; }
.group-chip { padding: 10rpx 28rpx; border-radius: 999rpx; background: var(--secondary); flex-shrink: 0; }
.group-chip-on { background: var(--brand); }
.group-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.group-text-on { color: #fff; }
.list { flex: 1; background: var(--card); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; gap: 20rpx; }
.empty-text { font-size: 28rpx; color: var(--text-soft); }
.row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; border-bottom: 2rpx solid var(--border); }
.cbox { width: 36rpx; height: 36rpx; border-radius: 999rpx; border: 3rpx solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cbox-on { background: var(--brand); border-color: var(--brand); }
.avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-m { background: #eff6ff; }
.avatar-f { background: #fdf2f8; }
.info { flex: 1; min-width: 0; }
.info-top { display: flex; align-items: center; gap: 12rpx; }
.info-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.tag-analyzed { font-size: 20rpx; color: var(--gold); background: rgba(201,169,110,0.18); border-radius: 6rpx; padding: 2rpx 10rpx; }
.info-date { font-size: 22rpx; color: var(--text-soft); margin-top: 4rpx; }
.pillars { display: flex; flex-direction: column; gap: 4rpx; align-items: flex-end; }
.pillar-row { display: flex; gap: 4rpx; }
.gz { font-size: 28rpx; font-weight: 500; }
.opbar { position: sticky; bottom: 0; background: var(--card); border-top: 2rpx solid var(--border); padding: 20rpx 24rpx; display: flex; align-items: center; gap: 20rpx; }
.op-all { display: flex; align-items: center; gap: 12rpx; }
.op-all-text { font-size: 26rpx; color: var(--text-ink); }
.op-btns { flex: 1; display: flex; gap: 16rpx; justify-content: flex-end; }
.op-btns-full { justify-content: stretch; }
.op-flex { flex: 1; }
.op-cancel { padding: 18rpx 44rpx; background: var(--secondary); border-radius: 999rpx; text-align: center; }
.op-cancel-text { font-size: 26rpx; font-weight: 500; color: var(--text-soft); }
.op-act { padding: 18rpx 44rpx; border-radius: 999rpx; text-align: center; }
.op-act-text { font-size: 26rpx; font-weight: 500; color: #fff; }
.op-del { background: #f87171; }
.op-pin { background: #6b7280; }
.op-group { background: var(--brand); }
.op-disabled { opacity: 0.4; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; display: flex; align-items: flex-end; }
.sheet { background: var(--card); width: 100%; border-radius: 32rpx 32rpx 0 0; overflow: hidden; }
.sheet-head { padding: 32rpx 24rpx; border-bottom: 2rpx solid var(--border); text-align: center; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: var(--text-ink); }
.sheet-list { max-height: 50vh; }
.sheet-item { padding: 32rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.sheet-item-text { font-size: 28rpx; color: var(--text-ink); }
.sheet-foot { padding: 24rpx; border-top: 2rpx solid var(--border); }
.sheet-cancel { width: 100%; padding: 24rpx 0; background: var(--secondary); border-radius: 999rpx; text-align: center; }
.sheet-cancel-text { font-size: 28rpx; font-weight: 500; color: var(--text-soft); }
</style>
