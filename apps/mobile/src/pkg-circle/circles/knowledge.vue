<script setup lang="ts">
/**
 * 圈主管理后台 · 知识库与 AI — V0 circle-admin-knowledge.html 还原（2026-07-10 批③）
 * 结构：AI 助理入口（金描边+呼吸 orb·跳 assistant.vue）→ 双 Tab（已入库/待确认）→
 *      候选卡（确认入库/忽略）→ 已入库列表（删除）→ 手动新增（弹层）→ 说明。
 * 数据：knowledgeApi（list/candidates/confirm/reject/add/remove/extract·circle-knowledge 后端全真连）。
 * #38：待确认 Tab 顶部「AI 提炼」入口 → POST extract-candidates（近30天达人回答→AI提炼候选）。
 * 降级：AI 入口"今日代答 N 次·命中率 N%"后端无统计字段（TODO #38 命中率统计）→ 显示知识库真实条数；
 *      候选"编辑"无候选编辑端点 → 不做；"被 AI 引用 N 次"无字段 → 显示 qualityScore（有则显示）。
 * 入口：dashboard 待办/分区（?id=xxx&tab=pending 直达待确认）。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { knowledgeApi, type KnowledgeItem } from '@/lib/circle-knowledge-data'

const circleId = ref('')
const activeTab = ref<'confirmed' | 'pending'>('confirmed')
const loading = ref(true)
const error = ref(false)
const acting = ref<string | null>(null)

const confirmedItems = ref<KnowledgeItem[]>([])
const pendingItems = ref<KnowledgeItem[]>([])
const expandedId = ref<string | null>(null)
const menuId = ref<string | null>(null)

// 手动新增弹层
const showAdd = ref(false)
const addContent = ref('')
const adding = ref(false)

// #38 AI 提炼（从达人回答提炼候选·手动触发）
const extracting = ref(false)
async function doExtract() {
  if (extracting.value) return
  extracting.value = true
  try {
    const r = await knowledgeApi.extract(circleId.value)
    uni.showToast({ title: r?.message || (r?.created ? `已提炼 ${r.created} 条候选` : '暂无可提炼内容'), icon: 'none', duration: 2500 })
    if (r?.created) {
      activeTab.value = 'pending'
      await load()
    }
  } catch (e) {
    // AI 未配置/失败 → 后端友好错误原样透出
    uni.showToast({ title: (e as Error)?.message || 'AI 提炼失败，请稍后再试', icon: 'none', duration: 2500 })
  } finally {
    extracting.value = false
  }
}

const pendingCount = computed(() => pendingItems.value.length)

async function load() {
  loading.value = true
  error.value = false
  try {
    const [list, cands] = await Promise.all([
      knowledgeApi.list(circleId.value),
      knowledgeApi.candidates(circleId.value),
    ])
    confirmedItems.value = list
    pendingItems.value = cands
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function confirmCand(item: KnowledgeItem) {
  if (acting.value) return
  acting.value = item.id
  try {
    await knowledgeApi.confirm(circleId.value, item.id)
    uni.showToast({ title: '已入库', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    acting.value = null
  }
}

async function rejectCand(item: KnowledgeItem) {
  if (acting.value) return
  acting.value = item.id
  try {
    await knowledgeApi.reject(circleId.value, item.id)
    uni.showToast({ title: '已忽略', icon: 'none' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    acting.value = null
  }
}

function askRemove(item: KnowledgeItem) {
  menuId.value = null
  uni.showModal({
    title: '删除知识条目',
    content: '删除后 AI 将不再依据这条内容回答，确定删除？',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm || acting.value) return
      acting.value = item.id
      try {
        await knowledgeApi.remove(circleId.value, item.id)
        uni.showToast({ title: '已删除', icon: 'none' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '删除失败', icon: 'none' })
      } finally {
        acting.value = null
      }
    },
  })
}

async function submitAdd() {
  const content = addContent.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入知识内容', icon: 'none' })
    return
  }
  if (adding.value) return
  adding.value = true
  try {
    await knowledgeApi.add(circleId.value, content)
    uni.showToast({ title: '已添加', icon: 'success' })
    showAdd.value = false
    addContent.value = ''
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '添加失败', icon: 'none' })
  } finally {
    adding.value = false
  }
}

function toggleExpand(id: string) { expandedId.value = expandedId.value === id ? null : id }
function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`
}
function goAssistant() {
  navigateTo(`/pkg-circle/circles/assistant?circleId=${circleId.value}`)
}

onLoad((q) => {
  circleId.value = q?.id || q?.circleId || ''
  if (q?.tab === 'pending') activeTab.value = 'pending'
  load()
})
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="back-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="topbar-title">知识库与 AI</text>
    </view>

    <!-- AI 助理入口：金描边（与详情页同语言） -->
    <view class="ai-entry">
      <view class="ai-orb" />
      <view class="ai-main">
        <text class="ai-title">圈主 AI 助理 · 你的智能分身</text>
        <text class="ai-desc">知识库 {{ confirmedItems.length }} 条{{ pendingCount ? ` · 待确认 ${pendingCount} 条` : '' }}</text>
      </view>
      <view class="ai-btn" @tap="goAssistant"><text class="ai-btn-txt">对话调教</text></view>
    </view>

    <!-- 双 Tab -->
    <view class="state-tabs">
      <view class="state-tab" :class="{ active: activeTab === 'confirmed' }" @tap="activeTab = 'confirmed'">
        <text class="state-tab-txt">已入库 · {{ confirmedItems.length }}</text>
      </view>
      <view class="state-tab" :class="{ active: activeTab === 'pending' }" @tap="activeTab = 'pending'">
        <text class="state-tab-txt">待确认</text>
        <view v-if="pendingCount" class="n"><text class="n-txt">{{ pendingCount }}</text></view>
      </view>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 三态 -->
      <view v-if="loading" class="state-view"><app-icon name="loader" :size="56" color="#C41E3A" class="spin" /><text class="state-desc">加载中…</text></view>
      <view v-else-if="error" class="state-view">
        <app-icon name="alert-circle" :size="64" color="#C9A96E" />
        <text class="state-desc">加载失败（需圈主身份访问）</text>
        <view class="state-btn" @tap="load"><text class="state-btn-txt">重试</text></view>
      </view>

      <!-- ═══ 待确认候选 ═══ -->
      <template v-else-if="activeTab === 'pending'">
        <!-- #38 AI 提炼入口（从达人回答提炼·手动触发） -->
        <view class="extract-bar" :class="{ disabled: extracting }" @tap="doExtract">
          <app-icon name="sparkles" :size="30" color="#C9A96E" />
          <view class="extract-main">
            <text class="extract-title">{{ extracting ? 'AI 提炼中…' : 'AI 提炼：从达人回答生成候选' }}</text>
            <text class="extract-desc">取近 30 天已回答的付费问答，提炼为知识候选供你确认</text>
          </view>
          <app-icon name="chevron-right" :size="30" color="#999999" />
        </view>
        <view v-if="!pendingItems.length" class="state-view">
          <app-icon name="sparkles" :size="64" color="#C9A96E" />
          <text class="state-title">暂无待确认候选</text>
          <text class="state-desc">AI 会从你的公开回答中自动提炼知识候选，须经你确认才入库</text>
        </view>
        <view v-for="c in pendingItems" :key="c.id" class="cand-card">
          <view class="cand-src">
            <app-icon name="sparkles" :size="22" color="#C9A96E" />
            <text class="cand-src-txt">AI 提炼 · 来源：{{ c.sourceLabel }}{{ c.createdAt ? ` · ${fmtDate(c.createdAt)}` : '' }}</text>
          </view>
          <text class="cand-q">{{ c.title }}</text>
          <text class="cand-a" @tap="toggleExpand(c.id)">
            {{ expandedId === c.id ? c.content : c.summary }}
          </text>
          <view class="cand-actions">
            <view class="btn plain" :class="{ disabled: acting === c.id }" @tap="rejectCand(c)">
              <text class="btn-txt plain-txt">忽略</text>
            </view>
            <view class="btn primary" :class="{ disabled: acting === c.id }" @tap="confirmCand(c)">
              <text class="btn-txt primary-txt">{{ acting === c.id ? '处理中…' : '确认入库' }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- ═══ 已入库 ═══ -->
      <template v-else>
        <view v-if="!confirmedItems.length" class="state-view">
          <app-icon name="book-open" :size="64" color="#CCCCCC" />
          <text class="state-title">知识库还是空的</text>
          <text class="state-desc">条目越准，AI 代答质量越高。先手动添加几条你的核心观点吧</text>
          <view class="state-btn" @tap="showAdd = true"><text class="state-btn-txt">手动新增条目</text></view>
        </view>
        <template v-else>
          <view class="entry-list">
            <view v-for="k in confirmedItems" :key="k.id" class="entry-block">
              <view class="entry-row" @tap="toggleExpand(k.id)">
                <view class="entry-main">
                  <text class="entry-q">{{ k.title }}</text>
                  <text class="entry-meta">
                    {{ k.createdAt ? fmtDate(k.createdAt) + '入库' : '' }} · 来源：{{ k.sourceLabel }}<template v-if="k.qualityScore !== undefined"> · 质量分 {{ k.qualityScore }}</template>
                  </text>
                </view>
                <view class="entry-more" @tap.stop="menuId = menuId === k.id ? null : k.id">
                  <app-icon name="more-horizontal" :size="34" color="#999999" />
                </view>
              </view>
              <view v-if="expandedId === k.id" class="entry-full"><text class="entry-full-txt">{{ k.content }}</text></view>
              <view v-if="menuId === k.id" class="entry-ops">
                <view class="entry-op" @tap="askRemove(k)"><text class="entry-op-txt">删除条目</text></view>
              </view>
            </view>
            <view class="add-entry" @tap="showAdd = true">
              <app-icon name="plus" :size="26" color="#C41E3A" />
              <text class="add-entry-txt">手动新增条目</text>
            </view>
          </view>
        </template>
      </template>

      <text class="kb-note">知识库是你 AI 分身的回答依据：条目越准，AI 代答质量越高。候选由 AI 从你的公开回答中自动提炼，须经你确认才会入库。</text>
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 手动新增弹层 -->
    <view v-if="showAdd" class="mask" @tap="showAdd = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">手动新增知识条目</text>
        <text class="sheet-desc">写下一条你的观点或答疑要点，AI 将据此回答成员提问</text>
        <textarea
          v-model="addContent" class="sheet-input" auto-height
          placeholder="例如：入户门正对电梯时，优先考虑玄关柜或屏风缓冲气流与噪音…"
          placeholder-class="ph" maxlength="2000"
        />
        <view class="sheet-btns">
          <view class="btn plain" @tap="showAdd = false"><text class="btn-txt plain-txt">取消</text></view>
          <view class="btn primary" :class="{ disabled: adding }" @tap="submitAdd">
            <text class="btn-txt primary-txt">{{ adding ? '添加中…' : '添加' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 28rpx 32rpx 20rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 28rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.back-btn { display: flex; align-items: center; }
.topbar-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); flex: 1; }

/* AI 助理入口 */
.ai-entry {
  margin: 16rpx 32rpx 0; padding: 28rpx 32rpx;
  display: flex; align-items: center; gap: 24rpx;
  background: var(--bg-card, #ffffff); border-radius: 36rpx;
  border: 2rpx solid rgba(201, 169, 110, 0.55);
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ai-orb {
  width: 72rpx; height: 72rpx; border-radius: 999rpx; flex-shrink: 0;
  background: radial-gradient(circle at 35% 35%, #e8dcc4, var(--gold, #c9a96e));
  animation: breathe 3s ease-in-out infinite;
}
@keyframes breathe {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; box-shadow: 0 0 24rpx rgba(201, 169, 110, 0.5); }
}
.ai-main { flex: 1; min-width: 0; }
.ai-title { display: block; font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ai-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }
.ai-btn {
  flex-shrink: 0; height: 60rpx; padding: 0 28rpx; border-radius: 30rpx;
  background: var(--text-primary, #2c2c2c);
  display: flex; align-items: center;
}
.ai-btn:active { opacity: 0.85; }
.ai-btn-txt { font-size: 24rpx; font-weight: 500; color: #ffffff; }

/* 双 Tab */
.state-tabs { display: flex; gap: 40rpx; margin: 40rpx 40rpx 0; border-bottom: 1rpx solid var(--separator, #ede7dd); }
.state-tab { padding-bottom: 20rpx; position: relative; display: flex; align-items: center; gap: 10rpx; }
.state-tab-txt { font-size: 28rpx; color: var(--text-tertiary, #999999); }
.state-tab.active .state-tab-txt { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.state-tab.active::after {
  content: ""; position: absolute; left: 50%; transform: translateX(-50%);
  bottom: 0; width: 40rpx; height: 5rpx; border-radius: 4rpx; background: var(--brand, #c41e3a);
}
.n {
  min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 16rpx;
  background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.n-txt { color: #ffffff; font-size: 20rpx; font-weight: 600; }

.body { flex: 1; }

/* #38 AI 提炼入口条 */
.extract-bar {
  margin: 24rpx 32rpx 0; padding: 24rpx 28rpx;
  display: flex; align-items: center; gap: 20rpx;
  background: var(--bg-card, #ffffff);
  border: 2rpx solid rgba(201, 169, 110, 0.4);
  border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.extract-bar:active { opacity: 0.85; }
.extract-bar.disabled { opacity: 0.6; }
.extract-main { flex: 1; min-width: 0; }
.extract-title { display: block; font-size: 27rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.extract-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999999); margin-top: 2rpx; }

/* 候选卡 */
.cand-card {
  margin: 24rpx 32rpx 0; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); padding: 32rpx;
}
.cand-src { display: flex; align-items: center; gap: 10rpx; }
.cand-src-txt { font-size: 22rpx; color: var(--gold, #c9a96e); }
.cand-q { display: block; font-size: 28rpx; font-weight: 600; margin-top: 16rpx; line-height: 1.6; color: var(--text-primary, #2c2c2c); }
.cand-a { display: block; font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; margin-top: 12rpx; }
.cand-actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.btn {
  flex: 1; height: 72rpx; border-radius: 36rpx;
  display: flex; align-items: center; justify-content: center;
}
.btn:active { opacity: 0.85; }
.btn.disabled { opacity: 0.6; }
.btn.primary { background: var(--brand, #c41e3a); }
.btn.plain { background: var(--bg-warm, #f8f4ec); }
.btn-txt { font-size: 26rpx; font-weight: 500; }
.primary-txt { color: #ffffff; }
.plain-txt { color: var(--text-secondary, #6e6e73); }

/* 已入库列表 */
.entry-list {
  margin: 24rpx 32rpx 0; background: var(--bg-card, #ffffff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.entry-block + .entry-block { border-top: 1rpx solid var(--separator, #ede7dd); }
.entry-row { padding: 26rpx 32rpx; display: flex; align-items: center; gap: 20rpx; }
.entry-main { flex: 1; min-width: 0; }
.entry-q {
  display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.entry-meta { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 4rpx; }
.entry-more { flex-shrink: 0; padding: 8rpx; }
.entry-full { padding: 0 32rpx 26rpx; }
.entry-full-txt { font-size: 26rpx; color: var(--text-secondary, #6e6e73); line-height: 1.7; }
.entry-ops { display: flex; padding: 0 32rpx 24rpx; }
.entry-op {
  height: 56rpx; padding: 0 24rpx; border-radius: 28rpx;
  background: var(--brand-soft, rgba(196, 30, 58, 0.08));
  display: flex; align-items: center;
}
.entry-op:active { opacity: 0.8; }
.entry-op-txt { font-size: 24rpx; color: var(--brand, #c41e3a); }
.add-entry {
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 26rpx 32rpx; border-top: 1rpx solid var(--separator, #ede7dd);
}
.add-entry:active { background: var(--bg-warm, #f8f4ec); }
.add-entry-txt { font-size: 28rpx; color: var(--brand, #c41e3a); font-weight: 500; }

.kb-note { display: block; margin: 24rpx 40rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999999); line-height: 1.7; }

/* 三态 */
.state-view { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12rpx; padding: 100rpx 80rpx; }
.state-title { font-size: 30rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); margin-top: 8rpx; }
.state-desc { font-size: 26rpx; color: var(--text-tertiary, #999999); text-align: center; line-height: 1.7; }
.state-btn { margin-top: 24rpx; height: 72rpx; padding: 0 48rpx; border-radius: 36rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; }
.state-btn-txt { color: #ffffff; font-size: 26rpx; font-weight: 500; }
.spin { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 手动新增弹层 */
.mask {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(44, 44, 44, 0.45);
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; background: #ffffff; border-radius: 36rpx 36rpx 0 0;
  padding: 44rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box;
}
.sheet-title { display: block; font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.sheet-desc { display: block; font-size: 24rpx; color: var(--text-tertiary, #999999); margin-top: 8rpx; line-height: 1.6; }
.sheet-input {
  width: 100%; min-height: 180rpx; margin-top: 24rpx; padding: 22rpx 26rpx; box-sizing: border-box;
  border: 1rpx solid var(--separator, #ede7dd); border-radius: 16rpx;
  background: var(--bg-page, #faf8f5); font-size: 28rpx; line-height: 1.7;
  color: var(--text-primary, #2c2c2c);
}
.ph { color: var(--text-tertiary, #999999); }
.sheet-btns { display: flex; gap: 20rpx; margin-top: 32rpx; }

.safe-bottom { height: 60rpx; }
</style>
