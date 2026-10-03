<script setup lang="ts">
/**
 * 品牌落款设置（对应 V0 brand-settings.tsx）
 *
 * 落款是交付物的一部分：客户拿到的报告最后署的是老师的名号、盖的是老师的印。
 * 平台只是纸和笔，署名权归老师——这正是老师肯为会员付费的地方，所以它是会员权益。
 *
 * 非会员进来能看见表单长什么样（有预览、有引导），但不让填——后端 saveBrand 有闸门会返 403，
 * 前端这层只是别让老师白填一遍再被拒。价格/周期一律取后端 pro，不在前端写死。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ToolHeader from '@/components/paipan/tool-header.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import SectionTitle from '@/components/paipan/section-title.vue'
import { wsApi, type WorkspaceBrand } from '../lib/workspace-api'

interface ProInfo {
  isPro: boolean
  daysLeft: number
  price: number
  period: string
  expireAt: string | null
}

const PRO_URL = '/pkg-workspace/pro/index'

const loading = ref(true)
const failed = ref(false)
const saving = ref(false)
const pro = ref<ProInfo>({ isPro: false, daysLeft: 0, price: 0, period: '月', expireAt: null })

const form = ref<WorkspaceBrand>({
  brandName: '',
  title: '',
  avatarText: '',
  logoUrl: '',
  sealText: '',
  slogan: '',
  contact: '',
  disclaimer: '',
})

const isPro = computed(() => pro.value.isPro)
/** 印章空着也要有东西给老师看，不然预览是个空红块，看不出效果 */
const sealPreview = computed(() => form.value.sealText?.trim() || form.value.brandName?.trim().slice(0, 2) || '印')
const brandPreview = computed(() => form.value.brandName?.trim() || '（工作室名）')
const titlePreview = computed(() => form.value.title?.trim() || '（职称）')

