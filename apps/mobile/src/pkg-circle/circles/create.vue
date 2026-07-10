<script setup lang="ts">
/**
 * 创建圈子 — V0 circle-create.html 还原（批⑥ 2026-07-10 重写视图层）
 * 结构：顶栏(预览) → 封面上传(16:7·真传COS) → 基本信息(名称/简介/类目) → 加入方式三选
 *       (免费直接/免费需审批/付费年费) → 协议 → 吸底(发布前预览+创建)。
 * 数据：POST /circles（CreateCircleDto：name/intro/cover/tags/type/price·价格单位元）；
 *       「免费需审批」= 创建 FREE 圈后 PUT /circles/:id { needApproval:true }（CreateDto 不收该字段）。
 * 降级（后端缺字段）：详情图(circle_detail_images)/圈主的话图文块(circle_intro) 不做；
 *       平台服务费比例为分佣配置驱动（CommissionConfig circle_join）非固定值 → 不写具体比例，
 *       仅写真实存在的退款规则（按已用天数扣减＋手续费，见 refund preview 口径）。
 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, reLaunch } from '@/utils/router'
import { uploadImage } from '@/utils/request'
import { circleApi } from '@/lib/circle-data'
import { circleManageApi } from '@/lib/circle-manage-data'

type JoinMode = 'free' | 'approval' | 'paid'

const JOIN_MODES: { value: JoinMode; title: string; desc: string }[] = [
  { value: 'free', title: '免费加入', desc: '任何人可直接加入，适合冷启动聚人气' },
  { value: 'approval', title: '审批加入', desc: '提交申请由你审核，适合控制成员质量' },
  { value: 'paid', title: '付费加入', desc: '按年收费，会员到期需续费；支持按规则退款' },
]

const CATEGORIES = ['八字命理', '紫微斗数', '奇门遁甲', '风水堪舆', '易经', '梅花易数', '面相手相', '国学文化', '其他']

const cover = ref('')
const coverUploading = ref(false)
const name = ref('')
const desc = ref('')
const category = ref('')
const joinMode = ref<JoinMode>('free')
const price = ref('')
const agreed = ref(true)
const submitting = ref(false)
const showPreview = ref(false)
const errors = reactive<Record<string, string>>({})

onLoad((q) => {
  // 搜索空结果「创建圈子」CTA 透传关键词预填名称
  if (q?.name) name.value = decodeURIComponent(String(q.name)).slice(0, 20)
})

/** 封面真上传（uploadImage → COS，禁止本地临时路径当 URL 提交） */
function chooseCover() {
  if (coverUploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const path = res.tempFilePaths[0]
      if (!path) return
      coverUploading.value = true
      uni.showLoading({ title: '上传中' })
      try {
        cover.value = await uploadImage(path)
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '封面上传失败', icon: 'none' })
      } finally {
        coverUploading.value = false
        uni.hideLoading()
      }
    },
  })
}

function selectCategory(cat: string) { category.value = cat; errors.category = '' }
function selectMode(v: JoinMode) { joinMode.value = v; errors.price = '' }

function validate(): boolean {
  const e: Record<string, string> = {}
  const n = name.value.trim()
  if (!n) e.name = '请输入圈子名称'
  else if (n.length < 2) e.name = '名称至少 2 个字'
  const d = desc.value.trim()
  if (!d) e.desc = '请输入一句话简介'
  else if (d.length < 10) e.desc = '简介至少 10 个字'
  if (!category.value) e.category = '请选择类目'
  if (joinMode.value === 'paid' && (!price.value || Number(price.value) <= 0)) e.price = '请设置年费价格'
  Object.keys(errors).forEach((k) => delete errors[k])
  Object.assign(errors, e)
  if (e.name || e.desc) uni.showToast({ title: e.name || e.desc, icon: 'none' })
  else if (e.category) uni.showToast({ title: e.category, icon: 'none' })
  else if (e.price) uni.showToast({ title: e.price, icon: 'none' })
  return Object.keys(e).length === 0
}

