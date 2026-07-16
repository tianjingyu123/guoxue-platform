<template>
  <view class="a14-page">
    <scroll-view scroll-y class="a14-scroll">
      <!-- 朱红渐变品牌头（自定义 navbar） -->
      <view class="a14-brand" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="a14-brand-top">
          <view class="a14-brand-btn" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#fff" /></view>
          <view class="a14-brand-title">
            <text class="a14-brand-h1">邀请好友同台</text>
            <text class="a14-brand-en">INVITE &amp; SHARE HONOR</text>
          </view>
          <view class="a14-brand-btn" @tap="showRules = true"><app-icon name="file-text" :size="18" color="#fff" /></view>
        </view>
      </view>

      <view class="a14-body">
        <!-- Hero slogan -->
        <view class="a14-hero">
          <view class="a14-hero-seal" />
          <text class="a14-hero-big">邀友参赛</text>
          <text class="a14-hero-big red">他获奖 · 你也有奖</text>
          <text class="a14-hero-p">把好友请上国学竞技场，一起争荣誉。TA 获得实物奖励时，你作为荐才人同享一份对应奖励。</text>
        </view>

        <!-- 我的专属邀请 -->
        <view class="a14-blk-h">
          <view class="a14-blk-ln" />
          <text class="a14-blk-t">我的专属邀请</text>
        </view>
        <view class="a14-invcard">
          <!-- 二维码：真实渲染邀请链接 -->
          <view class="a14-qr">
            <canvas canvas-id="a14InviteQr" class="a14-qr-canvas" :style="{ width: qrSize + 'px', height: qrSize + 'px' }" />
            <view v-if="!inviterId" class="a14-qr-empty">
              <app-icon name="qr-code" :size="40" color="#d8cfc0" />
              <text class="a14-qr-empty-t">登录后生成</text>
            </view>
          </view>

          <text class="a14-invcode-label">我的专属邀请标识</text>
          <text class="a14-invcode">{{ inviteTag }}</text>

          <!-- 邀请链接 -->
          <view class="a14-linkrow">
            <text class="a14-link">{{ inviteLink }}</text>
            <view class="a14-cp2" @tap="copyLink"><text class="a14-cp2-t">复制链接</text></view>
          </view>

          <!-- 分享操作 -->
          <view class="a14-share-row">
            <view class="a14-sbtn a14-sbtn-primary" @tap="goPoster">
              <app-icon name="image" :size="16" color="#fff" />
              <text class="a14-sbtn-t primary">分享海报</text>
            </view>
            <view class="a14-sbtn a14-sbtn-gold" @tap="copyLink">
              <app-icon name="share-2" :size="16" color="#a5883f" />
              <text class="a14-sbtn-t gold">复制邀请</text>
            </view>
          </view>

          <text class="a14-tip">邀请关系一次性绑定、永久留痕、系统自动记录，全程无人工。仅一层：不追溯 TA 再邀请的人。</text>
        </view>

        <!-- 奖励怎么拿 -->
        <view class="a14-blk-h">
          <view class="a14-blk-ln" />
          <text class="a14-blk-t">奖励怎么拿</text>
        </view>
        <view class="a14-rrule">
          <view class="a14-step">
            <view class="a14-num">1</view>
            <view class="a14-step-body">
              <text class="a14-step-h">基础邀请奖励</text>
              <text class="a14-step-p">被邀请人「完成首次报名 / 答题」，你即得基础奖励（荣誉值 / 参赛券）。</text>
            </view>
          </view>
          <view class="a14-step">
            <view class="a14-num">2</view>
            <view class="a14-step-body">
              <text class="a14-step-h">连带奖励 · 一人得奖 荐者同荣</text>
              <text class="a14-step-p">被邀请人获<text class="a14-hl">实物奖励</text>时，你自动获得<text class="a14-hl">对应一份连带奖励</text>。挂钩真实赛事荣誉，非消费返利，仅一层。</text>
            </view>
          </view>

          <!-- 连带奖励映射 -->
          <view class="a14-irmap">
            <view v-for="(m, i) in rewardMap" :key="i" class="a14-irc">
              <text class="a14-irc-h">{{ m.head }}</text>
              <text class="a14-irc-arrow">↓ 同荣</text>
              <text class="a14-irc-v">{{ m.value }}</text>
            </view>
          </view>
        </view>

        <!-- 进入 A15 我的邀请奖励 -->
        <view class="a14-entry" @tap="goRecords">
          <view class="a14-entry-info">
            <text class="a14-entry-t">我的邀请奖励</text>
            <text class="a14-entry-sub">看已邀请的人 + 我的奖励发放状态</text>
          </view>
          <app-icon name="chevron-right" :size="20" color="#C41E3A" />
        </view>

        <!-- 规则细则入口 -->
        <view class="a14-rules-entry" @tap="showRules = true">
          <app-icon name="shield-check" :size="15" color="#a5883f" />
          <text class="a14-rules-entry-t">查看邀请奖励规则细则（合规 · 一级 · 挂钩真实获奖）</text>
        </view>

        <view class="a14-safe" />
      </view>
    </scroll-view>

    <!-- 规则细则弹层 -->
    <view v-if="showRules" class="a14-mask" @tap="showRules = false">
      <view class="a14-sheet" @tap.stop>
        <view class="a14-sheet-head">
          <text class="a14-sheet-title">邀请奖励规则</text>
          <view class="a14-sheet-close" @tap="showRules = false"><app-icon name="x" :size="18" color="#999" /></view>
        </view>
        <scroll-view scroll-y class="a14-sheet-body">
          <view class="a14-blk-h">
            <view class="a14-blk-ln" />
            <text class="a14-blk-t">规则细则</text>
            <text class="a14-blk-gd">公开透明</text>
          </view>
          <view class="a14-terms">
            <view v-for="(t, i) in terms" :key="i" class="a14-term">
              <view class="a14-term-dot" />
              <text class="a14-term-t"><text class="a14-term-b">{{ t.b }}</text>：{{ t.text }}</text>
            </view>
          </view>
          <view class="a14-redline">
            <text class="a14-redline-t">合规红线（R1）：仅一级、挂钩真实获奖实物、协议明示；绝不做多级分销 / 团队计酬。奖励一律为「荐才同荣」荣誉叙事。</text>
          </view>
          <view class="a14-sheet-safe" />
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import { onLoad, onReady } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { getUserInfo } from '@/utils/storage'
import { drawQrToCanvas } from '@/utils/qrcode'

