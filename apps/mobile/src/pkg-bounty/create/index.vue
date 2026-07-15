<script setup lang="ts">
/**
 * 悬赏提问 · 发布页 — V0 circle-consult-bounty-ask.html 还原（2026-07-10 批④）
 * 结构：顶栏 → 提问方式切换(圈子上下文时显示) → 表单卡(标题/描述/附图) → 悬赏金额(金色主视觉·
 *       快捷档位+自定义) → 悬赏规则(扣费前完整披露·按后端真实规则) → 分类 → 吸底提交(余额明示+确认弹层)。
 * 数据：bountyApi.create 真连 POST /bounty/questions（事务冻结赏金）；余额 GET /coin/balance；
 *       circleId 入参透传（后端 CreateBountyDto.circleId 真字段）。
 * 口径修正（后端为准·记台账）：
 *  - V0「竞答有效期 24h/3d/7d」后端无有效期字段（无自动到期退回）→ 不做；
 *  - V0「多位达人竞答·平均 4.2 条回答」与后端单人抢答模型（claim 锁定 72h·单一回答）不符 → 规则文案按后端；
 *  - 「存草稿」无后端 → 不做。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, redirectTo, navigateBack } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import { getCoinBalance } from '@/lib/circle-consult-data'
import {
  bountyApi,
  BOUNTY_CATEGORY_OPTIONS,
  BOUNTY_CATEGORY_LABEL,
  type BountyCategory,
} from '@/lib/bounty-data'

const amountPresets = [50, 100, 200]
const categoryOptions = BOUNTY_CATEGORY_OPTIONS

const circleId = ref('')
const title = ref('')
const description = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const selectedAmount = ref(100)
const customAmount = ref('')
const isCustom = ref(false)
const category = ref<BountyCategory>('GENERAL')
const showPayConfirm = ref(false)
const submitting = ref(false)
const errors = ref<Record<string, string>>({})
const balance = ref<number | null>(null)

const finalAmount = computed(() => (isCustom.value ? parseInt(customAmount.value) || 0 : selectedAmount.value))
const categoryLabel = computed(() => BOUNTY_CATEGORY_LABEL[category.value])

function selectAmount(amount: number) {
  selectedAmount.value = amount
  isCustom.value = false
  errors.value.amount = ''
}
function enableCustom() {
  isCustom.value = true
  errors.value.amount = ''
}

async function addImage() {
  if (images.value.length >= 9 || uploading.value) return
  uploading.value = true
  try {
    const url = await chooseAndUploadImage()
    images.value = [...images.value, url].slice(0, 9)
  } catch (e) {
    const msg = (e as Error)?.message
    if (msg && msg !== '已取消') uni.showToast({ title: msg, icon: 'none' })
  } finally {
    uploading.value = false
  }
}
function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function validate() {
  const e: Record<string, string> = {}
  if (!title.value.trim()) e.title = '请填写悬赏标题'
  else if (title.value.trim().length < 10) e.title = '标题至少10个字'
  if (!description.value.trim()) e.description = '请填写问题描述'
  else if (description.value.trim().length < 20) e.description = '描述至少20个字'
  if (finalAmount.value < 10) e.amount = '最低悬赏金额为 10 金币'
  else if (finalAmount.value > 10000) e.amount = '最高悬赏金额为 10000 金币'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return
  showPayConfirm.value = true
}

async function confirmPay() {
  if (submitting.value) return
  submitting.value = true
  try {
    await bountyApi.create({
      title: title.value.trim(),
      description: description.value.trim(),
      bountyCoin: finalAmount.value,
      category: category.value,
      images: images.value,
      circleId: circleId.value || undefined,
    })
    showPayConfirm.value = false
    uni.showToast({ title: '发布成功，赏金已托管', icon: 'success' })
    setTimeout(() => navigateTo('/bounty'), 800)
  } catch (err) {
    showPayConfirm.value = false
    const msg = (err as Error)?.message || '发布失败'
    // 余额不足给充值引导，其余异常直接 toast 后端 message
    if (msg.includes('余额') || msg.includes('不足')) {
      uni.showModal({
        title: '金币余额不足',
        content: `本次需 ${finalAmount.value} 金币，余额不足，是否前往充值？`,
        confirmText: '去充值',
        success: (res) => { if (res.confirm) navigateTo('/wallet/recharge') },
      })
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    submitting.value = false
  }
}

/** 指定达人提问：切回圈内达人列表（仅圈子上下文进入时显示） */
function goDirectAsk() {
  redirectTo(`/pkg-circle/circles/consult-experts?circleId=${circleId.value}`)
}

