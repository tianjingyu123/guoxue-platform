<script setup lang="ts">
/**
 * 排盘中心（对应 V0 paipan-center.tsx）
 *
 * 🔴 与 V0 的一处**有意偏离**，事关准确性，别改回去：
 * V0 的排盘中心自带一整套「起盘表单 + 盘面结果页」（四柱/紫微/六爻共 1400+ 行），
 * 那是因为 V0 手里没有真引擎，只能拿静态假盘面充数。而本项目已有 24 个真工具页，
 * 算法过了三方交叉验证（八字/紫微/七政/奇门/六爻…14 套黄金测试）。
 * 若照搬 V0 再画一套盘面，就等于给平台造了**第二个算法口径**——两处结果一旦不一致，
 * 权威性当场崩掉。所以这里只做「工具矩阵 + 最近排盘」，起盘一律跳真工具页。
 *
 * 老师的动线：选工具（可自定义常用）→ 真工具页起盘 → 结果页点「生成报告」→ 回工坊。
 */
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import ToolIcon from '@/components/paipan/tool-icon.vue'
import { tools as ALL_TOOLS } from '@/lib/tools-data'
import { recentCharts, type RecentChart } from '@/lib/paipan/recent-charts'
import { getWorkspaceToolKeys, setWorkspaceToolKeys, DEFAULT_TOOL_KEYS } from '../lib/workspace-tools'

defineEmits<{ (e: 'generate-report'): void }>()

const myKeys = ref<string[]>([])
const editing = ref(false)
const recents = ref<RecentChart[]>([])

/** 常用工具（老师自选，默认 6 个高频） */
const myTools = computed(() =>
  myKeys.value.map((k) => ALL_TOOLS.find((t) => t.id === k)).filter((t): t is NonNullable<typeof t> => !!t),
)

/** 工具库里还没加的（编辑态可添加）——排除未开发的占位工具 */
const restTools = computed(() =>
  ALL_TOOLS.filter((t) => !myKeys.value.includes(t.id) && !t.href.includes('coming-soon')),
)

function load() {
  myKeys.value = getWorkspaceToolKeys()
  recents.value = recentCharts(8)
}

onMounted(load)
onShow(load)

function openTool(href: string) {
  uni.navigateTo({ url: href.startsWith('/paipan/') ? `/pkg-paipan${href}` : href })
}

/** 最近排盘：直接进对应工具页复盘 */
function openRecent(r: RecentChart) {
  openTool(r.href)
}

function addTool(id: string) {
  myKeys.value = [...myKeys.value, id]
  setWorkspaceToolKeys(myKeys.value)
}

function removeTool(id: string) {
  myKeys.value = myKeys.value.filter((k) => k !== id)
  setWorkspaceToolKeys(myKeys.value)
}

function moveTool(id: string, dir: -1 | 1) {
  const i = myKeys.value.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= myKeys.value.length) return
  const next = [...myKeys.value]
  ;[next[i], next[j]] = [next[j], next[i]]
  myKeys.value = next
  setWorkspaceToolKeys(next)
}

function resetTools() {
  myKeys.value = [...DEFAULT_TOOL_KEYS]
  setWorkspaceToolKeys(myKeys.value)
}
</script>