const instance = getCurrentInstance()?.proxy

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const showRules = ref(false)
const qrSize = ref(132)

// 携带 compId（可选）：从某场赛事详情进入邀请页时透传，链接落到该赛事；否则落赛事首页
const compId = ref('')
onLoad((q) => { compId.value = (q?.id as string) || (q?.compId as string) || '' })

// ── 诚实降级：后端无「我的邀请码」GET 端点（仅 register 支持 inviterId/inviteCode）──
// 用 getUserInfo().id 作 inviterId，拼赛事 H5 邀请链接；不编造邀请码字符串。
const inviterId = computed(() => {
  const u = getUserInfo<{ id?: string | number }>()
  return u?.id != null ? String(u.id) : ''
})

// 邀请标识：优先展示昵称，其次用 userId 派生的短码（不暴露完整 UUID）
const inviteTag = computed(() => {
  if (!inviterId.value) return '登录后可分享'
  const nick = getUserInfo<{ nickname?: string }>()?.nickname
  if (nick && nick.trim()) return `邀请人 · ${nick.trim()}`
  // 无昵称降级：取 id 去连字符后前 6 位大写作短码，避免整串 UUID 外露
  const short = inviterId.value.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `邀请码 · ${short}`
})

// 邀请链接：落赛事页并携带 inviterId，被邀请人报名时经 register(inviterId) 一次性绑定（仅一级）
const inviteLink = computed(() => {
  if (!inviterId.value) return '登录后生成专属邀请链接'
  const base = 'https://rebugx.cn/h5/#/pkg-competition/home/index'
  const q = `inviterId=${inviterId.value}${compId.value ? `&compId=${compId.value}` : ''}`
  return `${base}?${q}`
})

// 连带奖励映射（合规叙事·挂钩真实赛事名次，非拉人头计酬）
const rewardMap = [
  { head: 'TA 得冠军', value: '荐者得\n最高档连带奖' },
  { head: 'TA 晋级 / 优胜', value: '荐者得\n中档连带奖' },
  { head: 'TA 参与荣誉', value: '荐者得\n荣誉值 / 积分' },
]

// 规则细则（合规 R1·文案严禁拉人赚钱/多级/团队计酬）
const terms = [
  { b: '仅奖励一级', text: '只奖励直接邀请人（你 → TA），不向上追溯多级、不做团队计酬。' },
  { b: '挂钩真实获奖', text: '只有被邀请人真实获奖、平台发放实物时才触发连带奖励，不按邀请人头数计酬。' },
  { b: '对应 / 等值', text: '连带奖励与被邀请人所获实物对应或等值，具体对应关系由赛事奖品配置定义。' },
  { b: '发放公示', text: '所有邀请奖励发放状态在「我的邀请奖励」页公开可查，防暗箱。' },
  { b: '诚信前提', text: '邀请关系需真实有效，恶意刷邀请 / 虚假账号取消奖励资格。' },
]