function goBack() { navigateBack() }

onLoad(async (opt) => {
  circleId.value = (opt?.circleId || '') as string
  balance.value = await getCoinBalance()
})
</script>

<template>
  <view class="bc-page">
    <!-- 顶栏 -->
    <view class="bc-topbar">
      <view class="bc-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="bc-title">发起提问</text>
    </view>

    <!-- 提问方式：与指定达人提问并列（圈子上下文时显示切换） -->
    <view v-if="circleId" class="bc-seg">
      <view class="bc-seg-btn" @tap="goDirectAsk"><text class="bc-seg-t">指定达人提问</text></view>
      <view class="bc-seg-btn is-active"><text class="bc-seg-t is-active">悬赏提问</text></view>
    </view>
    <text class="bc-hint">悬赏提问公开发布，达人抢答；你确认满意的回答后，悬赏金币归答主。</text>

    <!-- 问题表单 -->
    <view class="bc-card">
      <view class="bc-field">
        <view class="bc-field-head"><text class="bc-field-label">问题标题</text><text class="bc-count">{{ title.length }}/50</text></view>
        <input
          v-model="title" class="bc-input-title" :maxlength="50"
          placeholder="请用一句话概括你的问题（10-50字）" placeholder-class="bc-ph"
          @input="errors.title = ''"
        />
        <view v-if="errors.title" class="bc-err"><app-icon name="alert-circle" :size="24" color="#C41E3A" /><text class="bc-err-t">{{ errors.title }}</text></view>
      </view>
      <view class="bc-field bordered">
        <view class="bc-field-head"><text class="bc-field-label">问题描述</text><text class="bc-count">{{ description.length }}/500</text></view>
        <textarea
          v-model="description" class="bc-input-body" :maxlength="500"
          placeholder="详细描述你的问题，可补充背景信息，有助于获得更好的回答（20-500字）" placeholder-class="bc-ph"
          @input="errors.description = ''"
        />
        <view v-if="errors.description" class="bc-err"><app-icon name="alert-circle" :size="24" color="#C41E3A" /><text class="bc-err-t">{{ errors.description }}</text></view>
      </view>
      <view class="bc-field bordered">
        <text class="bc-field-label">附图（选填，最多 9 张，配图更容易获得高质量回答）</text>
        <view class="bc-attach-row">
          <view v-for="(img, index) in images" :key="index" class="bc-attach-item">
            <image lazy-load :src="img" class="bc-attach-img" mode="aspectFill" />
            <view class="bc-attach-remove" @tap="removeImage(index)"><app-icon name="x-circle" :size="32" color="#2C2C2C" /></view>
          </view>
          <view v-if="images.length < 9" class="bc-attach-add" @tap="addImage">
            <app-icon name="plus" :size="34" color="#999999" />
            <text class="bc-attach-add-t">{{ uploading ? '上传中' : '添加' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 悬赏金额：金色主视觉 -->
    <view class="bc-bounty-card">
      <view class="bc-bounty-head">
        <text class="bc-bounty-t">悬赏金额</text>
        <text class="bc-bounty-amount">{{ finalAmount }} <text class="bc-bounty-unit">金币</text></text>
      </view>
      <view class="bc-chips">
        <view
          v-for="amount in amountPresets" :key="amount"
          class="bc-chip" :class="{ 'is-active': !isCustom && selectedAmount === amount }"
          @tap="selectAmount(amount)"
        >
          <text class="bc-chip-t" :class="{ 'is-active': !isCustom && selectedAmount === amount }">{{ amount }}</text>
        </view>
        <view class="bc-chip" :class="{ 'is-active': isCustom }" @tap="enableCustom">
          <text class="bc-chip-t" :class="{ 'is-active': isCustom }">自定义</text>
        </view>
      </view>
      <view v-if="isCustom" class="bc-custom">
        <input v-model="customAmount" type="number" class="bc-custom-input" placeholder="请输入金币数量（10-10000）" placeholder-class="bc-ph" />
        <text class="bc-custom-unit">金币</text>
      </view>
      <view v-if="errors.amount" class="bc-err"><app-icon name="alert-circle" :size="24" color="#C41E3A" /><text class="bc-err-t">{{ errors.amount }}</text></view>
      <text class="bc-bounty-note">悬赏越高，达人抢答越积极。</text>
    </view>

    <!-- 分类 -->
    <view class="bc-bounty-card">
      <view class="bc-bounty-head"><text class="bc-bounty-t">分类</text></view>
      <view class="bc-cats">
        <view
          v-for="cat in categoryOptions" :key="cat.key"
          class="bc-cat" :class="{ 'is-active': category === cat.key }"
          @tap="category = cat.key"
        >
          <text class="bc-cat-t" :class="{ 'is-active': category === cat.key }">{{ cat.label }}</text>
        </view>
      </view>
    </view>

    <!-- 悬赏规则：扣费前完整披露（按后端真实规则） -->
    <view class="bc-rules">
      <text class="bc-rules-t">悬赏规则</text>
      <view class="bc-rule"><view class="bc-rule-dot" /><text class="bc-rule-txt">悬赏金币发布时托管，你采纳回答后全额支付给答主</text></view>
      <view class="bc-rule"><view class="bc-rule-dot" /><text class="bc-rule-txt">悬赏自发布起 48 小时有效，到期未获解答自动全额退回</text></view>
      <view class="bc-rule"><view class="bc-rule-dot" /><text class="bc-rule-txt">答主抢答后须在悬赏有效期内作答，超时自动重新开放</text></view>
      <view class="bc-rule"><view class="bc-rule-dot" /><text class="bc-rule-txt">未有回答前可随时撤销悬赏，金币原路退回钱包</text></view>
      <view class="bc-rule"><view class="bc-rule-dot" /><text class="bc-rule-txt">悬赏问答公开可见，回答计入答主应答数据</text></view>
    </view>

    <!-- 吸底提交：金额与余额再次明示 -->
    <view class="bc-submit-bar">
      <text class="bc-balance"><template v-if="balance !== null">当前余额 <text class="bc-balance-b">{{ balance }} 金币</text> · </template>发布即托管 {{ finalAmount }} 金币</text>
      <view class="bc-submit-btn" @tap="handleSubmit"><text class="bc-submit-t">托管 {{ finalAmount }} 金币并发布悬赏</text></view>
    </view>

    <!-- 确认弹层 -->
    <view v-if="showPayConfirm" class="bc-overlay" @tap="showPayConfirm = false">
      <view class="bc-sheet" @tap.stop>
        <view class="bc-sheet-handle" />
        <text class="bc-sheet-title">确认托管并发布</text>
        <text class="bc-sheet-sub">发布后悬赏金币由平台托管，采纳回答后支付给答主</text>
        <view class="bc-sheet-summary">
          <view class="bc-sheet-line"><text class="bc-sheet-l">悬赏标题</text><text class="bc-sheet-v">{{ title }}</text></view>
          <view class="bc-sheet-line"><text class="bc-sheet-l">分类</text><text class="bc-sheet-v">{{ categoryLabel }}</text></view>
          <view class="bc-sheet-line total"><text class="bc-sheet-total-l">悬赏金额</text><text class="bc-sheet-total-v">{{ finalAmount }} 金币</text></view>
        </view>
        <view class="bc-sheet-pay" :class="{ 'is-disabled': submitting }" @tap="confirmPay">
          <text class="bc-sheet-pay-t">{{ submitting ? '处理中…' : `确认托管 ${finalAmount} 金币` }}</text>
        </view>
        <view class="bc-sheet-cancel" @tap="showPayConfirm = false"><text class="bc-sheet-cancel-t">再想想</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bc-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 280rpx; }

/* 顶栏 */
.bc-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #ede7dd);
}
.bc-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.bc-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

