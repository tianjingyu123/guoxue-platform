<script setup lang="ts">
/**
 * 角色申请页 · 六角色（M1/M2 身份切换区「申请加入」落地页）
 *
 * 🔴 2026-07-14 重做（董事长拍板：退役统一报名表，各走各的真流程）：
 *   原设计是「六角色共用一张通用报名表」，但 submit() 是 setTimeout + toast，
 *   **用户填的表原地蒸发、后台什么都收不到** —— 员工申请完达人/讲师/商家，双向黑洞。
 *   根因是这个设计与业务对不上：六个角色的真实路径本就不同 ——
 *     · 讲师/商家：要资质审核（后端有 提交→查状态→admin审批 完整闭环）
 *     · 站长/运营商：付费开通（付款即激活，压根没有审批态）
 *     · 研究院：入会 + 保证金
 *     · 线下驿站：直接建站待审（POST /offline/stations）
 *   强行统一成一张表反而错。故本页改为「角色介绍 + 分派到各自真流程」：
 *     五个角色 → 跳各自真页（零后端改动，全走已验证的真链路）
 *     线下驿站 → 唯一保留表单的角色（后端建站 DTO 本身就是一张申请表），真提交。
 *   全页零假提交。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { offlineManageApi } from '@/lib/offline-data'

/* —— 角色配置表（六角色，数据驱动 hero/权益/条件/字段） —— */
interface FieldSpec {
  key: string
  label: string
  required: boolean
  placeholder: string
  type?: 'text' | 'phone' | 'city' | 'textarea'
}
interface RoleApplyConfig {
  seal: string
  name: string
  tagline: string        // 定位句
  gains: { icon: string; title: string; sub: string }[]
  conds: string[]
  /** 表单字段：仅「线下驿站」有（唯一在本页真提交的角色）。其余角色走 target 分派，不在此填表 */
  fields: FieldSpec[]
  agreement: string      // 协议名
  /** 分派目标：该角色的真实入驻流程页。设了 target 就不显示表单，按钮改为「前往」 */
  target?: string
  /** 分派按钮文案 + 去向说明（如实告知下一步是什么，避免"点了不知道去哪") */
  cta?: string
  targetNote?: string
}