// 二维码渲染（真实绘制邀请链接·登录后才画）
onReady(() => { setTimeout(renderQr, 60) })
function renderQr() {
  if (!inviterId.value) return
  try {
    const ctx = uni.createCanvasContext('a14InviteQr', instance)
    // 内边距 8·二维码本体尺寸 = 画布 - 边距×2
    const pad = 8
    const inner = qrSize.value - pad * 2
    const ok = drawQrToCanvas(ctx, inviteLink.value, pad, pad, inner, {
      foreground: '#c41e3a',
      background: '#faf6ef',
      padding: 0,
      radius: 0,
    })
    if (ok) ctx.draw()
  } catch {}
}

// 复制邀请链接（真实可用）
function copyLink() {
  if (!inviterId.value) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
  uni.setClipboardData({
    data: inviteLink.value,
    success: () => uni.showToast({ title: '邀请链接已复制', icon: 'none' }),
  })
}

// 生成海报（跳 A11 poster·携带 inviterId；有 compId 则落该赛事，否则通用邀请海报）
function goPoster() {
  if (!inviterId.value) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
  navigateTo(`/pkg-competition/poster/index?id=${compId.value || ''}&inviterId=${inviterId.value}`)
}

// 我的邀请奖励（A15·赛事版邀请奖励页）
function goRecords() {
  navigateTo('/pkg-competition/invite-rewards/index')
}
</script>

<style lang="scss" scoped>
/* ── A14 邀请机制说明 · 设计 token ──
   宣纸白 #FAF8F5 / 卡片白 #FFF / 朱红 #C41E3A / 金 #C9A96E
   文 #2C2C2C / #6E6E73 / #999 · 圆角 18px · 页边距 20px · 大标题宋体 */
.a14-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.a14-scroll { flex: 1; height: 0; min-height: 0; }

