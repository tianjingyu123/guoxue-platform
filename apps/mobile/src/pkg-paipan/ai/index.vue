<script setup lang="ts">
/**
 * AI 智能解盘（排盘首页那张 AI 卡片的落地页）
 *
 * 此前这条路由指向 coming-soon —— 但后端的 AI 解盘能力其实早就建好了
 * （POST /paipan/bazi/analyze、多流派点评、分析结果存档、会员额度校验），
 * 只是前端一个页面都没接上，白建了一套能力。这里把它接起来。
 *
 * 🔴 AI 只解读，不算盘：盘面是后端已存档的排盘记录（引擎算的），
 * AI 拿到的是算好的结果。合规红线由后端 prompt 内置（不断生死、不诊病、不承诺）。
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { apiGet, apiPost } from '@/utils/request'
import { navigateTo } from '@/utils/router'

/** AI 师徒流派（后端 BAZI_SCHOOL_IDS；缺省=通用分析） */
const SCHOOLS = [
  { key: '', label: '通用分析', desc: '综合断法，稳妥全面' },
  { key: 'ziping', label: '子平格局派', desc: '以格局用神论命' },
  { key: 'mangpai', label: '盲派', desc: '重象法与口诀' },
  { key: 'xinpai', label: '新派应用', desc: '偏实务与应期' },
]

const loading = ref(true)
const failed = ref(false)
const records = ref<any[]>([])
const picked = ref<any>(null)
const school = ref('')
const analyzing = ref(false)
const result = ref<any>(null)