const ROLE_CONFIGS: Record<string, RoleApplyConfig> = {
  teacher: {
    seal: '讲', name: '讲师', tagline: '把你的学问变成课程，触达百万学友',
    gains: [
      { icon: 'graduation-cap', title: '开课授业', sub: '发布课程与专栏，平台流量扶持' },
      { icon: 'coins', title: '课程收益分成', sub: '学员付费收益按约定比例结算' },
      { icon: 'shield', title: '官方认证讲师', sub: '认证徽章全站可见，建立专业信任' },
    ],
    conds: ['需先完成实名认证', '在相关领域有专业积累或作品', '提交后 3 个工作日内完成资质审核'],
    fields: [],
    agreement: '《讲师合作协议》',
    target: '/pkg-creator/teacher-certification/index',
    cta: '前往讲师认证',
    targetNote: '填写真实姓名、职称与资历证明，提交后由平台审核',
  },
  merchant: {
    seal: '商', name: '商家', tagline: '开店卖国学好物，平台代运营帮你卖',
    gains: [
      { icon: 'store', title: '开设店铺', sub: '上架国学好物，触达精准人群' },
      { icon: 'coins', title: '订单收益结算', sub: '交易货款按周期结算到钱包' },
      { icon: 'award', title: '平台代运营', sub: '官方营销位与分销渠道扶持' },
    ],
    conds: ['需有营业执照等合法经营资质', '提交后 3 个工作日内完成商家审核'],
    fields: [],
    agreement: '《商家入驻协议》',
    target: '/pkg-merchant/join/index',
    cta: '前往商家入驻',
    targetNote: '已申请过会直接进入审核状态页；未申请则填写主体信息与资质证照',
  },
  station_owner: {
    seal: '站', name: '分站站长', tagline: '承包一城国学生态，做你城市的文化主理人',
    gains: [
      { icon: 'landmark', title: '分站经营收益', sub: '城市分站内交易与推广收益归属站长' },
      { icon: 'user-plus', title: '专属运营支持', sub: '总部一对一运营指导与素材库' },
      { icon: 'award', title: '官方授权认证', sub: '平台授牌，站长身份全站可见' },
    ],
    conds: ['认同国学文化，有本地资源或社群运营经验优先', '分站为付费开通（年费制），开通后即刻生效'],
    fields: [],
    agreement: '《站长合作协议》',
    target: '/pkg-operator/join-station/index',
    cta: '前往开通分站',
    targetNote: '分站为付费开通，付款成功后账号即刻激活（非审核制）',
  },
  operator: {
    seal: '运', name: '运营商', tagline: '区域推广合伙，多级分润共建生态',
    gains: [
      { icon: 'landmark', title: '区域推广分润', sub: '所辖区域交易多级分润' },
      { icon: 'user-plus', title: '团队管理权限', sub: '发展并管理站长团队' },
      { icon: 'award', title: '官方合伙授权', sub: '区域运营商官方授牌' },
    ],
    conds: ['具备团队组建与区域拓展能力', '运营商为付费加盟（分档位），开通后即刻生效'],
    fields: [],
    agreement: '《运营商合作协议》',
    target: '/pkg-operator/join-operator/index',
    cta: '前往加盟运营商',
    targetNote: '运营商为付费加盟，可选档位；付款成功后账号即刻激活（非审核制）',
  },
  offline_station: {
    seal: '驿', name: '线下驿站', tagline: '门店挂牌，线上线下互导客流',
    gains: [
      { icon: 'store', title: '门店挂牌授权', sub: '官方驿站授牌，共享品牌' },
      { icon: 'landmark', title: '线上线下互导', sub: '线上引流到店，到店转化线上' },
      { icon: 'coins', title: '到店服务收益', sub: '线下课程与活动收益归属驿站' },
    ],
    conds: ['拥有可挂牌的线下门店或活动空间', '提交后由平台审核，通过后开通驿站后台'],
    /* 六角色里唯一在本页真提交的：后端 POST /offline/stations 的 DTO 本身就是一张申请表。
     * 字段严格对齐 CreateStationDto（name/city/address/phone 四项后端全必填）——
     * 注意 name 是「驿站名称」不是申请人姓名，故不复用 COMMON_FIELDS。 */
    fields: [
      { key: 'name', label: '驿站名称', required: true, placeholder: '如：明德书院·杭州西湖驿站', type: 'text' },
      { key: 'city', label: '所在城市', required: true, placeholder: '如：杭州', type: 'text' },
      { key: 'address', label: '详细地址', required: true, placeholder: '请填写门店详细地址', type: 'textarea' },
      { key: 'phone', label: '联系电话', required: true, placeholder: '请填写常用联系电话', type: 'phone' },
    ],
    agreement: '《线下驿站合作协议》',
  },
  institute: {
    seal: '研', name: '研究院', tagline: '学术共建，内容首发权益',
    gains: [
      { icon: 'scroll-text', title: '内容首发权益', sub: '优质学术内容平台优先推广' },
      { icon: 'graduation-cap', title: '学术共建席位', sub: '参与课程与典籍内容共建' },
      { icon: 'award', title: '权威机构认证', sub: '研究院身份官方背书' },
    ],
    conds: ['需通过入会门槛自检', '入会缴纳保证金，完成年度任务可全额退还'],
    fields: [],
    agreement: '《研究院共建协议》',
    target: '/pkg-institute/member-apply/index',
    cta: '前往加入研究院',
    targetNote: '含门槛自检与席位选择；完成年度任务可全额退还会费',
  },
}

const roleKey = ref('teacher')
const config = computed<RoleApplyConfig>(() => ROLE_CONFIGS[roleKey.value] || ROLE_CONFIGS.teacher)

// 状态栏高度（自定义顶栏占位）
const statusBarHeight = ref(20)

// 表单值
const form = ref<Record<string, string>>({})
const agreed = ref(false)
const submitting = ref(false)

/** 分派型角色（五个）：不在本页填表，跳各自真流程 */
const isDispatch = computed(() => !!config.value.target)

// 必填校验（仅表单型=线下驿站）。分派型只需同意协议
const canSubmit = computed(() => {
  if (!agreed.value) return false
  if (isDispatch.value) return true
  return config.value.fields.every((f) => !f.required || (form.value[f.key] || '').trim().length > 0)
})

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync()
    if (sys?.statusBarHeight) statusBarHeight.value = sys.statusBarHeight
  } catch { /* 降级默认 20 */ }
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1] as unknown as { options?: Record<string, string> }
  const role = cur?.options?.role
  if (role && ROLE_CONFIGS[role]) roleKey.value = role
  // 初始化表单
  const init: Record<string, string> = {}
  for (const f of config.value.fields) init[f.key] = ''
  form.value = init
})

function goBack() { navigateBack() }

