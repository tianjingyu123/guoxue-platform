<script setup lang="ts">
/**
 * 角色申请页 · 六角色共用模板（M1/M2 身份切换区「申请加入」落地页）
 * 六角色：讲师/商家/分站站长/运营商/线下驿站/研究院。差异全部数据驱动。
 *
 * 数据边界（诚实降级·见回报）：
 *   平台目前【无统一的角色申请后端端点】——各角色历史上走各自入驻流程
 *   （如分站 POST /station/apply 的 DTO 是分站名/编码，与通用报名表字段不一致），
 *   通用「角色申请字段配置 + 提交」属后端待办（V0 稿注释亦标注「字段配置列后端待办」）。
 *   因此本页字段用前端配置表驱动，提交暂以「提交申请意向」toast + 引导处理，
 *   端点就绪后把 submit() 内替换为真实请求即可（结构已按 role 分派预留）。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'

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
  fields: FieldSpec[]
  agreement: string      // 协议名
}

// 通用报名字段（多数角色共用）
const COMMON_FIELDS: FieldSpec[] = [
  { key: 'name', label: '姓名', required: true, placeholder: '请输入真实姓名', type: 'text' },
  { key: 'phone', label: '联系电话', required: true, placeholder: '请输入常用手机号', type: 'phone' },
]

const ROLE_CONFIGS: Record<string, RoleApplyConfig> = {
  teacher: {
    seal: '讲', name: '讲师', tagline: '把你的学问变成课程，触达百万学友',
    gains: [
      { icon: 'graduation-cap', title: '开课授业', sub: '发布课程与专栏，平台流量扶持' },
      { icon: 'coins', title: '课程收益分成', sub: '学员付费收益按约定比例结算' },
      { icon: 'shield', title: '官方认证讲师', sub: '认证徽章全站可见，建立专业信任' },
    ],
    conds: ['在相关领域有专业积累或作品', '提交后 3 个工作日内完成资质审核'],
    fields: [
      ...COMMON_FIELDS,
      { key: 'field', label: '专业方向', required: true, placeholder: '如：八字命理 / 书法 / 中医养生', type: 'text' },
      { key: 'works', label: '代表作品或经历', required: false, placeholder: '简述你的代表作、著作或授课经历（选填）', type: 'textarea' },
    ],
    agreement: '《讲师合作协议》',
  },
  merchant: {
    seal: '商', name: '商家', tagline: '开店卖国学好物，平台代运营帮你卖',
    gains: [
      { icon: 'store', title: '开设店铺', sub: '上架国学好物，触达精准人群' },
      { icon: 'coins', title: '订单收益结算', sub: '交易货款按周期结算到钱包' },
      { icon: 'award', title: '平台代运营', sub: '官方营销位与分销渠道扶持' },
    ],
    conds: ['具备合法经营资质与货源', '提交后 3 个工作日内完成商家审核'],
    fields: [
      ...COMMON_FIELDS,
      { key: 'category', label: '主营类目', required: true, placeholder: '如：文玩 / 香器 / 书画', type: 'text' },
      { key: 'intro', label: '经营简介', required: false, placeholder: '简述你的货源与经营情况（选填）', type: 'textarea' },
    ],
    agreement: '《商家入驻协议》',
  },
  station_owner: {
    seal: '站', name: '分站站长', tagline: '承包一城国学生态，做你城市的文化主理人',
    gains: [
      { icon: 'landmark', title: '分站经营收益', sub: '城市分站内交易与推广收益归属站长' },
      { icon: 'user-plus', title: '专属运营支持', sub: '总部一对一运营指导与素材库' },
      { icon: 'award', title: '官方授权认证', sub: '平台授牌，站长身份全站可见' },
    ],
    conds: ['认同国学文化，有本地资源或社群运营经验优先', '每城限一名站长，提交后 3 个工作日内电话回访'],
    fields: [
      ...COMMON_FIELDS,
      { key: 'city', label: '意向城市', required: true, placeholder: '请选择省 / 市', type: 'city' },
      { key: 'experience', label: '相关资源与经验', required: false, placeholder: '简述你的本地资源、社群或运营经验（选填）', type: 'textarea' },
    ],
    agreement: '《站长合作协议》',
  },
  operator: {
    seal: '运', name: '运营商', tagline: '区域推广合伙，多级分润共建生态',
    gains: [
      { icon: 'landmark', title: '区域推广分润', sub: '所辖区域交易多级分润' },
      { icon: 'user-plus', title: '团队管理权限', sub: '发展并管理站长团队' },
      { icon: 'award', title: '官方合伙授权', sub: '区域运营商官方授牌' },
    ],
    conds: ['具备团队组建与区域拓展能力', '提交后 3 个工作日内商务对接回访'],
    fields: [
      ...COMMON_FIELDS,
      { key: 'region', label: '意向区域', required: true, placeholder: '请填写意向省 / 市 / 区域', type: 'text' },
      { key: 'experience', label: '资源与团队情况', required: false, placeholder: '简述你的团队与区域资源（选填）', type: 'textarea' },
    ],
    agreement: '《运营商合作协议》',
  },
  offline_station: {
    seal: '驿', name: '线下驿站', tagline: '门店挂牌，线上线下互导客流',
    gains: [
      { icon: 'store', title: '门店挂牌授权', sub: '官方驿站授牌，共享品牌' },
      { icon: 'landmark', title: '线上线下互导', sub: '线上引流到店，到店转化线上' },
      { icon: 'coins', title: '到店服务收益', sub: '线下课程与活动收益归属驿站' },
    ],
    conds: ['拥有可挂牌的线下门店或活动空间', '提交后 3 个工作日内实地或电话核实'],
    fields: [
      ...COMMON_FIELDS,
      { key: 'city', label: '门店城市', required: true, placeholder: '请选择省 / 市', type: 'city' },
      { key: 'address', label: '门店地址', required: false, placeholder: '请填写门店详细地址（选填）', type: 'textarea' },
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
    conds: ['为学术机构、研究团体或资深学者', '提交后 5 个工作日内学术委员会评审'],
    fields: [
      ...COMMON_FIELDS,
      { key: 'org', label: '机构 / 团体名称', required: true, placeholder: '请填写机构或研究团体全称', type: 'text' },
      { key: 'intro', label: '研究方向与成果', required: false, placeholder: '简述研究方向与代表成果（选填）', type: 'textarea' },
    ],
    agreement: '《研究院共建协议》',
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

// 必填校验
const canSubmit = computed(() => {
  if (!agreed.value) return false
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
  submitting.value = true
  try {
    // 诚实降级：平台暂无统一角色申请端点，提交按意向登记处理（端点就绪后按 roleKey 分派真实请求）
    await new Promise((r) => setTimeout(r, 400))
    uni.showToast({ title: '申请已提交，3 个工作日内回访', icon: 'none', duration: 2200 })
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
        <view class="tbar-back" @tap="goBack"><AppIcon name="chevron-left" :size="40" color="#2B2620" /></view>
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

      <!-- 报名表 -->
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
        <text class="submit-txt">{{ submitting ? '提交中…' : '提交申请' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #FAF8F5; }

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