async function loadRecords() {
  loading.value = true
  failed.value = false
  try {
    const res = await apiGet<any>('/paipan/bazi?page=1&pageSize=30')
    records.value = res?.items ?? res?.list ?? (Array.isArray(res) ? res : [])
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadRecords)

async function analyze() {
  if (!picked.value) {
    uni.showToast({ title: '请先选一个盘', icon: 'none' })
    return
  }
  analyzing.value = true
  result.value = null
  try {
    const res = await apiPost<any>(
      '/paipan/bazi/analyze',
      { recordId: picked.value.id, school: school.value || undefined },
      undefined,
      90000, // AI 生成慢，给足超时
    )
    result.value = res
  } catch (e: any) {
    // 会员额度/限流的话术由后端给，原样透出，不自己编
    uni.showModal({
      title: '解盘未完成',
      content: e?.message || 'AI 服务暂不可用，请稍后再试',
      showCancel: false,
    })
  } finally {
    analyzing.value = false
  }
}

function goBazi() {
  navigateTo('/paipan/bazi')
}

function birthText(r: any): string {
  const y = r.year ?? r.birthYear
  const m = r.month ?? r.birthMonth
  const d = r.day ?? r.birthDay
  if (!y || !m || !d) return ''
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 分析正文：后端可能给 content / analysis / 分段结构，尽量都兜住 */
function bodyOf(res: any): string {
  if (!res) return ''
  if (typeof res.content === 'string') return res.content
  if (typeof res.analysis === 'string') return res.analysis
  if (typeof res.result === 'string') return res.result
  if (typeof res.text === 'string') return res.text
  return ''
}
</script>

<template>
  <view class="ai">
    <ToolHeader title="AI 智能解盘" subtitle="选盘 · 择流派 · 深度解读" />

    <scroll-view class="ai-body" scroll-y :show-scrollbar="false">
      <!-- 1. 选盘 -->
      <PaperCard padding="lg">
        <SectionTitle title="选择要解的盘" subtitle="来自你保存过的八字排盘记录" />

        <view v-if="loading" class="ai-skeleton" />

        <view v-else-if="failed" class="ai-failed" @tap="loadRecords">
          <text class="ai-failed-txt">加载失败，点击重试</text>
        </view>

        <view v-else-if="!records.length" class="ai-empty">
          <AppIcon name="compass" :size="40" color="#D5C9B8" />
          <text class="ai-empty-txt">还没有保存过的排盘记录</text>
          <text class="ai-empty-sub">先去八字排盘起一盘并保存，再回来解盘</text>
          <view class="ai-btn ai-btn--ghost" @tap="goBazi">
            <text class="ai-btn-txt ai-btn-txt--ghost">去八字排盘</text>
          </view>
        </view>

        <view v-else class="ai-records">
          <view
            v-for="r in records"
            :key="r.id"
            class="ai-record"
            :class="{ 'ai-record--on': picked?.id === r.id }"
            @tap="picked = r; result = null"
          >
            <view class="ai-record-avatar">{{ (r.name || '盘').slice(0, 1) }}</view>
            <view class="ai-record-info">
              <text class="ai-record-name">{{ r.name || '未命名' }}</text>
              <text class="ai-record-birth">{{ birthText(r) }}{{ r.gender ? ` · ${r.gender}` : '' }}</text>
            </view>
            <AppIcon
              v-if="picked?.id === r.id"
              name="check-circle"
              :size="20"
              color="#C41E3A"
            />
          </view>
        </view>
      </PaperCard>

      <!-- 2. 选流派 -->
      <PaperCard v-if="records.length" padding="lg">
        <SectionTitle title="选择流派" subtitle="不同流派断法不同，可分别看" />
        <view class="ai-schools">
          <view
            v-for="s in SCHOOLS"
            :key="s.key"
            class="ai-school"
            :class="{ 'ai-school--on': school === s.key }"
            @tap="school = s.key; result = null"
          >
            <text class="ai-school-label" :class="{ 'ai-school-label--on': school === s.key }">{{ s.label }}</text>
            <text class="ai-school-desc" :class="{ 'ai-school-desc--on': school === s.key }">{{ s.desc }}</text>
          </view>
        </view>

        <view class="ai-btn ai-btn--primary" @tap="analyze">
          <AppIcon name="sparkles" :size="18" color="#fff" />
          <text class="ai-btn-txt ai-btn-txt--primary">{{ analyzing ? 'AI 解读中…' : '开始解盘' }}</text>
        </view>
      </PaperCard>

      <!-- 3. 解读结果 -->
      <PaperCard v-if="result" gold padding="lg">
        <SectionTitle
          title="AI 解读"
          :subtitle="SCHOOLS.find((s) => s.key === school)?.label || '通用分析'"
        />
        <text class="ai-result">{{ bodyOf(result) || '（本次未返回解读内容）' }}</text>
      </PaperCard>

      <view v-if="result" class="ai-disc">
        <Disclaimer variant="fortune" tone="card" />
      </view>

      <view class="ai-space" />
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.ai {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F7F3EC;
}

.ai-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.ai-body > * {
  margin-bottom: 24rpx;
}

/* 记录 */
.ai-records {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}

.ai-record {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.1);
  border-radius: 12rpx;
  background: #fff;
}

.ai-record--on {
  border-color: #C41E3A;
  background: rgba(196, 30, 58, 0.04);
}

.ai-record-avatar {
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

.ai-record-info {
  flex: 1;
  min-width: 0;
}

.ai-record-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.ai-record-birth {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

/* 流派 */
.ai-schools {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-top: 24rpx;
}

.ai-school {
  padding: 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.12);
  border-radius: 12rpx;
  background: #fff;
}

.ai-school--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

.ai-school-label {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.ai-school-label--on {
  color: #fff;
}

.ai-school-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #9A8C7E;
}

.ai-school-desc--on {
  color: rgba(255, 255, 255, 0.85);
}

/* 结果 */
.ai-result {
  display: block;
  margin-top: 24rpx;
  font-size: 27rpx;
  line-height: 2;
  color: #3A2A1E;
  white-space: pre-wrap;
}

.ai-disc {
  margin-bottom: 24rpx;
}

/* 通用 */
.ai-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  height: 92rpx;
  margin-top: 32rpx;
  border-radius: 46rpx;
}

.ai-btn--primary {
  background: #C41E3A;
}

.ai-btn--ghost {
  border: 1rpx solid rgba(196, 30, 58, 0.4);
}

.ai-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
}

.ai-btn-txt--primary {
  color: #fff;
}

.ai-btn-txt--ghost {
  color: #C41E3A;
}

.ai-skeleton {
  height: 240rpx;
  margin-top: 24rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.1);
}

.ai-failed {
  padding: 48rpx;
  text-align: center;
}

.ai-failed-txt {
  font-size: 26rpx;
  color: #C41E3A;
}

.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 24rpx 24rpx;
}

.ai-empty-txt {
  font-size: 28rpx;
  color: #7A6C5E;
}

.ai-empty-sub {
  font-size: 22rpx;
  color: #B8AA9A;
  text-align: center;
}

.ai-empty .ai-btn {
  width: 100%;
}

.ai-space {
  height: 40rpx;
}
</style>