/** 发布前预览（本地态：按当前表单渲染一张圈子卡） */
function openPreview() {
  if (!name.value.trim() && !desc.value.trim()) {
    uni.showToast({ title: '先填写名称与简介再预览', icon: 'none' })
    return
  }
  showPreview.value = true
}

const modeLabel = computed(() => {
  if (joinMode.value === 'paid') return `¥${Number(price.value) || 0} / 年`
  return joinMode.value === 'approval' ? '需圈主审批' : '免费加入'
})

async function submit() {
  if (submitting.value) return
  if (!agreed.value) { uni.showToast({ title: '请先同意圈主服务协议', icon: 'none' }); return }
  if (!validate()) return
  submitting.value = true
  try {
    const created = await circleApi.create({
      name: name.value.trim(),
      intro: desc.value.trim(),
      tags: [category.value],
      type: joinMode.value === 'paid' ? 'YEARLY' : 'FREE',
      price: joinMode.value === 'paid' ? Number(price.value) : 0,
      cover: cover.value || undefined,
    })
    const newId = created?.id
    // 审批加入 = 免费圈 + needApproval（CreateDto 不收该字段，创建后 PUT 补开）
    if (joinMode.value === 'approval' && newId) {
      try {
        await circleManageApi.saveSettings(newId, { needApproval: true })
      } catch {
        uni.showToast({ title: '圈子已创建，审批开关未生效，可到管理后台开启', icon: 'none' })
      }
    }
    uni.showToast({ title: '创建成功', icon: 'success' })
    setTimeout(() => reLaunch(newId ? `/pkg-circle/circles/detail?id=${newId}` : '/pages/circles/index'), 600)
  } catch (err) {
    uni.showToast({ title: (err as Error)?.message || '创建失败，请重试', icon: 'none' })
    submitting.value = false
  }
}
</script>