async function load() {
  loading.value = true
  failed.value = false
  try {
    const res = await wsApi.profile()
    pro.value = { ...pro.value, ...(res?.pro ?? {}) }
    if (res?.brand) form.value = { ...form.value, ...res.brand }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goPro() {
  uni.navigateTo({ url: PRO_URL })
}

async function save() {
  // 非会员直接引导，不发请求——发了也是 403，白往返一趟
  if (!isPro.value) {
    goPro()
    return
  }
  if (!form.value.brandName.trim()) {
    uni.showToast({ title: '请填工作室名', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await wsApi.saveBrand({
      brandName: form.value.brandName.trim(),
      title: form.value.title.trim(),
      sealText: form.value.sealText.trim(),
      slogan: form.value.slogan.trim(),
      contact: form.value.contact.trim(),
      disclaimer: form.value.disclaimer.trim(),
    })
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e: any) {
    uni.showModal({
      title: '保存失败',
      content: e?.message || '保存失败',
      confirmText: '去开通',
      cancelText: '知道了',
      success: (r) => {
        if (r.confirm) goPro()
      },
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="bd-page">
    <ToolHeader title="品牌落款" subtitle="报告上署你的名号" back-href="/pkg-workspace/index/index" />

    <view class="bd">
      <!-- 会员闸门提示 -->
      <view v-if="!loading && !isPro" class="bd-upsell" @tap="goPro">
        <AppIcon name="crown" :size="16" color="#B8860B" />
        <text class="bd-upsell-txt">
          品牌落款是从业者会员专属：报告上署你的名号与印章。开通 ¥{{ pro.price }}/{{ pro.period }}
        </text>
        <AppIcon name="chevron-right" :size="14" color="#B8860B" />
      </view>

      <view v-if="loading" class="bd-skeleton" />

      <template v-else>
        <!-- 落款实时预览 -->
        <SectionTitle title="落款预览" subtitle="客户在报告末页看到的样子" />
        <PaperCard gold padding="lg">
          <view class="bd-preview">
            <text class="bd-preview-slogan">{{ form.slogan?.trim() || '（一句话署名语）' }}</text>

            <view class="bd-preview-sign">
              <view class="bd-preview-texts">
                <text class="bd-preview-brand">{{ brandPreview }}</text>
                <text class="bd-preview-title">{{ titlePreview }}</text>
              </view>
              <view class="bd-seal">
                <text class="bd-seal-txt">{{ sealPreview }}</text>
              </view>
            </view>

            <view class="bd-preview-line" />
            <text class="bd-preview-contact">{{ form.contact?.trim() || '（页脚联系方式）' }}</text>
            <text class="bd-preview-disclaimer">
              {{ form.disclaimer?.trim() || '未填写时，报告使用平台默认免责声明。' }}
            </text>
          </view>
        </PaperCard>

        <!-- 表单 -->
        <SectionTitle title="落款信息" :subtitle="isPro ? '改完记得保存' : '开通后可编辑'" />
        <PaperCard padding="lg">
          <text class="bd-label">工作室名</text>
          <input
            v-model="form.brandName"
            class="bd-input"
            :class="{ 'bd-input--off': !isPro }"
            :disabled="!isPro"
            placeholder="如：明理堂"
            placeholder-class="bd-ph"
          />

          <text class="bd-label">职称</text>
          <input
            v-model="form.title"
            class="bd-input"
            :class="{ 'bd-input--off': !isPro }"
            :disabled="!isPro"
            placeholder="如：命理师 / 堪舆师"
            placeholder-class="bd-ph"
          />

          <text class="bd-label">印章字（建议 2-4 字）</text>
          <input
            v-model="form.sealText"
            class="bd-input"
            :class="{ 'bd-input--off': !isPro }"
            :disabled="!isPro"
            placeholder="如：明理堂印"
            placeholder-class="bd-ph"
          />

          <text class="bd-label">一句话署名语</text>
          <input
            v-model="form.slogan"
            class="bd-input"
            :class="{ 'bd-input--off': !isPro }"
            :disabled="!isPro"
            placeholder="如：以理断命，不妄语"
            placeholder-class="bd-ph"
          />

          <text class="bd-label">报告页脚联系方式</text>
          <input
            v-model="form.contact"
            class="bd-input"
            :class="{ 'bd-input--off': !isPro }"
            :disabled="!isPro"
            placeholder="如：微信 mingli-tang"
            placeholder-class="bd-ph"
          />

          <text class="bd-label">免责声明（留空则用平台默认）</text>
          <textarea
            v-model="form.disclaimer"
            class="bd-textarea"
            :class="{ 'bd-input--off': !isPro }"
            :disabled="!isPro"
            placeholder="如：本报告为传统文化咨询意见，不构成医疗、投资、法律建议。"
            placeholder-class="bd-ph"
            :maxlength="-1"
          />

          <view class="bd-tip">
            <AppIcon name="info" :size="14" color="#9A8C7E" />
            <text class="bd-tip-txt">落款只出现在报告的交付页与只读分享链接里，不影响你在平台内的昵称。</text>
          </view>
        </PaperCard>

        <view class="bd-btn" :class="{ 'bd-btn--off': !isPro }" @tap="save">
          <AppIcon :name="isPro ? 'save' : 'crown'" :size="16" color="#fff" />
          <text class="bd-btn-txt">
            {{ isPro ? (saving ? '保存中…' : '保存落款') : `开通会员 ¥${pro.price}/${pro.period}` }}
          </text>
        </view>
      </template>

      <view v-if="failed" class="bd-failed" @tap="load">
        <text class="bd-failed-txt">加载失败，点击重试</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.bd-page {
  min-height: 100vh;
  background: #F7F3EC;
}

.bd {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

/* 会员提示条 */
.bd-upsell {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 20rpx;
  border: 1rpx solid rgba(184, 134, 11, 0.35);
  border-radius: 16rpx;
  background: rgba(184, 134, 11, 0.08);
}

.bd-upsell-txt {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.5;
  color: #8A6914;
}

/* 预览：宣纸底 + 朱印 */
.bd-preview {
  padding: 24rpx;
  border-radius: 12rpx;
  background: #FDFAF4;
}

.bd-preview-slogan {
  display: block;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 26rpx;
  line-height: 1.6;
  color: #7A6C5E;
}

.bd-preview-sign {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  margin-top: 24rpx;
}

.bd-preview-texts {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.bd-preview-brand {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.bd-preview-title {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9A8C7E;
}

.bd-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  flex-shrink: 0;
  padding: 8rpx;
  border-radius: 12rpx;
  background: #C41E3A;
}

.bd-seal-txt {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
  text-align: center;
}

.bd-preview-line {
  height: 1rpx;
  margin: 24rpx 0 16rpx;
  background: rgba(58, 42, 30, 0.1);
}

.bd-preview-contact {
  display: block;
  font-size: 22rpx;
  color: #7A6C5E;
}

.bd-preview-disclaimer {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 1.6;
  color: #B8AA9A;
}

/* 表单 */
.bd-label {
  display: block;
  margin: 24rpx 0 12rpx;
  font-size: 22rpx;
  color: #9A8C7E;

  &:first-child {
    margin-top: 0;
  }
}

.bd-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
  color: #3A2A1E;
}

.bd-textarea {
  width: 100%;
  height: 180rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid rgba(58, 42, 30, 0.14);
  border-radius: 12rpx;
  background: #fff;
  box-sizing: border-box;
  font-size: 26rpx;
  line-height: 1.6;
  color: #3A2A1E;
}

/* 非会员：看得见但填不了 */
.bd-input--off {
  background: rgba(154, 140, 126, 0.08);
  color: #B8AA9A;
}

.bd-ph {
  color: #C4B8A8;
}

.bd-tip {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 24rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: rgba(154, 140, 126, 0.08);
}

.bd-tip-txt {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.6;
  color: #7A6C5E;
}

.bd-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  height: 88rpx;
  border-radius: 12rpx;
  background: #C41E3A;
}

.bd-btn--off {
  background: #B8860B;
}

.bd-btn-txt {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.bd-skeleton {
  height: 400rpx;
  border-radius: 16rpx;
  background: rgba(154, 140, 126, 0.1);
}

.bd-failed {
  padding: 24rpx;
  text-align: center;
}

.bd-failed-txt {
  font-size: 24rpx;
  color: #C41E3A;
}
</style>