/* 朱红品牌头 */
.a14-brand { background: linear-gradient(135deg, #C41E3A, #a01830); padding-bottom: 18px; position: relative; }
.a14-brand::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: linear-gradient(90deg, transparent, #C9A96E, transparent); }
.a14-brand-top { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px 0; }
.a14-brand-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; }
.a14-brand-title { flex: 1; display: flex; flex-direction: column; align-items: center; }
.a14-brand-h1 { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: 1px; font-family: 'Songti SC', 'STSong', serif; }
.a14-brand-en { font-size: 9px; letter-spacing: 3px; color: rgba(255, 255, 255, 0.55); margin-top: 2px; }

.a14-body { padding: 16px 20px 40px; }

/* Hero slogan */
.a14-hero { position: relative; overflow: hidden; background: linear-gradient(160deg, #fff, #fdf6ef); border: 1px solid #efe4d3; border-radius: 20px; padding: 24px 18px; text-align: center; box-shadow: 0 6px 20px rgba(160, 120, 60, 0.08); }
.a14-hero-seal { position: absolute; right: -14px; top: -14px; width: 78px; height: 78px; border-radius: 50%; background: radial-gradient(circle, #f6e0e2, transparent 70%); }
.a14-hero-big { display: block; font-size: 23px; font-weight: 800; line-height: 1.45; color: #2C2C2C; font-family: 'Songti SC', 'STSong', serif; position: relative; }
.a14-hero-big.red { color: #C41E3A; }
.a14-hero-p { display: block; font-size: 12.5px; color: #6E6E73; line-height: 1.85; margin-top: 10px; position: relative; }

/* 区块标题 */
.a14-blk-h { display: flex; align-items: center; gap: 7px; margin: 22px 0 11px; }
.a14-blk-ln { width: 3px; height: 14px; background: #C41E3A; border-radius: 2px; }
.a14-blk-t { font-size: 14px; font-weight: 700; color: #2C2C2C; }
.a14-blk-gd { margin-left: auto; font-size: 11px; color: #a5883f; }

/* 邀请卡 */
.a14-invcard { background: #fff; border: 1px solid #efe4d3; border-radius: 20px; padding: 22px 18px; text-align: center; box-shadow: 0 6px 20px rgba(160, 120, 60, 0.08); }
.a14-qr { width: 148px; height: 148px; margin: 0 auto 14px; border-radius: 16px; background: #faf6ef; border: 2px solid #ecdcbb; display: flex; align-items: center; justify-content: center; position: relative; }
.a14-qr-canvas { display: block; }
.a14-qr-empty { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: #faf6ef; border-radius: 14px; }
.a14-qr-empty-t { font-size: 11px; color: #b0a89c; }

.a14-invcode-label { display: block; font-size: 12px; color: #999; }
.a14-invcode { display: block; font-size: 20px; color: #C41E3A; font-weight: 800; letter-spacing: 1px; margin-top: 5px; }

.a14-linkrow { display: flex; gap: 8px; margin-top: 14px; }
.a14-link { flex: 1; min-width: 0; background: #FAF8F5; border: 1px solid #ece4d6; border-radius: 11px; padding: 11px 13px; font-size: 12px; color: #a59b8c; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.a14-cp2 { flex-shrink: 0; background: #faf3e6; border: 1px solid #ecdcbb; border-radius: 11px; padding: 11px 15px; display: flex; align-items: center; }
.a14-cp2-t { font-size: 12px; font-weight: 700; color: #a5883f; }

.a14-share-row { display: flex; gap: 11px; margin-top: 16px; }
.a14-sbtn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 14px; border-radius: 999px; }
.a14-sbtn-primary { background: linear-gradient(135deg, #C41E3A, #a01830); box-shadow: 0 6px 16px rgba(196, 30, 58, 0.28); }
.a14-sbtn-gold { background: #f1e9d8; border: 1px solid #e3d5b0; }
.a14-sbtn-t { font-size: 14px; font-weight: 700; }
.a14-sbtn-t.primary { color: #fff; }
.a14-sbtn-t.gold { color: #a5883f; }

.a14-tip { display: block; font-size: 11px; color: #a59b8c; line-height: 1.7; margin-top: 12px; background: #faf6ef; border-radius: 10px; padding: 9px 11px; text-align: left; }

/* 奖励规则 */
.a14-rrule { background: linear-gradient(160deg, #fdf8ef, #faf3e6); border: 1px solid #ecdcbb; border-radius: 18px; padding: 18px 16px; }
.a14-step { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
.a14-num { width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, #d4b876, #a5883f); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; box-shadow: 0 3px 8px rgba(165, 136, 63, 0.3); }
.a14-step-body { flex: 1; min-width: 0; }
.a14-step-h { display: block; font-size: 13.5px; font-weight: 700; color: #8a6d2f; }
.a14-step-p { display: block; font-size: 12px; color: #6E6E73; line-height: 1.7; margin-top: 3px; }
.a14-hl { color: #C41E3A; font-weight: 700; }

.a14-irmap { display: flex; gap: 9px; margin-top: 6px; }
.a14-irc { flex: 1; background: #fff; border: 1px solid #efe4d3; border-radius: 14px; padding: 12px 6px; display: flex; flex-direction: column; align-items: center; }
.a14-irc-h { font-size: 10px; color: #999; }
.a14-irc-arrow { font-size: 11px; font-weight: 700; color: #C9A96E; margin: 6px 0; }
.a14-irc-v { font-size: 11px; font-weight: 700; color: #a5883f; line-height: 1.5; text-align: center; white-space: pre-line; }

/* 进入 A15 入口 */
.a14-entry { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #efe4d3; border-radius: 16px; padding: 16px 18px; margin-top: 18px; box-shadow: 0 4px 14px rgba(160, 120, 60, 0.06); }
.a14-entry-info { flex: 1; min-width: 0; }
.a14-entry-t { display: block; font-size: 14px; font-weight: 700; color: #2C2C2C; }
.a14-entry-sub { display: block; font-size: 11px; color: #a59b8c; margin-top: 3px; }

/* 规则细则入口 */
.a14-rules-entry { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 16px; padding: 10px; }
.a14-rules-entry-t { font-size: 12px; color: #a5883f; }

.a14-safe { height: 24px; }

/* 规则弹层 */
.a14-mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: flex-end; z-index: 100; }
.a14-sheet { width: 100%; max-height: 78vh; background: #FAF8F5; border-radius: 20px 20px 0 0; display: flex; flex-direction: column; }
.a14-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; }
.a14-sheet-title { font-size: 17px; font-weight: 800; color: #2C2C2C; font-family: 'Songti SC', 'STSong', serif; }
.a14-sheet-close { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
.a14-sheet-body { flex: 1; height: 0; min-height: 0; padding: 0 20px; }

.a14-terms { background: #fff; border: 1px solid #efe4d3; border-radius: 18px; padding: 18px; }
.a14-term { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.a14-term:last-child { margin-bottom: 0; }
.a14-term-dot { width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; background: #C41E3A; margin-top: 7px; }
.a14-term-t { flex: 1; min-width: 0; font-size: 12.5px; color: #5a5a5f; line-height: 1.85; }
.a14-term-b { color: #8a6d2f; font-weight: 700; }

.a14-redline { background: #fdf2f3; border: 1px solid #f0c8ce; border-radius: 12px; padding: 13px 15px; margin-top: 16px; }
.a14-redline-t { font-size: 11.5px; color: #a01830; line-height: 1.8; }

.a14-sheet-safe { height: calc(20px + env(safe-area-inset-bottom)); }
</style>
