<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
      </view>
      <text class="nav-title">{{ content.title }}</text>
      <view class="nav-share" @tap="onShare">
        <app-icon name="share-2" :size="20" color="#888" />
      </view>
    </view>

    <scroll-view scroll-y class="content" :style="{ height: scrollHeight + 'px' }">
      <view class="main" :class="{ 'has-action': content.hasAction }">
        <!-- 类型标签和更新时间 -->
        <view class="meta">
          <view class="type-badge" :class="'type-' + content.type">
            <text class="type-badge-text">{{ typeLabels[content.type] }}</text>
          </view>
          <text v-if="content.updatedAt" class="update-time">更新于 {{ content.updatedAt }}</text>
        </view>

        <!-- 富文本内容 -->
        <view class="article">
          <block v-for="(item, index) in content.content" :key="index">
            <text v-if="item.type === 'heading' && item.level === 2" class="h2">{{ item.text }}</text>
            <text v-else-if="item.type === 'heading'" class="h3">{{ item.text }}</text>
            <text v-else-if="item.type === 'paragraph'" class="paragraph">{{ item.text }}</text>
            <view v-else-if="item.type === 'list'" class="list">
              <view v-for="(li, i) in item.items" :key="i" class="list-item">
                <view class="list-dot" />
                <text class="list-text">{{ li }}</text>
              </view>
            </view>
            <view v-else-if="item.type === 'quote'" class="quote">
              <text class="quote-text">{{ item.text }}</text>
            </view>
            <view v-else-if="item.type === 'image'" class="image-block">
              <view class="image-ph">
                <app-icon name="image" :size="28" color="#bbb" />
              </view>
              <text v-if="item.caption" class="image-caption">{{ item.caption }}</text>
            </view>
            <view v-else-if="item.type === 'divider'" class="divider" />
          </block>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="content.hasAction" class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="action-btn" :class="{ agreed }" @tap="onAction">
        <app-icon v-if="agreed" name="check" :size="16" color="#fff" />
        <text class="action-btn-text">{{ agreed ? '已同意，点击返回' : content.actionText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack } from '@/utils/router'
import { BRAND } from '@/lib/brand'

interface ContentBlock {
  type: 'heading' | 'paragraph' | 'image' | 'list' | 'quote' | 'divider'
  level?: number
  text?: string
  items?: string[]
  caption?: string
}
interface ContentData {
  title: string
  type: 'notice' | 'agreement' | 'rule' | 'guide'
  updatedAt: string
  hasAction?: boolean
  actionText?: string
  content: ContentBlock[]
}

const statusBarHeight = ref(20)
const safeBottom = ref(0)
const scrollHeight = ref(600)
const agreed = ref(false)

const typeLabels: Record<string, string> = {
  notice: '公告',
  agreement: '协议',
  rule: '规则',
  guide: '指南',
}

const contentData: Record<string, ContentData> = {
  'user-agreement': {
    title: '用户协议',
    type: 'agreement',
    updatedAt: '2026-01-01',
    hasAction: true,
    actionText: '我已阅读并同意',
    content: [
      { type: 'heading', level: 2, text: '一、总则' },
      { type: 'paragraph', text: `欢迎您使用「${BRAND.platformName}」平台服务。本协议是您与${BRAND.platformName}平台之间关于使用平台服务所订立的协议。请您仔细阅读本协议的全部内容。` },
      { type: 'paragraph', text: '如果您不同意本协议的任意内容，请您立即停止使用本平台服务。当您注册成功或以其他方式开始使用本平台服务时，即视为您已充分阅读、理解并同意接受本协议的全部内容。' },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '二、服务内容' },
      { type: 'paragraph', text: `${BRAND.platformName}平台为用户提供以下服务：` },
      { type: 'list', items: [
        '排盘工具：提供八字、紫微斗数、风水等专业排盘服务',
        '知识社区：圈子、文章、短视频等内容服务',
        '在线课程：视频课程、直播课程等教育服务',
        '电商服务：书籍、文创、饰品等商品销售',
        '智能体服务：AI辅助分析和问答服务',
      ] },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '三、用户注册与账号管理' },
      { type: 'paragraph', text: '用户在注册时应提供真实、准确、完整的个人资料，并在资料发生变更时及时更新。用户应妥善保管账号和密码，因用户保管不善造成的损失由用户自行承担。' },
      { type: 'quote', text: '特别提示：一个手机号仅可注册一个账号，账号一经注册不可转让或赠与他人使用。' },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '四、用户行为规范' },
      { type: 'paragraph', text: '用户在使用本平台服务时，应遵守国家法律法规，不得利用本平台从事违法违规活动。' },
      { type: 'list', items: [
        '不得发布违反国家法律法规的内容',
        '不得发布虚假、欺诈性内容',
        '不得侵犯他人知识产权',
        '不得进行人身攻击或骚扰他人',
        '不得从事任何可能损害平台利益的行为',
      ] },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '五、知识产权' },
      { type: 'paragraph', text: `平台上所有内容（包括但不限于文字、图片、音频、视频、软件等）的知识产权归${BRAND.platformName}平台或相关权利人所有。未经授权，任何人不得擅自使用。` },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '六、免责声明' },
      { type: 'paragraph', text: '本平台提供的命理分析、风水建议等内容仅供参考，不构成任何专业建议。用户应理性看待相关内容，自行承担使用风险。' },
      { type: 'quote', text: '重要提示：国学命理仅供娱乐参考，请勿过度迷信。重大人生决策请结合实际情况谨慎考虑。' },
    ],
  },
  'privacy-policy': {
    title: '隐私政策',
    type: 'agreement',
    updatedAt: '2026-01-01',
    hasAction: true,
    actionText: '我已阅读并同意',
    content: [
      { type: 'heading', level: 2, text: '引言' },
      { type: 'paragraph', text: `${BRAND.platformName}平台非常重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。` },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '一、信息收集' },
      { type: 'paragraph', text: '我们可能收集以下类型的信息：' },
      { type: 'list', items: [
        '注册信息：手机号、昵称、头像等',
        '身份信息：实名认证时的姓名、身份证号',
        '设备信息：设备型号、操作系统、唯一设备标识符',
        '位置信息：仅在您授权时收集',
        '使用记录：浏览、搜索、购买等行为数据',
      ] },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '二、信息使用' },
      { type: 'paragraph', text: '我们使用收集的信息用于：' },
      { type: 'list', items: [
        '提供、维护和改进我们的服务',
        '个性化内容推荐',
        '安全保障和风险控制',
        '客户服务和沟通',
      ] },
      { type: 'divider' },
      { type: 'heading', level: 2, text: '三、信息安全' },
      { type: 'paragraph', text: '我们采用业界标准的安全技术和程序来保护您的个人信息，包括数据加密、访问控制、安全审计等措施。' },
    ],
  },
  'platform-notice': {
    title: '平台公告',
    type: 'notice',
    updatedAt: '2026-05-01',
    content: [
      { type: 'heading', level: 2, text: '关于平台服务升级的通知' },
      { type: 'paragraph', text: `尊敬的${BRAND.name}用户：` },
      { type: 'paragraph', text: '为提供更优质的服务体验，我们将于2026年5月15日进行系统升级维护。届时部分功能可能暂时无法使用，预计维护时间为4小时（00:00-04:00）。' },
      { type: 'image', caption: '升级内容示意图' },
      { type: 'heading', level: 3, text: '本次升级内容：' },
      { type: 'list', items: [
        '排盘工具性能优化，响应速度提升50%',
        '新增紫微斗数流年分析功能',
        '智能体对话能力升级，支持多轮深度问答',
        '修复已知问题，提升系统稳定性',
      ] },
      { type: 'paragraph', text: '感谢您的理解与支持！如有疑问，请联系客服。' },
      { type: 'quote', text: `${BRAND.name}运营团队\n2026年5月1日` },
    ],
  },
  'vip-rights': {
    title: '会员权益说明',
    type: 'guide',
    updatedAt: '2026-03-01',
    content: [
      { type: 'heading', level: 2, text: `${BRAND.name}VIP会员权益` },
      { type: 'paragraph', text: `成为${BRAND.name}VIP会员，解锁更多专属权益，开启国学学习之旅。` },
      { type: 'divider' },
      { type: 'heading', level: 3, text: '核心权益' },
      { type: 'list', items: [
        '排盘工具无限使用：八字、紫微、风水等全部排盘功能免费',
        '专属AI分析：每月赠送100次智能体深度分析',
        '课程折扣：全平台课程享8折优惠',
        '圈子特权：免费加入10个付费圈子',
        '专属客服：VIP专属客服通道，优先响应',
      ] },
      { type: 'divider' },
      { type: 'heading', level: 3, text: '会员等级' },
      { type: 'paragraph', text: '根据会员时长和消费金额，会员分为以下等级：' },
      { type: 'list', items: [
        '普通会员：基础会员权益',
        '黄金会员：额外享受课程7折优惠',
        '钻石会员：额外享受课程6折优惠，每月赠送200国学币',
        '至尊会员：最高权益，专属定制服务',
      ] },
      { type: 'image', caption: '会员等级权益对比' },
    ],
  },
}