<template>
  <view class="cc-page">
    <!-- 顶栏 -->
    <view class="cc-topbar">
      <view class="cc-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <text class="cc-topbar-title">创建圈子</text>
      <text class="cc-preview-link" @tap="openPreview">预览</text>
    </view>

    <!-- 封面：16:7 与详情页头图同比例 -->
    <view class="cc-cover" :class="{ filled: cover }" @tap="chooseCover">
      <image v-if="cover" :src="cover" class="cc-cover-img" mode="aspectFill" />
      <template v-else>
        <app-icon name="image" :size="52" color="#C9A96E" />
        <text class="cc-cover-t1">{{ coverUploading ? '上传中…' : '上传圈子封面' }}</text>
        <text class="cc-cover-t2">建议 16:7 · 与圈子详情页头图一致</text>
      </template>
      <view v-if="cover" class="cc-cover-retap"><text class="cc-cover-retap-t">更换</text></view>
    </view>

    <!-- 基本信息 -->
    <text class="cc-group-label">基本信息</text>
    <view class="cc-group">
      <view class="cc-form-row">
        <view class="cc-label-line">
          <text class="cc-label">圈子名称</text>
          <text class="cc-count">{{ name.length }}/20</text>
        </view>
        <input v-model="name" class="cc-input" :maxlength="20" placeholder="2-20 个字" placeholder-class="cc-ph" @input="errors.name = ''" />
        <text v-if="errors.name" class="cc-err">{{ errors.name }}</text>
      </view>
      <view class="cc-form-row">
        <view class="cc-label-line">
          <text class="cc-label">一句话简介</text>
          <text class="cc-count">{{ desc.length }}/50</text>
        </view>
        <textarea v-model="desc" class="cc-textarea" :maxlength="50" auto-height placeholder="这个圈是什么、适合谁（至少 10 个字）" placeholder-class="cc-ph" @input="errors.desc = ''" />
        <text v-if="errors.desc" class="cc-err">{{ errors.desc }}</text>
      </view>
      <view class="cc-form-row">
        <view class="cc-label-line"><text class="cc-label">类目 · 单选</text></view>
        <view class="cc-cat-chips">
          <view
            v-for="cat in CATEGORIES" :key="cat"
            class="cc-cat-chip" :class="{ on: category === cat }"
            @tap="selectCategory(cat)"
          >
            <text class="cc-cat-chip-t" :class="{ on: category === cat }">{{ cat }}</text>
          </view>
        </view>
        <text v-if="errors.category" class="cc-err">{{ errors.category }}</text>
      </view>
    </view>

    <!-- 加入方式 -->
    <text class="cc-group-label">加入方式 · 创建后可在管理后台修改</text>
    <view class="cc-group">
      <view v-for="m in JOIN_MODES" :key="m.value" class="cc-mode" @tap="selectMode(m.value)">
        <view class="cc-radio" :class="{ checked: joinMode === m.value }" />
        <view class="cc-mode-main">
          <text class="cc-mode-title">{{ m.title }}</text>
          <text class="cc-mode-desc">{{ m.desc }}</text>
        </view>
      </view>
      <template v-if="joinMode === 'paid'">
        <view class="cc-price-panel">
          <text class="cc-price-label">年费价格</text>
          <view class="cc-price-input-wrap">
            <text class="cc-price-cur">¥</text>
            <input v-model="price" type="digit" class="cc-price-input" placeholder="0" placeholder-class="cc-ph" @input="errors.price = ''" />
            <text class="cc-price-unit">/ 年</text>
          </view>
        </view>
        <text v-if="errors.price" class="cc-err cc-err-price">{{ errors.price }}</text>
        <text class="cc-price-note">成员按年付费加入，到期需续费；退款按「已用天数扣减＋手续费」规则执行，创建即视为同意。价格创建后可在管理后台修改，不影响已加入成员。</text>
      </template>
    </view>

    <!-- 协议 -->
    <view class="cc-agree" @tap="agreed = !agreed">
      <view class="cc-agree-cb" :class="{ on: agreed }">
        <app-icon v-if="agreed" name="check" :size="20" color="#ffffff" />
      </view>
      <text class="cc-agree-t">我已阅读并同意圈主服务协议与社区内容规范，承诺对圈内内容履行管理责任。</text>
    </view>

    <!-- 吸底：预览 + 创建 -->
    <view class="cc-submit-bar">
      <view class="cc-btn-preview" @tap="openPreview"><text class="cc-btn-preview-t">发布前预览</text></view>
      <view class="cc-btn-create" :class="{ disabled: submitting }" @tap="submit">
        <text class="cc-btn-create-t">{{ submitting ? '创建中…' : '创建圈子' }}</text>
      </view>
    </view>

    <!-- 发布前预览：本地态圈子卡 -->
    <view v-if="showPreview" class="cc-pv-mask" @tap="showPreview = false">
      <view class="cc-pv-card" @tap.stop>
        <view class="cc-pv-cover">
          <image v-if="cover" :src="cover" class="cc-pv-cover-img" mode="aspectFill" />
          <view v-else class="cc-pv-cover-ph"><app-icon name="image" :size="48" color="#C9A96E" /></view>
        </view>
        <view class="cc-pv-body">
          <view class="cc-pv-title-row">
            <text class="cc-pv-name">{{ name.trim() || '圈子名称' }}</text>
            <text v-if="category" class="cc-pv-cat">{{ category }}</text>
          </view>
          <text class="cc-pv-desc">{{ desc.trim() || '一句话简介' }}</text>
          <view class="cc-pv-meta-row">
            <text class="cc-pv-mode">{{ modeLabel }}</text>
            <text class="cc-pv-note">创建后即上架圈子广场</text>
          </view>
        </view>
        <view class="cc-pv-close" @tap="showPreview = false"><text class="cc-pv-close-t">继续编辑</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cc-page { min-height: 100vh; background: var(--bg-page, #FAF8F5); padding-bottom: 192rpx; }

/* 顶栏 */
.cc-topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-bottom: 1rpx solid var(--separator, #EDE7DD);
}
.cc-back { display: flex; }
.cc-topbar-title { font-size: 32rpx; font-weight: 600; color: var(--text-primary, #2C2C2C); }
.cc-preview-link { font-size: 28rpx; color: var(--brand, #C41E3A); font-weight: 500; }

/* 封面上传 */
.cc-cover {
  margin: 28rpx 32rpx 0; aspect-ratio: 16 / 7; border-radius: 36rpx;
  background: var(--bg-warm, #F8F4EC);
  border: 3rpx dashed #D4B87D;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx;
  overflow: hidden; position: relative;
}
.cc-cover.filled { border-style: solid; border-color: var(--separator, #EDE7DD); }
.cc-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.cc-cover-t1 { font-size: 28rpx; font-weight: 500; color: var(--text-secondary, #6E6E73); }
.cc-cover-t2 { font-size: 22rpx; color: var(--text-tertiary, #999); }
.cc-cover-retap {
  position: absolute; right: 16rpx; bottom: 16rpx;
  padding: 6rpx 20rpx; border-radius: 999rpx; background: rgba(44, 44, 44, 0.55);
}
.cc-cover-retap-t { font-size: 22rpx; color: #fff; }

/* 分组 */
.cc-group-label { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }
.cc-group {
  margin: 0 32rpx; background: var(--bg-card, #fff);
  border-radius: 36rpx; box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); overflow: hidden;
}

/* 表单行 */
.cc-form-row { padding: 28rpx 32rpx; }
.cc-form-row + .cc-form-row { border-top: 1rpx solid var(--separator, #EDE7DD); }
.cc-label-line { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.cc-label { font-size: 26rpx; font-weight: 500; color: var(--text-primary, #2C2C2C); }
.cc-count { font-size: 22rpx; color: var(--text-tertiary, #999); }
/* 显式高度：uni-app input 无固定高度真机会塌陷。加高（董事长 2026-07-11 真机反馈：编辑框过小文字显示不全） */
.cc-input { width: 100%; height: 80rpx; line-height: 80rpx; font-size: 30rpx; color: var(--text-primary, #2C2C2C); background: transparent; }
.cc-textarea { width: 100%; min-height: 160rpx; font-size: 28rpx; line-height: 1.7; color: var(--text-primary, #2C2C2C); background: transparent; }
.cc-ph { color: var(--text-tertiary, #999); }
.cc-err { display: block; margin-top: 10rpx; font-size: 22rpx; color: var(--brand, #C41E3A); }

/* 类目 chips */
.cc-cat-chips { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 4rpx 0; }
.cc-cat-chip {
  display: inline-flex; align-items: center; height: 60rpx; padding: 0 28rpx;
  border-radius: 30rpx; border: 1rpx solid var(--separator, #EDE7DD);
}
.cc-cat-chip.on { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); border-color: transparent; }
.cc-cat-chip-t { font-size: 26rpx; color: var(--text-secondary, #6E6E73); }
.cc-cat-chip-t.on { color: var(--brand, #C41E3A); font-weight: 500; }

/* 加入方式 */
.cc-mode { display: flex; align-items: flex-start; gap: 24rpx; padding: 28rpx 32rpx; }
.cc-mode + .cc-mode { border-top: 1rpx solid var(--separator, #EDE7DD); }
.cc-radio {
  width: 40rpx; height: 40rpx; border-radius: 999rpx; flex-shrink: 0; margin-top: 2rpx;
  border: 3rpx solid var(--separator, #EDE7DD); background: var(--bg-card, #fff); box-sizing: border-box;
}
.cc-radio.checked { border: 12rpx solid var(--brand, #C41E3A); }
.cc-mode-main { flex: 1; display: flex; flex-direction: column; }
.cc-mode-title { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2C2C2C); }
.cc-mode-desc { font-size: 24rpx; color: var(--text-tertiary, #999); margin-top: 4rpx; line-height: 1.6; }

/* 付费展开区 */
.cc-price-panel {
  margin: 0 32rpx 0 96rpx; padding: 24rpx 28rpx;
  background: var(--bg-warm, #F8F4EC); border-radius: 28rpx;
  display: flex; align-items: center; justify-content: space-between; gap: 20rpx;
}
.cc-price-label { font-size: 26rpx; color: var(--text-secondary, #6E6E73); }
.cc-price-input-wrap { display: flex; align-items: baseline; gap: 8rpx; }
.cc-price-cur { font-size: 26rpx; color: #C9A96E; font-weight: 600; }
.cc-price-input { width: 144rpx; height: 56rpx; line-height: 56rpx; text-align: right; font-size: 40rpx; font-weight: 700; color: #C9A96E; background: transparent; }
.cc-price-unit { font-size: 24rpx; color: var(--text-tertiary, #999); }
.cc-err-price { margin: 12rpx 32rpx 0 96rpx; }
.cc-price-note {
  display: block; margin: 12rpx 32rpx 0 96rpx; padding-bottom: 28rpx;
  font-size: 22rpx; color: var(--text-tertiary, #999); line-height: 1.6;
}

/* 协议 */
.cc-agree { margin: 28rpx 36rpx 0; display: flex; align-items: flex-start; gap: 16rpx; }
.cc-agree-cb {
  width: 32rpx; height: 32rpx; border-radius: 8rpx; flex-shrink: 0; margin-top: 4rpx;
  border: 2rpx solid var(--separator, #EDE7DD); background: var(--bg-card, #fff); box-sizing: border-box;
  display: flex; align-items: center; justify-content: center;
}
.cc-agree-cb.on { background: var(--brand, #C41E3A); border-color: var(--brand, #C41E3A); }
.cc-agree-t { flex: 1; font-size: 24rpx; color: var(--text-tertiary, #999); line-height: 1.7; }

/* 吸底提交 */
.cc-submit-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 24rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
  border-top: 1rpx solid var(--separator, #EDE7DD);
  display: flex; align-items: center; gap: 24rpx;
}
.cc-btn-preview {
  flex: 0 0 auto; height: 88rpx; padding: 0 40rpx;
  border: 1rpx solid var(--separator, #EDE7DD); border-radius: 44rpx;
  background: var(--bg-card, #fff);
  display: flex; align-items: center; justify-content: center;
}
.cc-btn-preview-t { font-size: 28rpx; font-weight: 500; color: var(--text-primary, #2C2C2C); }
.cc-btn-create {
  flex: 1; height: 88rpx; border-radius: 44rpx; background: var(--brand, #C41E3A);
  display: flex; align-items: center; justify-content: center;
}
.cc-btn-create.disabled { opacity: 0.5; }
.cc-btn-create-t { font-size: 30rpx; font-weight: 600; letter-spacing: 2rpx; color: #fff; }

/* 发布前预览弹层 */
.cc-pv-mask {
  position: fixed; inset: 0; z-index: 50; background: rgba(44, 44, 44, 0.55);
  display: flex; align-items: center; justify-content: center; padding: 0 56rpx;
}
.cc-pv-card {
  width: 100%; background: var(--bg-card, #fff); border-radius: 36rpx; overflow: hidden;
  box-shadow: 0 12rpx 48rpx rgba(44, 44, 44, 0.18);
}
.cc-pv-cover { width: 100%; aspect-ratio: 16 / 7; background: var(--bg-warm, #F8F4EC); }
.cc-pv-cover-img { width: 100%; height: 100%; }
.cc-pv-cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.cc-pv-body { padding: 28rpx 32rpx; }
.cc-pv-title-row { display: flex; align-items: center; gap: 16rpx; }
.cc-pv-name { font-size: 32rpx; font-weight: 700; color: var(--text-primary, #2C2C2C); }
.cc-pv-cat {
  padding: 2rpx 14rpx; border-radius: 10rpx; flex-shrink: 0;
  border: 1rpx solid #C9A96E; color: #C9A96E; font-size: 20rpx;
}
.cc-pv-desc { display: block; margin-top: 12rpx; font-size: 26rpx; color: var(--text-secondary, #6E6E73); line-height: 1.7; }
.cc-pv-meta-row { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; }
.cc-pv-mode { font-size: 26rpx; font-weight: 600; color: #C9A96E; }
.cc-pv-note { font-size: 22rpx; color: var(--text-tertiary, #999); }
.cc-pv-close { padding: 24rpx 0; border-top: 1rpx solid var(--separator, #EDE7DD); display: flex; justify-content: center; }
.cc-pv-close-t { font-size: 28rpx; font-weight: 500; color: var(--brand, #C41E3A); }
</style>
