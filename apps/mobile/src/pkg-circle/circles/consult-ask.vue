<script setup lang="ts">
/**
 * 图文提问 · 达人咨询 — V0 circle-consult-ask.html 还原（2026-07-10 批④）
 * 结构：顶栏(向XX提问·价格明示) → 提问方式切换(指定达人/悬赏) → 表单卡(标题100/正文500/附图)
 *       → 公开开关+围观价步进 → 担保说明 → 本圈大家都在问 → 吸底提交(扣费金额+余额明示)。
 * 数据：questionApi.ask 真连 POST /question/ask（事务扣币）；公开问答列表 GET /question?circleId&isPublic=true；
 *       余额 GET /coin/balance（getCoinBalance·失败隐藏余额行）；附图 chooseAndUploadImage 真传 COS。
 * 口径修正（后端为准·不照抄 V0）：
 *  - V0「围观收入你与达人各得 40%/平台 20%」与后端不符（围观收益全记回答者·比例走 SettlementRule）→ 不写比例。
 *  - 超时退款 48 小时（董事长拍板 2026-07-10 与悬赏统一·后端已改）；「7 天申诉」后端无 → 不写。
 * 悬赏 Tab：跳 pkg-bounty/create（真实承载页）带 circleId。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, redirectTo } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import { questionApi, getCoinBalance, splitQuestion, type PaidQuestion } from '@/lib/circle-consult-data'

const circleId = ref('')
const answererId = ref('')
const expertName = ref('')
const expertAvatar = ref('')
const priceCoin = ref(0)

const newTitle = ref('')
const newContent = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const isPublic = ref(true)
// 🔴 围观价由达人本人设定（从达人配置带出·只读），提问者不能改 —— 后端也只认达人配置。
//    0 表示达人未开放围观。
const peekPrice = ref(0)
const submitting = ref(false)
const balance = ref<number | null>(null)

// 本圈公开问答（勾起提问欲）
const loading = ref(true)
const listError = ref('')
const questions = ref<PaidQuestion[]>([])

const canAsk = computed(() => !!circleId.value && !!answererId.value && priceCoin.value >= 10)
const canSubmit = computed(() => canAsk.value && newTitle.value.trim().length >= 2 && newContent.value.trim().length > 0 && !submitting.value)

async function loadList() {
  if (!circleId.value) { loading.value = false; return }
  loading.value = true
  listError.value = ''
  try {
    const res = await questionApi.list({ circleId: circleId.value, isPublic: true, page: 1, pageSize: 20 })
    questions.value = res.items
  } catch (e) {
    listError.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadBalance() { balance.value = await getCoinBalance() }

async function addImage() {
  if (images.value.length >= 3 || uploading.value) return
  uploading.value = true
  try {
    const url = await chooseAndUploadImage()
    images.value = [...images.value, url].slice(0, 3)
  } catch (e) {
    const msg = (e as Error)?.message
    if (msg && msg !== '已取消') uni.showToast({ title: msg, icon: 'none' })
  } finally {
    uploading.value = false
  }
}
function removeImage(i: number) { images.value = images.value.filter((_, idx) => idx !== i) }

async function submit() {
  if (submitting.value) return
  if (!canAsk.value) { uni.showToast({ title: '请从达人「提问」入口进入', icon: 'none' }); return }
  if (newTitle.value.trim().length < 2) { uni.showToast({ title: '请填写问题标题', icon: 'none' }); return }
  if (!newContent.value.trim()) { uni.showToast({ title: '请填写问题描述', icon: 'none' }); return }
  submitting.value = true
  try {
    const q = await questionApi.ask({
      circleId: circleId.value,
      answererId: answererId.value,
      questionTitle: newTitle.value.trim(),
      question: newContent.value.trim(),
      priceCoin: priceCoin.value,
      isPublic: isPublic.value,
      // 围观价不传：后端一律以达人本人配置为准（提问者不能左右达人的收益）
      images: images.value,
    })
    uni.showToast({ title: '提问已提交，金币已托管', icon: 'success' })
    setTimeout(() => navigateTo(`/pkg-circle/circles/question-detail?id=${q.id}`), 600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

/** 悬赏提问：切到真实承载页 pkg-bounty/create（带圈子上下文） */
function goBounty() {
  redirectTo(`/pkg-bounty/create/index?circleId=${circleId.value}`)
}

