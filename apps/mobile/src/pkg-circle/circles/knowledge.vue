<script setup lang="ts">
/**
 * 圈子知识库（从原型 app/circles/[id]/knowledge/page.tsx 高保真迁移）
 * 顶栏+搜索 + 已入库/待确认双Tab + 知识卡片(展开详情/标签/来源) + 圈主确认入库/忽略操作
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

interface KnowledgeItem {
  id: string
  title: string
  summary: string
  content: string
  source: { type: 'post' | 'article' | 'manual'; id?: string; name: string }
  status: 'confirmed' | 'pending'
  tags: string[]
  createdAt: string
}

const SOURCE_LABEL: Record<string, string> = { post: '帖子', article: '文章', manual: '手动' }

const activeTab = ref<'confirmed' | 'pending'>('confirmed')
const keyword = ref('')
const isOwner = ref(true)
const expandedId = ref<string | null>(null)

const allItems = ref<KnowledgeItem[]>([
  {
    id: '1',
    title: '八字命理中的天干地支基础知识',
    summary: '天干地支是中国古代记录时间的系统，由十天干和十二地支组成。天干包括甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支包括子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。',
    content: '天干地支是中国古代记录时间的系统，由十天干和十二地支组成。\n\n天干包括：甲、乙、丙、丁、戊、己、庚、辛、壬、癸\n地支包括：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥\n\n天干与五行的对应关系：\n- 甲乙属木\n- 丙丁属火\n- 戊己属土\n- 庚辛属金\n- 壬癸属水',
    source: { type: 'post', id: 'p1', name: '周易大师的帖子' },
    status: 'confirmed',
    tags: ['八字', '天干地支', '基础'],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: '紫微斗数十二宫位详解',
    summary: '紫微斗数的命盘由十二个宫位组成，分别是命宫、兄弟宫、夫妻宫、子女宫、财帛宫、疾厄宫、迁移宫、奴仆宫、官禄宫、田宅宫、福德宫、父母宫。',
    content: '紫微斗数的命盘由十二个宫位组成：\n\n1. 命宫 - 代表个人性格特质\n2. 兄弟宫 - 兄弟姐妹关系\n3. 夫妻宫 - 婚姻感情\n4. 子女宫 - 子女缘分\n5. 财帛宫 - 财运状况\n6. 疾厄宫 - 健康状况\n7. 迁移宫 - 外出运势\n8. 奴仆宫 - 人际关系\n9. 官禄宫 - 事业发展\n10. 田宅宫 - 不动产\n11. 福德宫 - 精神生活\n12. 父母宫 - 与长辈关系',
    source: { type: 'article', id: 'a1', name: '紫微斗数入门' },
    status: 'confirmed',
    tags: ['紫微斗数', '宫位'],
    createdAt: '2024-01-14T15:30:00Z',
  },
  {
    id: '3',
    title: '风水中的五行生克关系',
    summary: '五行相生：木生火、火生土、土生金、金生水、水生木。五行相克：木克土、土克水、水克火、火克金、金克木。理解五行生克是风水学的基础。',
    content: '五行生克关系是风水学的核心理论：\n\n五行相生（循环促进）：\n- 木生火：木材燃烧产生火\n- 火生土：火燃烧后产生灰土\n- 土生金：金属从土中开采\n- 金生水：金属遇冷凝结水珠\n- 水生木：水滋润树木生长\n\n五行相克（相互制约）：\n- 木克土：树根破土\n- 土克水：土能阻挡水流\n- 水克火：水能灭火\n- 火克金：火能熔化金属\n- 金克木：金属能砍伐树木',
    source: { type: 'manual', name: '管理员整理' },
    status: 'confirmed',
    tags: ['风水', '五行'],
    createdAt: '2024-01-13T09:00:00Z',
  },
  {
    id: '4',
    title: '六爻预测的基本起卦方法',
    summary: '六爻预测以铜钱摇卦为主要起卦方式，三枚铜钱摇六次得六爻，从下往上排列成卦，再根据装卦、配六亲、定世应进行分析。',
    content: '六爻预测的起卦步骤：\n\n1. 准备三枚铜钱，心中默念所求之事\n2. 摇卦六次，每次记录正反\n3. 从下往上排列六爻\n4. 装天干地支、配六亲\n5. 定世应、看用神\n6. 综合分析吉凶',
    source: { type: 'post', id: 'p2', name: '六爻爱好者的帖子' },
    status: 'pending',
    tags: ['六爻', '起卦'],
    createdAt: '2024-01-16T11:00:00Z',
  },
])

const filteredItems = computed(() =>
  allItems.value.filter(
    (it) =>
      it.status === activeTab.value &&
      (!keyword.value || it.title.includes(keyword.value) || it.summary.includes(keyword.value)),
  ),
)

const pendingCount = computed(() => (isOwner.value ? allItems.value.filter((it) => it.status === 'pending').length : 0))

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}
function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
function confirmItem(id: string) {
  const it = allItems.value.find((x) => x.id === id)
  if (it) it.status = 'confirmed'
  uni.showToast({ title: '已确认入库', icon: 'success' })
}
function ignoreItem(id: string) {
  allItems.value = allItems.value.filter((x) => x.id !== id)
  uni.showToast({ title: '已忽略', icon: 'none' })
}
</script>

<template>
  <view class="kb">
    <!-- 顶部固定区 -->
    <view class="kb-top">
      <view class="kb-nav">
        <view class="kb-nav-btn" @tap="goBack"><app-icon name="chevron-left" :size="44" color="#2C2C2C" /></view>
        <text class="kb-nav-title">知识库</text>
        <view class="kb-nav-btn" />
      </view>

      <!-- 搜索框 -->
      <view class="kb-search-wrap">
        <view class="kb-search">
          <app-icon name="search" :size="30" color="#999999" />
          <input v-model="keyword" class="kb-search-input" placeholder="搜索知识..." placeholder-class="kb-ph" />
        </view>
      </view>

      <!-- Tab -->
      <view class="kb-tabs">
        <view class="kb-tab" :class="{ on: activeTab === 'confirmed' }" @tap="activeTab = 'confirmed'">
          <app-icon name="book-open" :size="28" :color="activeTab === 'confirmed' ? '#C41E3A' : '#666666'" />
          <text class="kb-tab-t" :class="{ on: activeTab === 'confirmed' }">已入库</text>
        </view>
        <view v-if="isOwner" class="kb-tab" :class="{ on: activeTab === 'pending' }" @tap="activeTab = 'pending'">
          <text class="kb-tab-t" :class="{ on: activeTab === 'pending' }">待确认</text>
          <view v-if="pendingCount > 0" class="kb-badge"><text class="kb-badge-t">{{ pendingCount }}</text></view>
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="kb-body">
      <view v-if="filteredItems.length === 0" class="kb-empty">
        <view class="kb-empty-icon"><app-icon name="book-open" :size="48" color="#C9A96E" /></view>
        <text class="kb-empty-t">{{ activeTab === 'confirmed' ? '暂无知识内容' : '暂无待确认内容' }}</text>
      </view>

      <view v-else class="kb-list">
        <view v-for="item in filteredItems" :key="item.id" class="kb-card">
          <view class="kb-card-body">
            <!-- 标题行 -->
            <view class="kb-card-head">
              <text class="kb-card-title">{{ item.title }}</text>
              <view v-if="item.status === 'pending'" class="kb-pending"><text class="kb-pending-t">待确认</text></view>
            </view>
            <!-- 摘要 -->
            <text class="kb-card-summary">{{ item.summary }}</text>
            <!-- 标签 -->
            <view v-if="item.tags.length" class="kb-tags">
              <view v-for="(t, i) in item.tags.slice(0, 3)" :key="i" class="kb-tag">
                <app-icon name="tag" :size="20" color="#666666" />
                <text class="kb-tag-t">{{ t }}</text>
              </view>
              <text v-if="item.tags.length > 3" class="kb-tag-more">+{{ item.tags.length - 3 }}</text>
            </view>
            <!-- 来源与时间 -->
            <view class="kb-meta">
              <view class="kb-meta-l">
                <app-icon name="file-text" :size="24" color="#999999" />
                <text class="kb-meta-t">{{ SOURCE_LABEL[item.source.type] }}：{{ item.source.name }}</text>
              </view>
              <view class="kb-meta-r">
                <app-icon name="clock" :size="24" color="#999999" />
                <text class="kb-meta-t">{{ fmtDate(item.createdAt) }}</text>
              </view>
            </view>
            <!-- 展开详情 -->
            <view v-if="expandedId === item.id" class="kb-detail">
              <text class="kb-detail-t">{{ item.content }}</text>
            </view>
            <!-- 展开/收起 -->
            <view class="kb-toggle" @tap="toggleExpand(item.id)">
              <text class="kb-toggle-t">{{ expandedId === item.id ? '收起' : '查看详情' }}</text>
              <app-icon :name="expandedId === item.id ? 'chevron-up' : 'chevron-down'" :size="28" color="#C41E3A" />
            </view>
          </view>
          <!-- 圈主操作 -->
          <view v-if="isOwner && item.status === 'pending'" class="kb-actions">
            <view class="kb-action" @tap="ignoreItem(item.id)">
              <app-icon name="x" :size="28" color="#999999" /><text class="kb-action-t ignore">忽略</text>
            </view>
            <view class="kb-action-div" />
            <view class="kb-action" @tap="confirmItem(item.id)">
              <app-icon name="check" :size="28" color="#C41E3A" /><text class="kb-action-t confirm">确认入库</text>
            </view>
          </view>
        </view>
      </view>
      <view class="kb-spacer" />
    </scroll-view>
  </view>

  </view>
  </view>
  </view>
</template>

<style scoped lang="scss">
.kb { display: flex; flex-direction: column; height: 100vh; background: #faf8f5; }
.kb-top { background: #ffffff; border-bottom: 2rpx solid #e8e3db; flex-shrink: 0; padding-top: var(--status-bar-height, 0); }
.kb-nav { display: flex; align-items: center; justify-content: space-between; height: 88rpx; padding: 0 16rpx; }
.kb-nav-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.kb-nav-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.kb-search-wrap { padding: 0 24rpx 18rpx; }
.kb-search { display: flex; align-items: center; gap: 12rpx; height: 72rpx; padding: 0 24rpx; background: #faf8f5; border-radius: 999rpx; }
.kb-search-input { flex: 1; font-size: 26rpx; color: #2c2c2c; }
.kb-ph { color: #999999; }
.kb-tabs { display: flex; padding: 0 24rpx; }
.kb-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 80rpx; border-bottom: 4rpx solid transparent; position: relative; }
.kb-tab.on { border-bottom-color: #c41e3a; }
.kb-tab-t { font-size: 26rpx; color: #666666; font-weight: 500; }
.kb-tab-t.on { color: #c41e3a; }
.kb-badge { position: absolute; top: 10rpx; right: 28%; min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.kb-badge-t { font-size: 20rpx; color: #ffffff; }
.kb-body { flex: 1; overflow: hidden; }
.kb-list { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.kb-card { background: #ffffff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.kb-card-body { padding: 24rpx; }
.kb-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; margin-bottom: 12rpx; }
.kb-card-title { flex: 1; font-size: 30rpx; font-weight: 600; color: #2c2c2c; line-height: 1.4; }
.kb-pending { padding: 2rpx 12rpx; background: #fff0e0; border-radius: 999rpx; flex-shrink: 0; }
.kb-pending-t { font-size: 20rpx; color: #e8820c; }
.kb-card-summary { display: block; font-size: 26rpx; color: #666666; line-height: 1.6; margin-bottom: 18rpx; }
.kb-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 12rpx; margin-bottom: 18rpx; }
.kb-tag { display: flex; align-items: center; gap: 4rpx; padding: 4rpx 14rpx; background: #faf8f5; border-radius: 999rpx; }
.kb-tag-t { font-size: 20rpx; color: #666666; }
.kb-tag-more { font-size: 20rpx; color: #999999; }
.kb-meta { display: flex; align-items: center; justify-content: space-between; }
.kb-meta-l, .kb-meta-r { display: flex; align-items: center; gap: 6rpx; }
.kb-meta-t { font-size: 22rpx; color: #999999; }
.kb-detail { margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #e8e3db; }
.kb-detail-t { font-size: 26rpx; color: #666666; line-height: 1.6; white-space: pre-wrap; }
.kb-toggle { margin-top: 18rpx; display: flex; align-items: center; justify-content: center; gap: 6rpx; padding: 12rpx 0; }
.kb-toggle-t { font-size: 26rpx; color: #c41e3a; }
.kb-actions { display: flex; border-top: 2rpx solid #e8e3db; }
.kb-action { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 22rpx 0; }
.kb-action-div { width: 2rpx; background: #e8e3db; }
.kb-action-t { font-size: 26rpx; }
.kb-action-t.ignore { color: #999999; }
.kb-action-t.confirm { color: #c41e3a; }
.kb-empty { display: flex; flex-direction: column; align-items: center; padding-top: 160rpx; }
.kb-empty-icon { width: 128rpx; height: 128rpx; border-radius: 999rpx; background: #faf8f5; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.kb-empty-t { font-size: 26rpx; color: #999999; }
.kb-spacer { height: 40rpx; }
</style>