const fallback: ContentData = {
  title: '内容不存在',
  type: 'notice',
  updatedAt: '',
  content: [{ type: 'paragraph', text: '抱歉，您访问的内容不存在或已被删除。' }],
}

const content = ref<ContentData>(fallback)

onLoad((options) => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
    safeBottom.value = (info.safeAreaInsets && info.safeAreaInsets.bottom) || 0
    scrollHeight.value = info.windowHeight - (statusBarHeight.value + 44)
  } catch (e) {
    // ignore
  }
  const slug = (options && (options.slug || options.id)) || ''
  content.value = contentData[slug] || fallback
})

function onShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}
function onAction() {
  if (!agreed.value) {
    agreed.value = true
  } else {
    goBack()
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1rpx solid #eee;
}
.nav-back,
.nav-share {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.content {
  flex: 1;
}
.main {
  padding: 24px 16px;
}
.main.has-action {
  padding-bottom: 96px;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
}
.type-notice {
  background: rgba(196, 30, 58, 0.1);
}
.type-notice .type-badge-text {
  color: var(--brand);
}
.type-agreement {
  background: rgba(59, 130, 246, 0.1);
}
.type-agreement .type-badge-text {
  color: #3b82f6;
}
.type-rule {
  background: rgba(249, 115, 22, 0.1);
}
.type-rule .type-badge-text {
  color: #f97316;
}
.type-guide {
  background: rgba(180, 138, 60, 0.12);
}
.type-guide .type-badge-text {
  color: #b48a3c;
}
.type-badge-text {
  font-size: 12px;
  font-weight: 500;
}
.update-time {
  font-size: 12px;
  color: #888;
}
.article {
  display: flex;
  flex-direction: column;
}
.h2 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 24px;
  margin-bottom: 12px;
}
.h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-top: 16px;
  margin-bottom: 8px;
}
.paragraph {
  font-size: 14px;
  color: #666;
  line-height: 1.7;
  margin-bottom: 12px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding-left: 4px;
}
.list-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.list-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  margin-top: 9px;
  flex-shrink: 0;
}
.list-text {
  flex: 1;
  font-size: 14px;
  color: #666;
  line-height: 1.7;
}
.quote {
  padding: 16px;
  background: rgba(0, 0, 0, 0.03);
  border-left: 4px solid #b48a3c;
  border-radius: 4px;
  margin-bottom: 16px;
}
.quote-text {
  font-size: 14px;
  color: #1a1a1a;
  line-height: 1.6;
  white-space: pre-line;
}
.image-block {
  margin-bottom: 16px;
}
.image-ph {
  width: 100%;
  height: 360rpx;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-caption {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}
.divider {
  height: 1rpx;
  background: #eee;
  margin: 16px 0;
}
.footer {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1rpx solid #eee;
}
.action-btn {
  width: 100%;
  height: 48px;
  background: var(--brand);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.action-btn.agreed {
  background: #22c55e;
}
.action-btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}
</style>