function openDetail(id: string) { navigateTo(`/pkg-circle/circles/question-detail?id=${id}`) }
function qaTitle(q: PaidQuestion) { const p = splitQuestion(q.question); return p.title || p.body }

onLoad((opt) => {
  circleId.value = (opt?.circleId || opt?.id || '') as string
  answererId.value = (opt?.answererId || opt?.expertId || '') as string
  expertName.value = decodeURIComponent((opt?.expertName || '') as string)
  expertAvatar.value = decodeURIComponent((opt?.expertAvatar || '') as string)
  priceCoin.value = Number(opt?.priceCoin) || 0
  // 围观价直接取达人配置（0=达人未开放围观），提问者不可改
  peekPrice.value = Number(opt?.peekPriceCoin) || 0
  loadList()
  loadBalance()
})
</script>

<template>
  <view class="ca-page">
    <!-- 顶栏：向谁提问、花多少金币 -->
    <view class="ca-topbar">
      <view class="ca-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#2C2C2C" /></view>
      <text class="ca-title">{{ expertName ? `向${expertName}提问` : '图文提问' }}</text>
      <text v-if="priceCoin" class="ca-price">{{ priceCoin }} 金币/次</text>
    </view>

    <!-- 提问方式切换：指定达人 / 悬赏 -->
    <view class="ca-seg">
      <view class="ca-seg-btn is-active"><text class="ca-seg-t is-active">指定达人提问</text></view>
      <view class="ca-seg-btn" @tap="goBounty"><text class="ca-seg-t">悬赏提问</text></view>
    </view>

    <!-- 提问表单 -->
    <view class="ca-card">
      <view class="ca-field-label"><text class="ca-field-t">问题标题</text><text class="ca-count">{{ newTitle.length }} / 100</text></view>
      <input v-model="newTitle" class="ca-input-title" maxlength="100" placeholder="一句话说清你的问题" placeholder-class="ca-ph" />
      <view class="ca-field-label mt"><text class="ca-field-t">问题描述</text><text class="ca-count">{{ newContent.length }} / 500</text></view>
      <textarea v-model="newContent" class="ca-input-body" maxlength="500" placeholder="补充背景与细节，达人回答会更有针对性" placeholder-class="ca-ph" />
      <view class="ca-attach-row">
        <view v-for="(img, i) in images" :key="i" class="ca-attach-item">
          <image lazy-load class="ca-attach-img" :src="img" mode="aspectFill" />
          <view class="ca-attach-remove" @tap="removeImage(i)"><app-icon name="x-circle" :size="32" color="#2C2C2C" /></view>
        </view>
        <view v-if="images.length < 3" class="ca-attach-add" @tap="addImage">
          <app-icon name="plus" :size="36" color="#999999" />
          <text class="ca-attach-add-t">{{ uploading ? '上传中' : '添加图片' }}</text>
        </view>
      </view>
      <text class="ca-attach-tip">建议附上相关图片（最多 3 张），达人回答会更有针对性。</text>
    </view>

    <!-- 公开问答开关 + 围观价 -->
    <view class="ca-public">
      <view class="ca-switch-row" @tap="isPublic = !isPublic">
        <view class="ca-switch-main">
          <text class="ca-switch-name">公开此问答</text>
          <text class="ca-switch-desc">开启后其他成员可付费围观完整回答</text>
        </view>
        <view class="ca-switch" :class="{ 'is-on': isPublic }"><view class="ca-switch-dot" /></view>
      </view>
      <view v-if="isPublic" class="ca-peek-row">
        <view class="ca-peek-main">
          <text class="ca-peek-name">围观价</text>
          <text class="ca-peek-desc">{{ peekPrice > 0 ? '由达人设定' : '该达人未开放付费围观（公开后可免费围观）' }}</text>
        </view>
        <text class="ca-peek-price">{{ peekPrice > 0 ? peekPrice : '免费' }}<text v-if="peekPrice > 0" class="ca-peek-unit"> 金币</text></text>
      </view>
    </view>

    <!-- 担保与扣费说明（口径=后端真实规则） -->
    <text class="ca-assure"><text class="ca-assure-b">担保规则：</text>提问金币由平台托管，达人 48 小时内未回复将自动全额退还；达人拒答同样全额退还。</text>

    <view v-if="!canAsk" class="ca-warn">
      <app-icon name="alert-circle" :size="26" color="#C97B2D" />
      <text class="ca-warn-t">提问入口参数缺失（请从达人列表「提问」进入）</text>
    </view>

    <!-- 本圈大家都在问 -->
    <text class="ca-label">本圈大家都在问</text>
    <view v-if="loading" class="ca-state"><text class="ca-state-t">加载中…</text></view>
    <view v-else-if="listError" class="ca-state">
      <text class="ca-state-t">{{ listError }}</text>
      <view class="ca-retry" @tap="loadList"><text class="ca-retry-t">重试</text></view>
    </view>
    <view v-else-if="questions.length === 0" class="ca-state"><text class="ca-state-t">暂无公开问答</text></view>
    <template v-else>
      <view v-for="q in questions" :key="q.id" class="ca-qa" @tap="openDetail(q.id)">
        <text class="ca-qa-q">{{ qaTitle(q) }}</text>
        <view class="ca-qa-meta">
          <text class="ca-qa-m">{{ q.answerer?.nickname || '达人' }} {{ q.status === 'ANSWERED' ? '已答' : '待答' }}</text>
          <text v-if="q.peekCount" class="ca-qa-gold">{{ q.peekCount }} 人围观</text>
        </view>
      </view>
    </template>

    <!-- 吸底提交：扣费金额明示 -->
    <view class="ca-submit-bar">
      <text class="ca-submit-note">提交即从钱包扣除 <text class="ca-note-b">{{ priceCoin }} 金币</text><template v-if="balance !== null">（当前余额 {{ balance }} 金币）</template> · 由平台托管至回答完成</text>
      <view class="ca-submit-btn" :class="{ 'is-disabled': !canSubmit }" @tap="submit">
        <text class="ca-submit-t">{{ submitting ? '提交中…' : `确认支付 ${priceCoin} 金币并提问` }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ca-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 260rpx; }