/* 方式切换 */
.bc-seg { display: flex; margin: 28rpx 32rpx 0; padding: 6rpx; background: var(--bg-warm, #f8f4ec); border-radius: 24rpx; }
.bc-seg-btn { flex: 1; height: 68rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
.bc-seg-btn.is-active { background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.bc-seg-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.bc-seg-t.is-active { color: var(--text-primary, #2c2c2c); font-weight: 600; }
.bc-hint { display: block; margin: 16rpx 36rpx 0; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.6; }

/* 表单卡 */
.bc-card {
  margin: 24rpx 32rpx 0; padding: 32rpx 36rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.bc-field.bordered { margin-top: 28rpx; padding-top: 28rpx; border-top: 1rpx solid var(--separator, #ede7dd); }
.bc-field-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12rpx; }
.bc-field-label { display: block; font-size: 24rpx; color: var(--text-tertiary, #999); margin-bottom: 8rpx; }
.bc-count { font-size: 22rpx; color: var(--text-tertiary, #999); flex-shrink: 0; }
.bc-input-title { width: 100%; box-sizing: border-box; background: transparent; font-size: 30rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); line-height: 1.5; }
.bc-input-body { width: 100%; box-sizing: border-box; background: transparent; font-size: 28rpx; color: var(--text-primary, #2c2c2c); line-height: 1.8; min-height: 160rpx; }
.bc-ph { color: var(--text-tertiary, #999); }
.bc-err { display: flex; align-items: center; gap: 8rpx; margin-top: 12rpx; }
.bc-err-t { font-size: 22rpx; color: var(--brand, #c41e3a); }
.bc-attach-row { display: flex; gap: 20rpx; margin-top: 8rpx; flex-wrap: wrap; }
.bc-attach-item { position: relative; width: 128rpx; height: 128rpx; }
.bc-attach-img { width: 128rpx; height: 128rpx; border-radius: 20rpx; }
.bc-attach-remove { position: absolute; top: -14rpx; right: -14rpx; background: #fff; border-radius: 999rpx; }
.bc-attach-add {
  width: 128rpx; height: 128rpx; border-radius: 20rpx;
  border: 1rpx dashed var(--separator, #ede7dd);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx;
}
.bc-attach-add-t { font-size: 20rpx; color: var(--text-tertiary, #999); }

/* 悬赏金额卡 */
.bc-bounty-card {
  margin: 24rpx 32rpx 0; padding: 32rpx 36rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.bc-bounty-head { display: flex; align-items: center; justify-content: space-between; }
.bc-bounty-t { font-size: 28rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.bc-bounty-amount { font-size: 44rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.bc-bounty-unit { font-size: 24rpx; font-weight: 500; color: var(--text-tertiary, #999); }
.bc-chips { display: flex; gap: 16rpx; margin-top: 24rpx; }
.bc-chip {
  flex: 1; height: 68rpx; border-radius: 34rpx;
  border: 1rpx solid var(--separator, #ede7dd);
  display: flex; align-items: center; justify-content: center;
}
.bc-chip.is-active { border-color: var(--gold, #c9a96e); background: rgba(201, 169, 110, 0.08); }
.bc-chip-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.bc-chip-t.is-active { color: var(--gold, #c9a96e); font-weight: 600; }
.bc-custom {
  margin-top: 20rpx; display: flex; align-items: center;
  background: var(--bg-warm, #f8f4ec); border-radius: 20rpx; padding: 20rpx 28rpx;
}
.bc-custom-input { flex: 1; font-size: 28rpx; color: var(--text-primary, #2c2c2c); background: transparent; }
.bc-custom-unit { font-size: 26rpx; color: var(--text-tertiary, #999); margin-left: 16rpx; }
.bc-bounty-note { display: block; margin-top: 20rpx; font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.6; }

/* 分类 */
.bc-cats { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.bc-cat { padding: 12rpx 28rpx; border-radius: 34rpx; border: 1rpx solid var(--separator, #ede7dd); }
.bc-cat.is-active { border-color: var(--brand, #c41e3a); background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.bc-cat-t { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }
.bc-cat-t.is-active { color: var(--brand, #c41e3a); font-weight: 600; }

/* 规则卡 */
.bc-rules { margin: 24rpx 32rpx 0; padding: 28rpx 32rpx; background: var(--bg-warm, #f8f4ec); border-radius: 28rpx; }
.bc-rules-t { display: block; font-size: 24rpx; font-weight: 600; color: var(--text-secondary, #6e6e73); margin-bottom: 16rpx; }
.bc-rule { display: flex; align-items: flex-start; gap: 14rpx; padding: 6rpx 0; }
.bc-rule-dot { width: 8rpx; height: 8rpx; border-radius: 999rpx; background: var(--gold, #c9a96e); margin-top: 16rpx; flex-shrink: 0; }
.bc-rule-txt { flex: 1; font-size: 24rpx; color: var(--text-tertiary, #999); line-height: 1.8; }

/* 吸底提交 */
.bc-submit-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 20rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #ede7dd);
}
.bc-balance { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); text-align: center; margin-bottom: 16rpx; }
.bc-balance-b { color: var(--gold, #c9a96e); font-weight: 600; }
.bc-submit-btn { height: 92rpx; border-radius: 46rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.bc-submit-btn:active { opacity: 0.88; }
.bc-submit-t { font-size: 30rpx; font-weight: 600; letter-spacing: 1rpx; color: #fff; }

/* 确认弹层 */
.bc-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(44, 44, 44, 0.4); display: flex; flex-direction: column; justify-content: flex-end; }
.bc-sheet {
  background: var(--bg-page, #faf8f5); border-radius: 44rpx 44rpx 0 0;
  padding: 20rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
}
.bc-sheet-handle { width: 72rpx; height: 8rpx; border-radius: 4rpx; background: var(--separator, #ede7dd); margin: 0 auto 28rpx; }
.bc-sheet-title { display: block; text-align: center; font-size: 34rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.bc-sheet-sub { display: block; text-align: center; font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 12rpx; }
.bc-sheet-summary {
  margin-top: 28rpx; padding: 28rpx 32rpx;
  background: var(--bg-card, #fff); border-radius: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
  display: flex; flex-direction: column; gap: 20rpx;
}
.bc-sheet-line { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; }
.bc-sheet-line.total { border-top: 1rpx solid var(--separator, #ede7dd); padding-top: 20rpx; }
.bc-sheet-l { font-size: 24rpx; color: var(--text-tertiary, #999); flex-shrink: 0; }
.bc-sheet-v { font-size: 24rpx; color: var(--text-primary, #2c2c2c); font-weight: 500; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-sheet-total-l { font-size: 26rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.bc-sheet-total-v { font-size: 36rpx; font-weight: 700; color: var(--gold, #c9a96e); }
.bc-sheet-pay { height: 92rpx; margin-top: 28rpx; border-radius: 46rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.bc-sheet-pay.is-disabled { opacity: 0.6; }
.bc-sheet-pay-t { font-size: 28rpx; font-weight: 600; color: #fff; }
.bc-sheet-cancel { height: 76rpx; margin-top: 12rpx; display: flex; align-items: center; justify-content: center; }
.bc-sheet-cancel-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
</style>