async function submit() {
  if (!canSubmit.value || submitting.value) {
    if (!agreed.value) uni.showToast({ title: '请先阅读并同意协议', icon: 'none' })
    else uni.showToast({ title: '请完整填写必填项', icon: 'none' })
    return
  }

  // 分派型（讲师/商家/站长/运营商/研究院）：跳各自的真实入驻流程
  if (config.value.target) {
    navigateTo(config.value.target)
    return
  }

  // 表单型（线下驿站）：真提交 POST /offline/stations，落库为待审核驿站
  submitting.value = true
  try {
    await offlineManageApi.createStation({
      name: (form.value.name || '').trim(),
      city: (form.value.city || '').trim(),
      address: (form.value.address || '').trim(),
      phone: (form.value.phone || '').trim(),
    })
    uni.showToast({ title: '申请已提交，平台审核后开通', icon: 'success', duration: 2200 })
    setTimeout(() => navigateBack(), 1600)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="tbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tbar-inner">
        <view class="tbar-back" @tap="goBack"><AppIcon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="tbar-title">申请成为{{ config.name }}</text>
        <view class="tbar-back" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- 头图 + 角色定位 -->
      <view class="hero">
        <view class="hero-bg" />
        <view class="hero-shade" />
        <view class="hero-txt">
          <view class="hero-seal"><text class="hero-seal-txt">{{ config.seal }}</text></view>
          <view class="hero-info">
            <text class="hero-h1">{{ config.name }}</text>
            <text class="hero-p">{{ config.tagline }}</text>
          </view>
        </view>
      </view>

      <!-- 你将获得 -->
      <text class="sec-h">你将获得</text>
      <view class="gains">
        <view v-for="(g, i) in config.gains" :key="i" class="gain">
          <view class="gain-icon"><AppIcon :name="g.icon" :size="36" color="#B4884A" /></view>
          <view class="gain-txt">
            <text class="gain-b">{{ g.title }}</text>
            <text class="gain-s">{{ g.sub }}</text>
          </view>
        </view>
      </view>

      <!-- 申请条件 -->
      <text class="sec-h">申请条件</text>
      <view class="conds">
        <view v-for="(c, i) in config.conds" :key="i" class="cond">
          <text class="cond-i">{{ ['一', '二', '三', '四'][i] || (i + 1) }}</text>
          <text class="cond-t">{{ c }}</text>
        </view>
      </view>

      <!-- 分派型（讲师/商家/站长/运营商/研究院）：如实告知下一步去哪，不在此填表 -->
      <template v-if="isDispatch">
        <text class="sec-h">下一步</text>
        <view class="next">
          <view class="next-icon"><AppIcon name="arrow-right" :size="32" color="#B4884A" /></view>
          <text class="next-t">{{ config.targetNote }}</text>
        </view>
      </template>

      <!-- 表单型（仅线下驿站）：真提交建站申请 -->
      <template v-else>
        <text class="sec-h">报名表</text>
        <view class="form">
          <view v-for="f in config.fields" :key="f.key" class="field">
            <text class="field-label">{{ f.label }}<text v-if="f.required" class="req"> *</text></text>
            <textarea
              v-if="f.type === 'textarea'"
              class="inp inp-area"
              :placeholder="f.placeholder"
              placeholder-class="ph"
              v-model="form[f.key]"
              :maxlength="500"
            />
            <input
              v-else
              class="inp"
              :placeholder="f.placeholder"
              placeholder-class="ph"
              :type="f.type === 'phone' ? 'number' : 'text'"
              v-model="form[f.key]"
            />
          </view>
        </view>
      </template>

      <!-- 协议 -->
      <view class="agree" @tap="agreed = !agreed">
        <view class="agree-box" :class="{ checked: agreed }">
          <AppIcon v-if="agreed" name="check" :size="22" color="#fff" />
        </view>
        <text class="agree-txt">我已阅读并同意<text class="agree-link">{{ config.agreement }}</text>与<text class="agree-link">《隐私政策》</text></text>
      </view>

      <view class="scroll-pad" />
    </scroll-view>

    <!-- 吸底提交 -->
    <view class="submit-wrap">
      <view class="submit" :class="{ disabled: !canSubmit || submitting }" @tap="submit">
        <text class="submit-txt">{{ submitting ? '提交中…' : (config.cta || '提交申请') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF8F5; }

/* 下一步（分派型角色：如实说明去向） */
.next {
  margin: 0 32rpx; padding: 28rpx 32rpx;
  display: flex; align-items: center; gap: 20rpx;
  background: #FFFFFF; border-radius: 24rpx;
  border: 1rpx solid rgba(180, 136, 74, 0.28);
}
.next-icon {
  width: 64rpx; height: 64rpx; border-radius: 18rpx; flex-shrink: 0;
  background: rgba(180, 136, 74, 0.12);
  display: flex; align-items: center; justify-content: center;
}
.next-t { flex: 1; font-size: 26rpx; color: #6E6A63; line-height: 1.7; }

/* 顶栏 */
.tbar { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: #FFFFFF; }
.tbar-inner { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 16rpx; }
.tbar-back { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.tbar-title { font-size: 30rpx; font-weight: 500; color: #2B2620; }

.scroll { height: 100vh; box-sizing: border-box; }

/* 头图 */
.hero { position: relative; height: 320rpx; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #6B4A2B, #A97C48 55%, #C9A96E); }
.hero-shade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,15,10,.66), rgba(20,15,10,.05) 60%); }
.hero-txt { position: absolute; left: 32rpx; right: 32rpx; bottom: 28rpx; display: flex; align-items: center; gap: 24rpx; }
.hero-seal { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: rgba(180,140,70,.95); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hero-seal-txt { font-family: var(--font-serif); font-size: 36rpx; font-weight: 700; color: #fff; }
.hero-info { flex: 1; min-width: 0; }
.hero-h1 { display: block; font-family: var(--font-serif); font-size: 40rpx; font-weight: 900; color: #fff; text-shadow: 0 2rpx 8rpx rgba(20,15,10,.45); }
.hero-p { display: block; font-size: 24rpx; color: #F3E3C3; margin-top: 6rpx; text-shadow: 0 2rpx 6rpx rgba(20,15,10,.4); }

.sec-h { display: block; font-family: var(--font-serif); font-size: 30rpx; font-weight: 700; color: #2B2620; padding: 36rpx 32rpx 20rpx; }

/* 你将获得 */
.gains { margin: 0 32rpx; background: #fff; border-radius: 24rpx; padding: 8rpx 28rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.gain { display: flex; align-items: center; gap: 24rpx; padding: 26rpx 0; }
.gain + .gain { border-top: 2rpx solid #F5F1EA; }
.gain-icon { width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gain-txt { flex: 1; min-width: 0; }
.gain-b { display: block; font-size: 26rpx; font-weight: 500; color: #2B2620; }
.gain-s { display: block; font-size: 22rpx; color: #8A8578; margin-top: 4rpx; }

/* 申请条件 */
.conds { margin: 0 32rpx; background: #F6F1E7; border-radius: 24rpx; padding: 24rpx 28rpx; }
.cond { display: flex; gap: 16rpx; padding: 8rpx 0; }
.cond-i { font-family: var(--font-serif); font-size: 24rpx; color: #B4884A; font-weight: 700; flex-shrink: 0; }
.cond-t { flex: 1; font-size: 24rpx; color: #55503F; line-height: 1.7; }

/* 报名表 */
.form { margin: 0 32rpx; background: #fff; border-radius: 24rpx; padding: 32rpx 28rpx 36rpx; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.field { margin-bottom: 28rpx; }
.field:last-child { margin-bottom: 0; }
.field-label { display: block; font-size: 24rpx; font-weight: 500; color: #2B2620; margin-bottom: 14rpx; }
.req { color: #C41E3A; }
.inp { height: 88rpx; border: 2rpx solid #E5DFD2; border-radius: 16rpx; padding: 0 24rpx; font-size: 26rpx; color: #2B2620; background: #fff; box-sizing: border-box; }
.inp-area { height: 176rpx; padding: 20rpx 24rpx; width: 100%; line-height: 1.6; }
.ph { color: #B0A99A; font-size: 26rpx; }

/* 协议 */
.agree { display: flex; align-items: center; gap: 14rpx; margin: 28rpx 32rpx 0; }
.agree-box { width: 32rpx; height: 32rpx; border: 3rpx solid #C5BFB2; border-radius: 8rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.agree-box.checked { background: #C41E3A; border-color: #C41E3A; }
.agree-txt { font-size: 22rpx; color: #8A8578; line-height: 1.5; }
.agree-link { color: #8A6420; }

.scroll-pad { height: 180rpx; }

/* 吸底提交 */
.submit-wrap { position: fixed; left: 0; right: 0; bottom: 0; padding: 20rpx 32rpx 28rpx; background: linear-gradient(to top, #FAF8F5 70%, rgba(250,248,245,0)); z-index: 20; }
.submit { height: 96rpx; border-radius: 48rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(196,30,58,.28); }
.submit.disabled { background: #D8D2C6; box-shadow: none; }
.submit-txt { font-size: 30rpx; font-weight: 500; color: #fff; }
</style>