/* 顶栏 */
.ca-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.ca-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.ca-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ca-price { flex-shrink: 0; font-size: 26rpx; color: var(--gold, #c9a96e); font-weight: 700; }

/* 方式切换 */
.ca-seg { display: flex; margin: 28rpx 32rpx 0; padding: 6rpx; background: var(--bg-warm, #f8f4ec); border-radius: 24rpx; }
.ca-seg-btn { flex: 1; height: 68rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.ca-seg-btn.is-active { background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.ca-seg-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.ca-seg-t.is-active { color: var(--text-primary, #2c2c2c); font-weight: 600; }

/* 表单卡 */
.ca-card {
  margin: 24rpx 32rpx 0; padding: 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ca-field-label { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.ca-field-label.mt { margin-top: 28rpx; }
.ca-field-t { font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.ca-count { font-size: 22rpx; color: var(--text-tertiary, #999); }
.ca-input-title {
  width: 100%; box-sizing: border-box; background: transparent;
  font-size: 30rpx; font-weight: 500; color: var(--text-primary, #2c2c2c);
  padding-bottom: 24rpx; border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.ca-input-body {
  width: 100%; box-sizing: border-box; background: transparent;
  font-size: 28rpx; line-height: 1.8; color: var(--text-primary, #2c2c2c);
  min-height: 220rpx;
}
.ca-ph { color: var(--text-tertiary, #999); }
.ca-attach-row { display: flex; gap: 20rpx; margin-top: 24rpx; flex-wrap: wrap; }
.ca-attach-item { position: relative; width: 144rpx; height: 144rpx; }
.ca-attach-img { width: 144rpx; height: 144rpx; border-radius: 16rpx; }
.ca-attach-remove { position: absolute; top: -14rpx; right: -14rpx; background: #fff; border-radius: 999rpx; }
.ca-attach-add {
  width: 144rpx; height: 144rpx; border-radius: 16rpx;
  border: 1rpx dashed var(--separator, #ede7dd);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx;
}
.ca-attach-add-t { font-size: 20rpx; color: var(--text-tertiary, #999); }
.ca-attach-tip { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 16rpx; line-height: 1.6; }

/* 公开开关 + 围观价 */
.ca-public {
  margin: 24rpx 32rpx 0;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}
.ca-switch-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; }
.ca-switch-main { flex: 1; min-width: 0; }
.ca-switch-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.ca-switch-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; line-height: 1.6; }
.ca-switch { width: 92rpx; height: 54rpx; border-radius: 28rpx; background: var(--separator, #ede7dd); position: relative; flex-shrink: 0; transition: background 0.2s; }
.ca-switch.is-on { background: var(--brand, #c41e3a); }
.ca-switch-dot { position: absolute; top: 5rpx; left: 5rpx; width: 44rpx; height: 44rpx; border-radius: 999rpx; background: #fff; box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15); transition: transform 0.2s; }
.ca-switch.is-on .ca-switch-dot { transform: translateX(38rpx); }
.ca-peek-row { display: flex; align-items: center; gap: 24rpx; padding: 28rpx 32rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.ca-peek-main { flex: 1; min-width: 0; }
.ca-peek-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); }
.ca-peek-desc { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; }
.ca-stepper { display: flex; flex-shrink: 0; }
.ca-step-btn { width: 52rpx; height: 52rpx; border: 1rpx solid var(--separator, #ede7dd); background: var(--bg-card, #fff); display: flex; align-items: center; justify-content: center; }
.ca-step-btn:first-child { border-radius: 14rpx 0 0 14rpx; }
.ca-step-btn:last-child { border-radius: 0 14rpx 14rpx 0; border-left: none; }
.ca-peek-price { flex-shrink: 0; font-size: 30rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.ca-peek-unit { font-size: 20rpx; font-weight: 400; color: var(--text-tertiary, #999); }

/* 担保说明 */
.ca-assure { display: block; margin: 24rpx 40rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.7; }
.ca-assure-b { color: var(--text-secondary, #6e6e73); font-weight: 600; }
.ca-warn { display: flex; align-items: center; gap: 12rpx; margin: 20rpx 32rpx 0; padding: 20rpx 24rpx; background: rgba(201, 123, 45, 0.08); border-radius: 20rpx; }
.ca-warn-t { font-size: 22rpx; color: #c97b2d; }

/* 公开问答列表 */
.ca-label { display: block; margin: 40rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.ca-state { padding: 60rpx 0; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.ca-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.ca-retry { padding: 12rpx 48rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.ca-retry-t { font-size: 26rpx; color: #fff; }
.ca-qa {
  margin: 0 32rpx 20rpx; padding: 26rpx 32rpx;
  background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.ca-qa-q { display: block; font-size: 26rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); line-height: 1.6; }
.ca-qa-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.ca-qa-m { font-size: 22rpx; color: var(--text-tertiary, #999); }
.ca-qa-gold { font-size: 22rpx; color: var(--gold, #c9a96e); }

/* 吸底提交 */
.ca-submit-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 20rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.ca-submit-note { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); text-align: center; margin-bottom: 16rpx; }
.ca-note-b { color: var(--gold, #c9a96e); font-weight: 700; }
.ca-submit-btn {
  height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a);
  display: flex; align-items: center; justify-content: center;
}
.ca-submit-btn.is-disabled { opacity: 0.5; }
.ca-submit-btn:active { opacity: 0.88; }
.ca-submit-t { font-size: 30rpx; font-weight: 600; letter-spacing: 2rpx; color: #fff; }
</style>