<template>
  <view class="pc">
    <!-- 常用工具矩阵 -->
    <PaperCard padding="lg">
      <view class="pc-head">
        <SectionTitle title="常用工具" subtitle="长按管理 · 可增删排序" />
        <text class="pc-edit" @tap="editing = !editing">{{ editing ? '完成' : '管理' }}</text>
      </view>

      <view class="pc-grid">
        <view v-for="t in myTools" :key="t.id" class="pc-tool">
          <view class="pc-tool-btn" @tap="editing ? null : openTool(t.href)">
            <ToolIcon :icon-id="t.iconId" :size="44" />
            <text class="pc-tool-label">{{ t.name }}</text>
          </view>
          <view v-if="editing" class="pc-tool-ops">
            <view class="pc-op" @tap="moveTool(t.id, -1)">
              <AppIcon name="chevron-left" :size="14" color="#7A6C5E" />
            </view>
            <view class="pc-op pc-op--del" @tap="removeTool(t.id)">
              <AppIcon name="minus" :size="14" color="#fff" />
            </view>
            <view class="pc-op" @tap="moveTool(t.id, 1)">
              <AppIcon name="chevron-right" :size="14" color="#7A6C5E" />
            </view>
          </view>
        </view>
      </view>

      <!-- 编辑态：可添加的工具 -->
      <view v-if="editing" class="pc-lib">
        <view class="pc-lib-head">
          <text class="pc-lib-title">从工具库添加</text>
          <text class="pc-reset" @tap="resetTools">恢复默认</text>
        </view>
        <view class="pc-lib-grid">
          <view v-for="t in restTools" :key="t.id" class="pc-lib-item" @tap="addTool(t.id)">
            <ToolIcon :icon-id="t.iconId" :size="32" />
            <text class="pc-lib-label">{{ t.name }}</text>
            <view class="pc-lib-add">
              <AppIcon name="plus" :size="12" color="#C41E3A" />
            </view>
          </view>
        </view>
      </view>
    </PaperCard>

    <!-- 最近排盘（真本地记录） -->
    <PaperCard padding="lg">
      <SectionTitle title="最近排盘" subtitle="存档随取 · 咨询前复盘" />

      <view v-if="!recents.length" class="pc-empty">
        <AppIcon name="history" :size="36" color="#D5C9B8" />
        <text class="pc-empty-txt">还没有排盘记录</text>
        <text class="pc-empty-sub">从上面选个工具起盘，记录会自动留在这里</text>
      </view>

      <view v-else class="pc-recents">
        <view
          v-for="(r, i) in recents"
          :key="r.toolKey + r.ts + i"
          class="pc-recent"
          :class="{ 'pc-recent--line': i !== recents.length - 1 }"
          @tap="openRecent(r)"
        >
          <view class="pc-recent-avatar">{{ (r.title || '盘').slice(0, 1) }}</view>
          <view class="pc-recent-info">
            <view class="pc-recent-row">
              <text class="pc-recent-title">{{ r.title }}</text>
              <text class="pc-recent-tool">{{ r.toolLabel }}</text>
            </view>
            <text class="pc-recent-summary">{{ r.summary || r.timeText }}</text>
          </view>
          <text class="pc-recent-time">{{ r.timeText }}</text>
          <AppIcon name="chevron-right" :size="16" color="#B8AA9A" />
        </view>
      </view>
    </PaperCard>

    <!-- 出报告的路径说明（老师第一次进来会找不到「生成报告」在哪） -->
    <PaperCard padding="lg">
      <SectionTitle title="怎么出报告" />
      <view class="pc-steps">
        <view class="pc-step">
          <text class="pc-step-n">1</text>
          <text class="pc-step-t">选工具起盘，得到真实盘面</text>
        </view>
        <view class="pc-step">
          <text class="pc-step-n">2</text>
          <text class="pc-step-t">在结果页点「生成报告」，盘面自动带入工坊</text>
        </view>
        <view class="pc-step">
          <text class="pc-step-n">3</text>
          <text class="pc-step-t">工坊里 AI 起草各章，你逐章改定稿</text>
        </view>
        <view class="pc-step">
          <text class="pc-step-n">4</text>
          <text class="pc-step-t">生成只读链接交付客户（会员）</text>
        </view>
      </view>
    </PaperCard>
  </view>
</template>

<style lang="scss" scoped>
.pc {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

.pc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.pc-edit {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #C41E3A;
}

.pc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  margin-top: 24rpx;
}

.pc-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pc-tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.pc-tool-label {
  font-size: 22rpx;
  color: #3A2A1E;
  text-align: center;
}

.pc-tool-ops {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 10rpx;
}

.pc-op {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(154, 140, 126, 0.14);
}

.pc-op--del {
  background: #C41E3A;
}

.pc-lib {
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(58, 42, 30, 0.08);
}

.pc-lib-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.pc-lib-title {
  font-size: 24rpx;
  color: #9A8C7E;
}

.pc-reset {
  font-size: 22rpx;
  color: #C41E3A;
}

.pc-lib-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.pc-lib-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 8rpx;
  border: 1rpx dashed rgba(196, 30, 58, 0.3);
  border-radius: 12rpx;
}

.pc-lib-label {
  font-size: 20rpx;
  color: #7A6C5E;
  text-align: center;
}

.pc-lib-add {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
}

/* 最近排盘 */
.pc-recents {
  margin-top: 12rpx;
}

.pc-recent {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
}

.pc-recent--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.08);
}

.pc-recent-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  font-size: 28rpx;
  font-weight: 700;
  color: #C41E3A;
}

.pc-recent-info {
  flex: 1;
  min-width: 0;
}

.pc-recent-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pc-recent-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #3A2A1E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260rpx;
}

.pc-recent-tool {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(154, 140, 126, 0.12);
  font-size: 18rpx;
  color: #7A6C5E;
}

.pc-recent-summary {
  display: block;
  margin-top: 2rpx;
  font-size: 22rpx;
  color: #9A8C7E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-recent-time {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #B8AA9A;
}

/* 空态 */
.pc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 56rpx 0;
}

.pc-empty-txt {
  font-size: 26rpx;
  color: #9A8C7E;
}

.pc-empty-sub {
  font-size: 22rpx;
  color: #B8AA9A;
}

/* 步骤 */
.pc-steps {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 24rpx;
}

.pc-step {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.pc-step-n {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  font-size: 22rpx;
  font-weight: 700;
  color: #C41E3A;
}

.pc-step-t {
  font-size: 24rpx;
  color: #3A2A1E;
}
</style>
